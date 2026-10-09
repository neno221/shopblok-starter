# Cloud environment

From C0 on, the M0 plan runs in a Claude Code cloud session (decision D16 in [plans/M0.md](plans/M0.md)). This page says how to set up the cloud environment once, what every cloud session does first, and how the cloud differs from your PC. The work that still has to happen on your PC is in the plan, §4a.

The facts about cloud environments come from the Claude Code docs, checked on 2026-10-08 (sources at the end). Where the docs say nothing (whether Docker is running when a session starts, whether the session runs as root, the exact Node 22 patch version, whether the cloud can push workflow files), task C0 checked on 2026-10-08 and recorded the answers in [SETUP.md](SETUP.md#cloud-preflight-c0): Docker is **not** running at session start (start it as in "What every cloud session does first", step 3), the session is root, Node is 22.22.0, and workflow files push fine. C0 also found that a running session can't download other GitHub repos, which is why the setup script fetches dtc-starter and Payload's templates (script step 6).

## Set up once (you)

1. **Give the cloud access to the repo.** `stephanos221/shopblok-starter` is private, so a cloud session can only clone it if one of these is done:
   - the Claude GitHub App is installed on the repo (claude.ai/code asks for it the first time you pick the repo), or
   - you run `/web-setup` once in a local `claude` terminal. It hands your local `gh` token to the cloud. That token has the `workflow` scope, which T16 needs to push `.github/workflows/ci.yml`. C0 checked the route this environment uses (a token with no OAuth scopes that expires about two hours after the session starts) and a push of `.github/workflows/c0-probe.yml` was accepted, so `/web-setup` is only a fallback if a later push of a workflow file is refused.
2. **Create the environment.** On claude.ai/code, click the cloud icon with the environment name, in the row above the message box, then **Add cloud environment**. In the desktop app's Code tab, use the environment dropdown in the prompt box. Fill in the four fields as below.
3. **Start each session** in that environment, on the repo `stephanos221/shopblok-starter` and the branch `main`, and paste the prompt from [NEXT-SESSION.md](NEXT-SESSION.md).

### Name

`shopblok-starter`

### Network access

Choose **Custom**, tick **Also include default list of common package managers**, and paste this into **Allowed domains**:

```text
docs.medusajs.com
nextjs.org
payloadcms.com
pnpm.io
turborepo.dev
osv.dev
api.osv.dev
next-intl.dev
react.dev
tailwindcss.com
vitest.dev
playwright.dev
eslint.org
typescript-eslint.io
www.typescriptlang.org
docs.docker.com
www.meilisearch.com
www.postgresql.org
docs.github.com
docs.renovatebot.com
cdn.playwright.dev
playwright.download.prss.microsoft.com
playwright.azureedge.net
```

Why Custom: the default **Trusted** list already covers npm, GitHub, Docker Hub, nodejs.org and Ubuntu's package mirrors, which is everything installs and builds need. It doesn't cover the documentation sites the plan checks versions and APIs against, or the hosts Playwright downloads its browser from (the last three lines). **Full** would also work, since M0 holds no secrets, but it lets a session reach any site. If a session reports a blocked domain it needs, add it here; running sessions pick up the change within about a minute.

### Environment variables

These values are visible to anyone who uses the environment, so never put a key here. M0 needs none: `pnpm bootstrap` generates the dev secrets inside the VM.

```text
NEXT_TELEMETRY_DISABLED=1
TURBO_TELEMETRY_DISABLED=1
MEDUSA_DISABLE_TELEMETRY=true
PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
BASH_DEFAULT_TIMEOUT_MS=300000
BASH_MAX_TIMEOUT_MS=600000
```

- **Telemetry off:** the telemetry hosts aren't on the allowlist, so those calls would only fail and clutter the logs.
- **`PLAYWRIGHT_BROWSERS_PATH`:** the setup script installs Chromium there, so it's found whichever user the session runs as.
- **Bash timeouts:** installs and builds often take longer than the 2-minute default. 10 minutes is the most Claude Code allows.

### Setup script

The setup script runs as root on Ubuntu 24.04, before Claude starts, the first time a session starts in the environment. If it finishes in about five minutes, the filesystem is saved, and later sessions start from that copy and skip the script. It runs again when you change the script or the allowed domains, and after about seven days. If it exits with an error, the session doesn't start. That's why every step below is allowed to fail: C0, and the first checks of each session, catch anything that didn't work. The log is `/var/log/shopblok-setup.log`. Sessions saw different things, so don't count on the saved copy either way. T02's session saw the script run again at the start of the session although it took 25 s (SETUP.md, "Follow-up checks (T02)"). T04's session found the copy reused: the log held one run, from 03:03, 5234 s before the session's `date -u`, and the VM had booted at 04:30:10 after that log was written ("Follow-up checks (T04)"). T05's session, 56 min later on another VM, found the same log again: the same `setup start`, 8581 s before its `date -u`, with a birth time and last-write time identical to the nanosecond, so it is the same file and not a second run ("Follow-up checks (T05)"). To see which case a session is in, compare `date -u` with `grep -E 'setup (start|end)' /var/log/shopblok-setup.log`: a `setup start` more than a few minutes old points to a reused copy, and one from the last few minutes means the script ran for this session. It is evidence, not proof: T04's log differed by 1 to 2 s from the run T03's own session recorded (SETUP.md, "Follow-up checks (T04)"), which fits a copy the platform built itself after a script change as well as a saved session. So after changing the script or domain list, don't read the next session's log as a verdict either way. C0 measured the script (steps 1 to 5) at 34 seconds, because the image already has Node 22.22.0 and Playwright's system libraries.

Paste this into **Setup script**:

```bash
#!/bin/bash
# shopblok-starter cloud setup. Source of truth: docs/CLOUD.md in the repo.
# Every step may fail without blocking the session; C0 checks the results.
exec > >(tee -a /var/log/shopblok-setup.log) 2>&1
echo "setup start $(date -u +%FT%TZ)"
set -x

# 1. Node 22.22 or newer on the 22 line (.nvmrc, engines). Upgrade /opt/node22 only if it's older.
#    Remove the old npm and Corepack first: unpacking over them leaves stale files that break npm.
if ! /opt/node22/bin/node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a===22&&b>=22?0:1)'; then
  mkdir -p /opt/node22
  rm -rf /opt/node22/lib/node_modules/npm /opt/node22/lib/node_modules/corepack
  tarball=$(curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt | grep -o 'node-v22\.[0-9.]*-linux-x64\.tar\.xz' | head -n1)
  curl -fsSL "https://nodejs.org/dist/latest-v22.x/$tarball" | tar -xJ -C /opt/node22 --strip-components=1
fi
export PATH=/opt/node22/bin:$PATH

# 2. pnpm 12.10.1 from npm, with Corepack off: Corepack can't run pnpm 12 (D1).
corepack disable
npm install -g pnpm@12.10.1
ln -sf /opt/node22/bin/pnpm /usr/local/bin/pnpm

# 3. Pull the compose images (T04) so they're saved with the environment.
#    Containers don't survive; each session starts them.
dockerd_pid=
if ! docker info >/dev/null 2>&1; then
  dockerd >/var/log/dockerd-setup.log 2>&1 &
  dockerd_pid=$!
  for _ in $(seq 30); do docker info >/dev/null 2>&1 && break; sleep 1; done
fi
pids=()
for image in postgres:17.11-alpine redis:7.4-alpine getmeili/meilisearch:v1.54.3 axllent/mailpit:v1.31.4; do
  docker pull -q "$image" & pids+=($!)
done

# 4. Playwright's Chromium and its system libraries, at the plan's Playwright pin (M0 §2).
( PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright npx -y playwright@1.64.0 install --with-deps chromium \
  && chmod -R a+rX /opt/ms-playwright ) & pids+=($!)

# 5. The Medusa agent skills at the commit the plan cites (M0 §3). Plugins don't install in cloud sessions.
( mkdir -p /opt/medusa-agent-skills \
  && curl -fsSL https://codeload.github.com/medusajs/medusa-agent-skills/tar.gz/066132d1c20550cc36c0122e83970eaefe9a2bfd \
     | tar -xz -C /opt/medusa-agent-skills --strip-components=1 \
  && chmod -R a+rX /opt/medusa-agent-skills ) & pids+=($!)

# 6. dtc-starter at the commit the plan cites, and Payload's templates at its v3.90.2 tag (T05, T09).
#    A running session can't download other repos from GitHub: its proxy serves only the
#    session's own repo (C0). This script runs before that limit applies, so it fetches them now.
#    A failed fetch logs "step 6 FAILED" and removes the folder, so a folder is complete or absent.
fetch_tar() {  # fetch_tar <dir> <url> [tar options and patterns]
  local dir=$1 url=$2; shift 2
  ( set -o pipefail
    rm -rf "$dir" && mkdir -p "$dir" \
      && curl -fsSL "$url" | tar -xz -C "$dir" "$@" \
      && chmod -R a+rX "$dir" ) \
    && echo "step 6 ok: $dir" || { echo "step 6 FAILED: $dir"; rm -rf "$dir"; }
}
fetch_tar /opt/dtc-starter \
  https://codeload.github.com/medusajs/dtc-starter/tar.gz/15ef93da7d155ad990d8cc6db0296446fecbdfe6 \
  --strip-components=1 & pids+=($!)
# --no-wildcards-match-slash: `*` stops at `/`, so only the top-level templates/ folders match,
# not a nested */templates/blank in packages/ or examples/.
fetch_tar /opt/payload-templates \
  https://codeload.github.com/payloadcms/payload/tar.gz/refs/tags/v3.90.2 \
  --strip-components=2 --wildcards --no-wildcards-match-slash \
  '*/templates/blank' '*/templates/with-postgres' '*/templates/ecommerce' & pids+=($!)

wait "${pids[@]}"
if [ -n "$dockerd_pid" ]; then kill "$dockerd_pid"; wait "$dockerd_pid"; fi
echo "setup end $(date -u +%FT%TZ)"
exit 0
```

When C0 or a later task changes this script, it updates this page in its PR, and you paste the new version into the environment (gear icon on the environment, then **Setup script**).

**Step 6 was added by C0 and first ran in T03's session (2026-10-09).** Both folders were there, `/opt/payload-templates` held exactly `blank`, `ecommerce` and `with-postgres`, the log had no `step 6 FAILED`, and the whole script took 40 s (SETUP.md, "Follow-up checks (T03)"). T04's session found both folders still there, from the saved copy ("Follow-up checks (T04)"). Step 6 can't be tested from inside a session, because a session can't download the two repos; it was only ever checked by running the setup script. T05 needs `/opt/dtc-starter`; T09 needs `/opt/payload-templates`.

## What every cloud session does first

Each prompt in NEXT-SESSION.md says this, and C0 checks that it works.

1. `node -v` prints 22.22 or newer, and `pnpm -v` prints `12.10.1`. If pnpm is wrong, run `npm install -g pnpm@12.10.1`. Run project tools through `pnpm exec`, never as a bare command: the image has its own global `eslint` 10.1.0, `prettier` 3.8.1, `tsc` and `playwright` 1.56.1 on PATH, which are not the plan's pins. But `pnpm exec` falls through to the global copy of a tool that the package you run it from doesn't depend on. The root depends on `prettier` and `typescript`, so `pnpm exec prettier` and `pnpm exec tsc` are the pinned ones there; it doesn't depend on `eslint` or `playwright`, so run those as `pnpm --filter <package> exec …` from a package that does. Check `--version` against the plan's pin the first time.
2. `pnpm install --frozen-lockfile`.
3. **From T04 on:** run `docker info`. At session start it fails (`failed to connect to the docker API at unix:///var/run/docker.sock`), because the daemon isn't running. The session is root, so no `sudo`. Start it and wait for it (C0 measured about 1 s):
   ```bash
   docker info >/dev/null 2>&1 || (setsid nohup dockerd >> /var/log/dockerd-session.log 2>&1 &)
   for _ in $(seq 30); do docker info >/dev/null 2>&1 && break; sleep 1; done
   docker info >/dev/null 2>&1 || { echo "dockerd did not start:"; tail -n 20 /var/log/dockerd-session.log; }
   ```
   It does nothing if the daemon is already up, so it is safe to repeat. If it prints "dockerd did not start", stop and report the log lines.
   The four pinned images are already there from the setup script (`docker image ls`). Then `pnpm infra:up`.
4. **From T13 on:** `pnpm bootstrap`. It's idempotent, so it's safe to run every time.
5. **Skills:** the plan's BWM, BS, SBP and CMD references are files under `/opt/medusa-agent-skills/plugins/` (`medusa-dev/skills/…` and `ecommerce-storefront/skills/…`). Read them from there.
6. **Upstream sources (T05, T09):** dtc-starter at `15ef93d` is in `/opt/dtc-starter`, and Payload's `blank`, `with-postgres` and `ecommerce` templates at `v3.90.2` are in `/opt/payload-templates/<name>`. If a folder is missing, run `grep 'step 6' /var/log/shopblok-setup.log`: no output means the environment still has the old setup script (see the note under "Setup script"), and `step 6 FAILED: <dir>` means the download failed. Report which; don't try to download them.
7. **Push early.** The GitHub credential a session pushes with expires about two hours after the session starts, and C0 didn't test whether it is refreshed (SETUP.md, C0 item 7). Commit and push the branch after each finished step of the task, not only at the end. If a push is refused with an authentication error, stop and tell the owner: unpushed work is lost when the VM is reclaimed.

A paused session's VM can be reclaimed. The conversation comes back, but running processes don't: containers, database contents, dev servers. After a pause, repeat steps 3 and 4.

## How the cloud differs from your PC

| | On your PC | In the cloud |
|---|---|---|
| OS and path | Windows 11, `E:\shopblok-starter` | Ubuntu 24.04 (x86_64), wherever the session clones the repo. The plan's paths are relative to the repo root |
| pnpm | Needs `corepack disable` or a PATH fix (T00) | The setup script installs 12.10.1 and turns Corepack off |
| Ports | 5432, 5433, 6379 and 7700 are taken by other services, hence D15 | Nothing listens on them (C0 probed 5432, 5433, 6379, 6380, 7700, 7701, 1025, 8025, 8000, 9000 and 15432). The image's PostgreSQL 16 and Redis 7.0 are installed but stopped; leave them stopped, except for T04's port-clash test. The D15 ports work the same, and ports published by containers answer on the VM's `localhost`. `ss` isn't installed: use `lsof -i :PORT` |
| Docker | Docker Desktop is always running | The daemon is off at session start; start it as in "What every cloud session does first", step 3. Containers can't reach the proxy at `127.0.0.1` or trust its CA, which matters only for a container that must call out |
| Claude's memory | Auto memory in your user folder | Doesn't carry over in either direction. Anything a later session needs goes into SETUP.md, the plan or the PR |
| Medusa plugins and docs server | Installed with `/plugin install` | Not installed. Skills come from `/opt/medusa-agent-skills`; Medusa docs come from `docs.medusajs.com` pages |
| GitHub CLI | `gh pr create` works | `gh pr …` and `gh issue …` fail with `HTTP 403: GitHub GraphQL is not available from Claude Code sessions`. Use REST: `gh api repos/stephanos221/shopblok-starter/pulls -f title=… -f head=… -f base=main -f body=…`, or the **Create PR** button. The 403 message also names routes for what GraphQL would do: review threads (`GET /repos/{owner}/{repo}/pulls/{n}/ccr/review_threads`, `POST …/ccr/comments/{id}/resolve`), auto-merge (`PUT`/`DELETE …/ccr/auto_merge`), `…/ccr/ready_for_review` and `…/ccr/convert_to_draft`. `gh auth status` says the token is invalid, but `gh api` and `git push` work; ignore that line. Actions: listing workflows and runs works, `…/actions/permissions` is blocked, and whether a workflow can be started with `…/dispatches` is left to T16 |
| Other GitHub repos | You can clone or download anything public | A session can reach only the repo it was started on. `codeload.github.com` for any other repo answers `403 GitHub access to this repository is not enabled for this session`. The `add_repo` tool is the official way to attach one, but the permission check refused it in C0's session, so plan on it being unavailable. Anything from another repo that a task needs is fetched by the setup script (step 6 and step 5) |
| Network | Your own connection | Every domain on the allowlist answered in C0. A domain that isn't allowed fails at once with `CONNECT tunnel failed, response 403`. The first request to a host after a quiet spell sometimes resets or times out (`payloadcms.com` and `next-intl.dev` did, then answered 20 of 20 times); retry once before calling a domain blocked. `https://api.osv.dev/` itself returns 404; query `/v1/query` |
| Dev servers | You open them in your browser | They run inside the VM. Claude checks them with `curl` and Playwright. Looking at them yourself happens in W2 |
| Long commands | No limit | 2 minutes by default, 10 at most (the environment variables above set 5 and 10). Longer runs go to the background |

## Moving a session between the cloud and your PC

- **Cloud to PC:** in `E:\shopblok-starter`, run `claude --teleport` and pick the session. The repo needs a clean git state and the session's branch must be pushed. In claude.ai/code, the session menu also has **Open in → Terminal**.
- **PC to cloud:** in the desktop app, use the session menu, **Open in → Cloud**, or run `claude --cloud "<task>"` in a terminal. Commit and push first: only committed work is guaranteed to arrive.

## Sources (checked 2026-10-08)

- Cloud environments (setup script, caching, network levels, allowlist, installed tools, what carries over): https://code.claude.com/docs/en/cloud-environments
- Cloud sessions (GitHub access, `--cloud`, `--teleport`, time limits): https://code.claude.com/docs/en/claude-code-on-the-web
- Quickstart (connecting GitHub, `/web-setup`): https://code.claude.com/docs/en/web-quickstart
- Memory (auto memory is machine-local): https://code.claude.com/docs/en/memory
