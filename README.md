# embabel-worlds-playground

A local playground for [Embabel Worlds](https://worlds.embabel.com).

The appliance itself is installed by the official script into `~/embabel/worlds`. This repository is the place for realms, recipes, and experiments that point at that install.

## Install Worlds

Read the script first, then run it:

```bash
curl -fsSL https://worlds.embabel.com/install.sh
curl -fsSL https://worlds.embabel.com/install.sh | EMBABEL_MODE=worlds sh
```

That checks Docker, unpacks `embabel-worlds/appliance` into `~/embabel/worlds`, and hands off to `./worlds.py`. The console is `http://localhost:4343`. Setup asks for an account and your own Anthropic or OpenAI key. Nothing is installed globally.

Undo: `docker compose down -v` inside `~/embabel/worlds`, then delete that directory.
