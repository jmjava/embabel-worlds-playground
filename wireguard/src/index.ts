#!/usr/bin/env node
import 'source-map-support/register';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import * as cdk from 'aws-cdk-lib';
import { WorldsGatewayStack } from './worlds-gateway-stack';

config();

function readKey(name: string): string {
  const filePath = path.join(__dirname, '..', 'keys', name);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Missing ${filePath}. Run ./scripts/generate-keys.sh before synth or deploy.`
    );
  }
  const value = fs.readFileSync(filePath, 'utf8').trim();
  if (!value) {
    throw new Error(`${filePath} is empty.`);
  }
  return value;
}

const consoleHostname = process.env.CONSOLE_HOSTNAME?.trim();
if (!consoleHostname) {
  throw new Error('Set CONSOLE_HOSTNAME in wireguard/.env (see .env.example).');
}

const app = new cdk.App();

new WorldsGatewayStack(app, 'EmbabelWorldsGateway', {
  env: process.env.CDK_DEFAULT_ACCOUNT
    ? {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
      }
    : undefined,
  description: 'WireGuard gateway in front of a local Embabel Worlds console',
  serverPrivateKey: readKey('server-private.key'),
  clientPublicKey: readKey('client-public.key'),
  consoleHostname,
  apiHostname: process.env.API_HOSTNAME?.trim() || undefined,
  hostedZoneId: process.env.HOSTED_ZONE_ID?.trim() || undefined,
  hostedZoneName: process.env.HOSTED_ZONE_NAME?.trim() || undefined,
});
