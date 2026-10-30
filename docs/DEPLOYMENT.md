# Deployment

Production: **https://profily-ai.vercel.app**. Judge walkthrough: **https://profily-ai.vercel.app/profile/judge**. Repository: https://github.com/Lakshyalamba/profily-ai.

## Vercel + durable Upstash Redis

`vercel.json` uses Next.js, Node 24, `npm ci`, `npm run build`, and region `iad1`. AI route handlers allow up to 300 seconds. The browser waits up to 290 seconds for a validated result. No API credential belongs in a `NEXT_PUBLIC_` variable.

1. Import the public repository into Vercel or link it with the official CLI.
2. Connect an Upstash Redis integration. The configured database uses the free plan with automatic paid upgrades disabled. Review provider terms in your own account.
3. Configure server-only `GEMINI_API_KEY` as a sensitive production variable. Set `GEMINI_MODEL` to a structured-output model available to your account (currently `gemini-3.1-flash-lite`).
4. Ensure `KV_REST_API_URL` and `KV_REST_API_TOKEN` are supplied by the integration. Alternatively use `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`. Set `PROFILY_STORAGE_PREFIX=profily:production`; use a distinct preview namespace.
5. Deploy using `vercel deploy --prod`. Inspect build output and test the actual external URL. Vercel uses HTTPS origin validation and Secure owner cookies. `PROFILY_PUBLIC_BASE_URL` is optional on Vercel, useful for a canonical external domain.

Do not upload `.env*` files, `.data`, `.vercel`, local archives or dependencies. `.vercelignore` excludes them. Environment pulls contain credentials: keep them ignored and private.

### Storage behavior

The application stores JSON records through authenticated HTTPS Redis commands. Distributed leases are renewed, mutations check lease ownership, and AI quotas are shared across instances. There is no ephemeral filesystem fallback on Vercel. Record expiry is seven days; repository cache expires after 30 minutes. Remote records are capped at 3 MB, so a large workspace/activity collection may reach capacity before the item limit. There are no user accounts or cookie recovery. Keep provider logs, access controls and backups under account-owner review.

The static judge profile is bundled, uses only fictional personal information and licensed public repository excerpts, and does not expire with a user publication. Never upload a real candidate's information without their permission.

## Self-hosted Node alternative

Without Redis, use one Node 24 process and a persistent writable data parent. Filesystem queues and quotas are process-local. Static export, Workers and Edge are unsupported. PDF parsing uses a bounded Node child process; export loads traced fonts.

```sh
npm ci
npm run build
npm start
```

For an external host, inject runtime secrets and set `PROFILY_DATA_DIR=/srv/profily/data/profiles` and `PROFILY_PUBLIC_BASE_URL=https://your-domain.example`. Persist the data directory's parent. `scripts/start-production.mjs` copies static and public assets into standalone output. Place an HTTPS reverse proxy in front and allow 4 MB PDFs plus multipart overhead and a 300-second request timeout.

Docker/Compose configuration is provided for Node 24 and a persistent volume. Its daemon was unavailable during earlier local verification, so container operation is not claimed as tested. Never delete a volume to update the service.

## Required post-deployment checks

Open the landing page, judge demo, editor, publication controls, interview, job comparison and analytics. Import the synthetic PDF and a real public repository; edit, save, publish, open as an independent guest, then revoke. Ask a supported question, a contextual follow-up and an unsupported qualification. Complete an interview and download a PDF. Check recorded metrics and origin/owner isolation. Test microphone recognition and audible playback on the actual recording computer; do not present typed input as verified voice. See `VERIFICATION-PHASE-6.md` for what was actually measured.
