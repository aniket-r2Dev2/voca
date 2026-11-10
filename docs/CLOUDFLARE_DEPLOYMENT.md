# Cloudflare Workers deployment

Cloudflare is the selected hosted relay target. The frontend stays on GitHub Pages. This first deployment is a **restricted beta**: users need a relay access token as well as their own OpenAI API key. Do not publish the relay token in source, build variables or the website. Anonymous access and multi-user token management are not implemented.

## What is implemented

The Worker reuses the tested OpenAI adapter and proposal validation. HTTPS, exact frontend Origin checks, bearer authentication, request/output caps, deadline/cancellation and generic errors protect the route. No endpoint override, redirects, retries, database, resume/key persistence or application request logging. Cloudflare observability is disabled in the deployment configuration. Hosting/provider infrastructure may still retain operational metadata under their policies; this is not a zero-retention guarantee.

An approximate limit of six generation attempts per minute **per Cloudflare location** applies across beta callers. The limiter is not a strict worldwide quota or concurrency cap. It uses a constant key, never an IP address or provider credential. A missing or failing limiter fails closed. CORS is not authentication; the secret is always required. Rotate the beta token if disclosed.

The Worker has no configured model or authentication secret by default and fails closed until deployment configuration is supplied. `GET /api/capabilities` checks access without an AI request. The frontend preserves mandatory review before accepting a suggestion.

## Account setup (one time)

1. Use your existing Cloudflare account and select **Workers Free**. No paid-plan upgrade, domain purchase or storage product is required by this configuration. The code cannot enforce your account's billing plan; confirm it in Cloudflare before deploying.
2. Create a Cloudflare API token using the **Edit Cloudflare Workers** template, scoped to the intended account. Obtain that account's Account ID.
3. In the Voca GitHub repository, create an environment named `cloudflare`. Add these **environment secrets**:
   - `CLOUDFLARE_API_TOKEN` — deployment credential, not an OpenAI key.
   - `CLOUDFLARE_ACCOUNT_ID` — target account ID.
   - `VOCA_RELAY_TOKEN` — generate locally with `node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"`. Share only with intended beta testers through a private channel.
4. Add an environment **variable** `VOCA_MODELS` containing comma-separated OpenAI model IDs available to your users and supporting Responses structured output. No model is assumed or silently substituted.
5. Review `worker/wrangler.jsonc`. The frontend origin is `https://aniket-r2dev2.github.io` (origins have no `/voca` path). Rate-limit namespace `36001` must not conflict with another application in your Cloudflare account. The deployed Worker name is `voca-relay`; ensure it does not replace an unrelated Worker with that name.

Never paste API tokens into chat or commit them to the repository. The repository workflow reads credentials from GitHub secrets and sends the relay secret over stdin to Wrangler.

## Deploy and activate

Run **Actions → Deploy Cloudflare relay → Run workflow** on `main`. It tests the shared relay and Worker, deploys with pinned Wrangler, sets the relay secret, and checks authenticated capabilities/CORS plus unauthenticated rejection. It makes no paid OpenAI request. The first deploy is inaccessible until the secret is set; a failed secret step leaves it unavailable. On an existing deployment, the previous secret can remain active if rotation fails.

Copy the successful `https://voca-relay.<account-subdomain>.workers.dev` URL from the deployment output. Set the **repository variable** `VOCA_RELAY_URL` to this origin only. The next frontend build reads it as `REACT_APP_VOCA_RELAY_URL`. Trigger a new main build (or rerun the deployment workflow for the current main commit). Do not enable this variable before the relay verification succeeds. Clearing the variable and rebuilding restores manual-only hosted mode.

For end-to-end smoke testing, use synthetic resume/JD data, enter your relay token and own provider key, inspect the payload, explicitly authorize one billable generation, review/accept the suggestion and save/reopen. Check cancellation and provider-error recovery. A successful capabilities check alone does not verify OpenAI account access, CPU headroom or the full live generation path.

## Free-tier limits and checks

Cloudflare currently documents 100,000 Worker requests/day and 10 ms CPU per request on Free. Waiting for OpenAI does not consume CPU time, but JSON validation and authentication do. Mocked tests and Wrangler bundling do not prove production CPU usage; inspect runtime CPU metrics with synthetic traffic before expanding beta access. Limits may change; consult the official links below. Stay on Free if avoiding hosting charges is mandatory. Provider API costs still belong to users. No price estimate or free AI usage is promised.

No Cloudflare account credentials or real provider credentials were available during implementation. Deployment and free-tier CPU verification remain outstanding until account setup is complete.

## Local validation

`npm run test:worker` tests the Worker handler with mocked provider/rate-limit calls. `npm run test:relay` tests the shared adapter and local Node relay. `npm run build:worker` bundles with pinned Wrangler using `--dry-run` and requires no account credentials. `npm run test:worker-runtime` boots the local Cloudflare runtime with synthetic credentials to check authentication, capabilities, CORS and input validation without an AI call. CI runs these checks alongside the app/browser checks. The GitHub production workflow runs only manually on `main` and uses the `cloudflare` environment.

## Official references

- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
