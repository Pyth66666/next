# Deploy Apexelerate to Vercel

The website is served as static files from `public/`. Requests under `/api/` go to `api/index.mjs`, a Node.js function. Hosted Postgres stores accounts, sessions, projects, pitch drafts, source snapshots and tutoring history. The deployed backend never creates a local SQLite database or encryption-key file.

## 1. Connect a Postgres database

In your Vercel project's **Storage** tab, connect a **Neon Postgres** database through the [Vercel Marketplace](https://vercel.com/docs/marketplace-storage). Review the provider's plan and charges before provisioning. Alternatively use an existing hosted Postgres database.

Use a dedicated database for this application. Copy its **pooled** Postgres connection string into the private `DATABASE_URL` environment variable. Keep the provider's TLS options in the URL; do not disable certificate checks in code. Choose a database region close to the function region to reduce latency. The database user needs table/index creation permissions for the initial schema setup.

## 2. Configure private environment variables

Open **Settings → Environment Variables**. Configure these for **Production**:

- `DATABASE_URL`: the full Postgres connection string, including the password and TLS options.
- `APP_ORIGIN`: `https://apexelerate.vercel.app` (change this if your public domain differs). Use only the origin, not a path. API writes reject other origins.
- `TOKEN_ENCRYPTION_KEY`: one private, stable, random 32-byte key encoded as **64 hexadecimal characters**.
- `AI_PROVIDER`: `gemini` (also the default). Set this explicitly if you previously chose NVIDIA.
- `GEMINI_API_KEY`: copy the Apexelerate key from [Google AI Studio](https://aistudio.google.com/api-keys) into this private Vercel variable.
- `GEMINI_MODEL`: `gemini-3.5-flash-lite`. This default supports text generation and a free tier, subject to Google project/model quotas. See [current Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing). Change it if your project uses another supported text model.

Existing `NVIDIA_API_KEY`, `NVIDIA_MODEL` and `NVIDIA_BASE_URL` are ignored when `AI_PROVIDER=gemini`. There is no need to copy your Google key into the old NVIDIA variable.

Generate the encryption key once in your own terminal:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Paste the result directly into Vercel. Do not commit it or send it in chat. Preserve it in your password manager along with your database backups. Replacing it makes existing saved GitHub tokens unreadable; this MVP does not implement key rotation.

For private GitHub repositories, also configure `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. Update your GitHub App homepage to the public domain and its callback URL to:

```text
https://apexelerate.vercel.app/api/github/callback
```

Keep Contents and Metadata read-only. Public repository imports do not require a GitHub App connection.

Do not set `DATA_DIR` or `DATABASE_PATH` on Vercel. They are for local SQLite only. Your local `.env` is not uploaded by Git; enter the production secrets in Vercel separately.

## 3. Deploy the updated source

The repository root is the application directory. Use Node.js **24.x**. The checked-in `vercel.json` sets Framework to **Other**, leaves the build command empty, publishes **public**, configures the API rewrite and sets the function duration to 120 seconds. Remove conflicting old dashboard overrides if Vercel reports a conflict. Enable Fluid Compute if your project's function-duration settings require it.

Deploy the updated `main` commit, or redeploy after saving the environment variables. Changing an environment variable does not update an already running deployment.

The initial database request creates the schema under a transaction-scoped Postgres advisory lock. Concurrent function instances share database-backed rate limits. Expired rate-limit rows are removed during rate-limit checks. Passwords and session IDs remain hashed; GitHub access tokens remain encrypted.

## 4. Verify the deployment

1. Open the homepage. It should load independently of database availability.
2. Open `/api/health`; expect `{"ok":true}`. This checks database connectivity and schema initialization.
3. Create an account, save a project and refresh. Sign out and sign in again to verify persistence.
4. Test a brief request. Missing Gemini settings produce a configuration error; an upstream timeout or quota limit remains a separate Google API issue, not a database failure.
5. Import a public repository, then test architecture analysis, tutoring and a quiz.
6. If configured, connect GitHub and verify the callback on the same public origin.

If the API returns **503 Backend setup is incomplete**, check the three required storage/origin settings and redeploy. A database connection or schema error is logged as a generic request failure without printing credentials. Check the database provider's connectivity and permissions. Avoid sharing connection strings or API keys in screenshots.

## Existing local data and preview deployments

Your existing local SQLite database is untouched. A new Postgres database starts empty; existing local accounts, server-saved projects and GitHub connections are **not automatically migrated**. Browser guest projects can still be imported through Account. A migration of server-only local data would be a separate task.

Use a separate database/branch and encryption key for Preview deployments. Set their own `APP_ORIGIN` to a stable preview URL. Random preview URLs will fail write-origin checks when only the production origin is configured; do not weaken the origin check to work around this.

## Limits

Tests exercise real Postgres SQL through an embedded PGlite engine with injected transport. They do not certify your hosted database, Vercel account configuration, GitHub consent or live Gemini model. Those require the checks above.

Source imports and AI requests are still synchronous and bounded; large/slow GitHub imports can exceed a function deadline. Hosted Postgres does not add background jobs. Enable provider backups, monitor errors and usage, and add stronger abuse protection, email verification/password reset and deletion/export policies before a public launch.

References: [Vercel function configuration](https://vercel.com/docs/project-configuration/vercel-json), [Node.js functions](https://vercel.com/docs/functions/runtimes/node-js), [node-postgres pooling](https://node-postgres.com/features/pooling).
