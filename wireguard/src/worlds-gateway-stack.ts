import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export interface WorldsRoute {
  hostname: string;
  port: number;
}

export interface WorldsGatewayStackProps extends cdk.StackProps {
  /** WireGuard server private key, embedded in user data. */
  serverPrivateKey: string;
  /** Public key of the machine that runs Worlds. */
  clientPublicKey: string;
  /** VPN address of that machine. Nginx proxies to this address. */
  clientVpnIp?: string;
  /** Public hostname for the Worlds console (local port 11044). */
  consoleHostname: string;
  /** Public hostname for the API and MCP endpoint (local port 11043). */
  apiHostname?: string;
  hostedZoneId?: string;
  hostedZoneName?: string;
}

function nginxVhost(index: number, hostname: string, upstream: string, port: number): string {
  return `cat > /etc/nginx/conf.d/worlds-${index}.conf << 'NGINXEOF'
server {
    listen 80${index === 0 ? ' default_server' : ''};
    server_name ${hostname};

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://${upstream}:${port};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
    }
}
NGINXEOF`;
}

/**
 * A small public gateway in front of a Worlds appliance that stays on one machine.
 * Guests use HTTPS on the Elastic IP. Only this machine joins the tunnel.
 * Neo4j and Grafana are not routed.
 */
export class WorldsGatewayStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WorldsGatewayStackProps) {
    super(scope, id, props);

    const clientVpnIp = props.clientVpnIp ?? '10.10.0.2';
    const routes: WorldsRoute[] = [
      { hostname: props.consoleHostname, port: 11044 },
    ];
    if (props.apiHostname?.trim()) {
      routes.push({ hostname: props.apiHostname.trim(), port: 11043 });
    }

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: 'Public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
      ],
    });

    const securityGroup = new ec2.SecurityGroup(this, 'Sg', {
      vpc,
      description: 'Embabel Worlds gateway: HTTP, HTTPS, WireGuard',
      allowAllOutbound: true,
    });
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP and Certbot');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(51820), 'WireGuard');

    const wg0Conf = `[Interface]
Address = 10.10.0.1/24
ListenPort = 51820
PrivateKey = ${props.serverPrivateKey}

[Peer]
# Worlds host
PublicKey = ${props.clientPublicKey}
AllowedIPs = ${clientVpnIp}/32`;

    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      'yum update -y',
      'yum install -y nginx wireguard-tools',
      'pip3 install certbot certbot-nginx || yum install -y certbot python3-certbot-nginx || true',
      'systemctl enable nginx',
      'systemctl start nginx',
      ...routes.map((route, i) => nginxVhost(i, route.hostname, clientVpnIp, route.port)),
      'rm -f /etc/nginx/conf.d/default.conf',
      'nginx -t && systemctl reload nginx',
      'mkdir -p /var/www/html /etc/wireguard',
      'chmod 700 /etc/wireguard',
      `cat > /etc/wireguard/wg0.conf << 'WGEOF'\n${wg0Conf}\nWGEOF`,
      'chmod 600 /etc/wireguard/wg0.conf',
      'grep -q "^net.ipv4.ip_forward=1" /etc/sysctl.conf || echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf',
      'sysctl -p',
      'systemctl enable --now wg-quick@wg0',
    );

    const instance = new ec2.Instance(this, 'TunnelHost', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      userData,
      ssmSessionPermissions: true,
    });

    const eip = new ec2.CfnEIP(this, 'ElasticIP', {
      domain: 'vpc',
      instanceId: instance.instanceId,
    });

    if (props.hostedZoneId && props.hostedZoneName) {
      const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
        hostedZoneId: props.hostedZoneId,
        zoneName: props.hostedZoneName,
      });
      routes.forEach((route, index) => {
        new route53.ARecord(this, `DnsRecord${index}`, {
          zone,
          recordName: route.hostname,
          target: route53.RecordTarget.fromIpAddresses(eip.ref),
        });
      });
    }

    new cdk.CfnOutput(this, 'ElasticIPAddress', { value: eip.ref });
    new cdk.CfnOutput(this, 'InstanceId', { value: instance.instanceId });
    new cdk.CfnOutput(this, 'WireGuardEndpoint', { value: `${eip.ref}:51820` });
    new cdk.CfnOutput(this, 'ConsoleRoute', {
      value: `${props.consoleHostname} -> ${clientVpnIp}:11044`,
    });
    if (props.apiHostname?.trim()) {
      new cdk.CfnOutput(this, 'ApiRoute', {
        value: `${props.apiHostname.trim()} -> ${clientVpnIp}:11043`,
      });
    }
  }
}
