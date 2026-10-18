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
CI=true npm test   # from buying-planner/
```

### Toolchain (matches Cloud Agent / CI)

| Tool | Version / notes |
| --- | --- |
| Python | 3.10+ with `venv` (mock API on **8900**) |
| Node.js | 22+ recommended (`npm ci` in `buying-planner/`) |
| JDK | 21 (Embabel agent Maven module) |
| Maven | 3.8+ |
| Browser | Google Chrome locally; Playwright **Chromium** when `CI=true` |

Optional: **`OPENAI_API_KEY`** for `bash buying-planner/run-demo.sh --with-agent`. Worlds appliance is separate — see root [README.md](README.md).

### Proof docs

- [PLAYGROUND.md](PLAYGROUND.md) — index
- [buying-planner/TEST-AND-DEMONSTRATION.md](buying-planner/TEST-AND-DEMONSTRATION.md) — full matrix

### Dashboard sync

If you previously configured the environment only in the Cursor dashboard, commit and merge **`.cursor/environment.json`** so team and Cloud Agents resolve the same install script (repo config overrides personal defaults).

**Refresh the Cloud Build:** Cursor → Cloud Agents → your environment → **Builds** → **Trigger build**. Pushes to `main` also schedule recurring rebuilds when the active Build is stale.

## Secret scanning (local)

This repo uses **GitGuardian [ggshield](https://github.com/GitGuardian/ggshield)** via **pre-commit** (same pattern as `jmjava/tekton-dag`):

```bash
pip install pre-commit ggshield
pre-commit install
pre-commit run --all-files   # optional smoke
```

Commits are blocked if ggshield finds API keys, tokens, or private keys in staged changes. On the public GitHub repo, enable **Secret scanning** and **Push protection** under Settings → Code security and analysis. Optionally install the **GitGuardian** GitHub App for PR checks (same ggshield engine).
