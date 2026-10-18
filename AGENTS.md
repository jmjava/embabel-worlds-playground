# Agent context — embabel-worlds-playground

## Cloud Environment and local parity

Cursor Cloud Agents use **`.cursor/environment.json`**. The **`install`** command runs during each Build; **`terminals`** start the demo when an agent session begins.

**Replicate the Cloud setup on your machine:**

```bash
git clone git@github.com:jmjava/embabel-worlds-playground.git
cd embabel-worlds-playground
bash .cursor/install.sh
bash scripts/verify-local.sh
```

Skip `apt-get` when deps are already installed:

```bash
PLAYGROUND_INSTALL_SKIP_SYSTEM_DEPS=1 bash .cursor/install.sh
```

Force Playwright Chromium (matches GitHub Actions when Google Chrome is not installed):

```bash
PLAYGROUND_INSTALL_CHROMIUM=1 bash .cursor/install.sh
CI=true npm test   # from cr-buying-planner/
```

### Toolchain (matches Cloud Agent / CI)

| Tool | Version / notes |
| --- | --- |
| Python | 3.10+ with `venv` (mock API on **8900**) |
| Node.js | 22+ recommended (`npm ci` in `cr-buying-planner/`) |
| JDK | 21 (Embabel agent Maven module) |
| Maven | 3.8+ |
| Browser | Google Chrome locally; Playwright **Chromium** when `CI=true` |

Optional: **`OPENAI_API_KEY`** for `bash cr-buying-planner/run-demo.sh --with-agent`. Worlds appliance is separate — see root [README.md](README.md).

### Proof docs

- [PLAYGROUND.md](PLAYGROUND.md) — index
- [cr-buying-planner/TEST-AND-DEMONSTRATION.md](cr-buying-planner/TEST-AND-DEMONSTRATION.md) — full matrix

### Dashboard sync

If you previously configured the environment only in the Cursor dashboard, commit and merge **`.cursor/environment.json`** so team and Cloud Agents resolve the same install script (repo config overrides personal defaults).
