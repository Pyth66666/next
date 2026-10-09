# Apexelerate — full-stack local MVP

A guidance-first journey: clarify an idea → review a brief → prepare an agent prompt → build externally → import GitHub source → understand and debug it with a tutor.

## Start locally

Requires Node.js 24+ (native SQLite), with no runtime npm dependencies.

1. Copy `.env.example` to `.env` in this project directory.
2. Set `NVIDIA_API_KEY` and `NVIDIA_MODEL` locally. Use the exact model ID from your NVIDIA API catalog, with chat-completion support.
3. Run `npm.cmd start` on Windows (`npm start` elsewhere).
4. Open http://localhost:4174. Use this exact origin, not 127.0.0.1, because write requests verify the configured origin.
5. Create an account through **Sign in**, then create a project. Existing browser projects can be imported explicitly through **Account**.

Without API credentials, accounts and saved projects work; sample lessons and template prompts remain usable. Live AI controls return a configuration message rather than fabricated AI results. Restart the server after changing configuration.

The hosted model adapter uses NVIDIA's [LLM chat-completions endpoint](https://docs.api.nvidia.com/nim/reference/llm-apis). A server-configured HTTPS base URL can be supplied through `NVIDIA_BASE_URL`. API keys are never sent to the browser. Brief responses cap output at 2,200 tokens and quizzes at 1,200; truncated responses are rejected. Token estimates in the prompt studio are characters divided by four, not a tokenizer or a savings guarantee. Actual provider usage is displayed when returned. Jev and DSPy are not integrated.

## GitHub setup

Public repositories can be imported by owner/repository name without connecting an account to GitHub.

For private repositories, register a **GitHub App**, not an OAuth App requesting broad repository-write scope:

1. Set Homepage URL to `http://localhost:4174`.
2. Set the user authorization callback to `http://localhost:4174/api/github/callback`.
3. Grant repository **Contents: read-only** and **Metadata: read-only**. No write permission is needed.
4. Disable webhooks; this MVP does not consume them.
5. Install the app on only the repositories you want to read, and obtain any organization approval required.
6. Put the App's **Client ID** and **Client secret** in `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` locally.
7. Restart, then open **My code → Connect GitHub**. Authorize the same GitHub user who can access the installed repositories.

The connection follows GitHub's [user authorization flow](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app), with session-bound, one-use state and PKCE. GitHub access tokens are encrypted with AES-GCM in the local database. Expiring tokens are not automatically refreshed: reconnect when authorization expires. Disconnect removes the locally stored token; revoke the app separately in GitHub settings if you also want to revoke GitHub's grant.

## Try the complete flow

- Complete the five brief questions, then edit the generated template draft.
- Ask NVIDIA for follow-up questions or a proposed brief. A proposed brief replaces yours only when you click **Use this brief**.
- Open **Review Agent Build Pack**, choose guided/concise and build/verification/change. Refine with NVIDIA if desired, review, then copy or download.
- Paste the prompt into your external coding agent and build there.
- Open **My code**, select a repository/branch and import it. An immutable commit snapshot is stored; re-import for newer code.
- Analyze architecture, search/view numbered source files, or ask questions. Choose beginner/intermediate/advanced, quick/steps/deep, English/Bahasa Melayu, and chat/walkthrough/quiz/debug.
- In debug mode, provide symptoms and exact errors. The tutor explains likely causes and proposes a patch or repair prompt with checks. It cannot run your app or apply changes to GitHub. Review proposals and pass them to your coding agent.
- Quiz answers are graded on the server; correct answers update persisted progress. Conversation history, source snapshots, preferences and projects survive restart.

## Data, limits and safety

The single-process Node server serves the UI and same-origin API. SQLite and its WAL files live in `data/`. Passwords use salted scrypt; session IDs are hashed, with HttpOnly/SameSite cookies, seven-day expiry and per-session CSRF tokens. The API checks ownership for every project, snapshot and quiz. Basic rate limits and upstream timeouts are included.

Imports read a pinned Git tree and at most 60 supported text files, 30 KB per file, 240,000 characters total. Generated/dependency directories, environment/key files and common credential filenames are excluded. Common token literals and quoted secret assignments are redacted. This is **not a comprehensive secret detector**. Inspect your source before importing; do not import confidential code without permission. Supported source snapshots are partial whenever indexing limits are reached; unsupported files are excluded.

Only selected excerpts (up to 10 files / 65,000 source characters, plus line-number formatting) and recent conversation are sent to NVIDIA per source task. The model does not receive a runnable clone, logs, production database or full repository context. Explanations may be wrong; inspect cited code and test proposed changes yourself.

Source snapshots and chat text are stored unencrypted in SQLite. Protect the data directory with OS access controls. Preserve `data/token.key` with the database when backing up; losing it prevents decrypting saved GitHub tokens. For a consistent live backup use SQLite's backup tooling, or stop the server before copying the full data directory. Never commit `.env` or `data/`.

## Slide-by-slide pitch coaching

Open `/#pitch` or **Pitch studio** in the navigation. Choose a project and either Hackathon or Startup. Both paths preserve the ten sections of the user-supplied **HACKDEV X AIESEC HWUM_removed.pdf**, pages 1–10: Title, Problem, Solution, Market size, Business model, Go-to-market, Traction, Competition, Team, and Call-to-action. Page 11 is closing/contact information, not an extra required pitch section. The original private PDF and its example images/metrics are not distributed in the public website.

Users can jump between slides, filter unfinished/reviewed slides, enter event criteria and presentation duration, answer guiding questions, plan visuals and write speaker notes. Each track has independent drafts. Evidence is explicitly labelled missing, user-supplied or assumption. Review is a user acknowledgement, never independent verification or investor-readiness certification; editing content reopens it. Export produces an editable Markdown outline with speaker notes and unfinished items, **not PPTX**.

Pitch data is part of each project, saved locally for guests and in SQLite for signed-in users. Import guest projects through Account to use them with live coaching. AI coaching asks focused questions about the current slide and never overwrites content. It uses the saved brief, track criteria, current draft and optional linked snapshot analysis; it does not independently research market facts or authenticate user-entered evidence.

The project editor also has a five-stage journey. Link an imported repository snapshot to the brief to request source-grounded gap feedback and next steps. Only owned snapshots are linkable. Source feedback does not execute the app or verify its runtime behavior. Generated gap reports and AI slide feedback are session-only; user-authored pitch content is persisted.

Hackathon prompts are Apexelerate adaptations layered over the supplied structure, not claims about any particular event's judging rules. Users supply those rules. Startup prompts preserve the reference sections, without inventing revenue, market metrics, credentials or proposed equity terms. Mentor/VC discovery is **not implemented** in this update.

## Verification

Run `npm.cmd install` then `npm.cmd test`. Tests cover the original demo, UI-to-backend account/save/import/tutor/quiz/pitch journey, ten-section source mapping, independent pitch tracks, review reopening, exports, repository-link ownership, ownership, CSRF, source redaction, provider request format and upstream errors. Tests use **mocked NVIDIA and GitHub responses**, not live credentials. Live model quality, GitHub consent and production deployment still need your configured credentials and manual verification.

## Deployment boundary

This is a functional local MVP, not a production-hardened SaaS. Before public launch add email verification/reset, account and repository deletion/export policies, monitoring, backups, abuse controls/quotas, concurrency/job handling, provider evaluation, and a deployment security review. SQLite needs persistent disk; this server is not intended as an ephemeral serverless function.

For an approved hosted deployment, configure `APP_ORIGIN` to its HTTPS origin, `HOST` to the required bind address, and `PORT` to the platform port. Secure cookies are then enabled. Serve UI and API from the same origin. No hosting is provisioned by this project. B2B workstations, mentor/VC matching, Malaysian opportunity routing, automatic code changes and production sandbox execution remain outside this MVP.

