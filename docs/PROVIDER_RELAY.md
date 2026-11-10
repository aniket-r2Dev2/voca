# Local provider relay (M3 first slice)

Voca's public GitHub Pages site is static. This slice provides a **local, single-user Node 24 service and command-line client**, not a hosted automatic-generation feature. The existing handoff response importer remains the mandatory review gate. M3 is not complete.

## Transport decision

Use a fixed OpenAI Responses endpoint (`https://api.openai.com/v1/responses`) behind a loopback-only relay. No arbitrary endpoints, redirects, shared provider key, database, request logs or automatic retries. The caller supplies an API key for each request. The relay receives that key and the selected evidence/JD in memory; it sends them to OpenAI over HTTPS. It does not intentionally persist them, but this is not a promise of secure memory erasure. API billing and provider retention policies apply. `store: false` is requested; that does not guarantee zero provider retention.

This local service is not approved for public hosting. It uses a shared local token, a single in-flight request and six authenticated attempts per minute, not multi-user authentication or distributed abuse controls. Public hosting still requires TLS, authenticated sessions, deployment-specific redaction/retention review, operating-cost and provider-terms review, and frontend consent/cancellation UX. Do not expose it through a tunnel or reverse proxy as a public service.

Implementation follows the [Responses structured-output documentation](https://developers.openai.com/api/docs/guides/structured-outputs) and [Responses migration guide](https://developers.openai.com/api/docs/guides/migrate-to-responses). No provider SDK dependency is needed.

## Run locally

Use Node 24. From the repository root, in a Bash terminal:

```bash
export VOCA_RELAY_TOKEN="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")"
read -r -p 'Supported OpenAI model ID: ' VOCA_MODEL
export VOCA_MODEL
export VOCA_MODELS="$VOCA_MODEL"
npm run start:relay &
relay_pid=$!
```

Choose a model available to your API account that supports Responses structured outputs. There is no guessed default model or fallback. Optional `VOCA_PORT` defaults to 8787. `VOCA_ORIGIN` defaults to `http://localhost:3000`; only a local HTTP development origin is accepted. The HTTP service binds exclusively to `127.0.0.1`, rejects unexpected Host/Origin headers, and requires the relay token even for local calls. A native client may omit Origin.

1. In Voca's Tailor page, open a job draft, select source passages and prepare its AI handoff prompt. Read the complete payload. Contact fields are not included automatically; selected free text can still contain personal information.
2. Save the prepared prompt to a temporary local file outside the repository, for example `/tmp/voca-prompt.txt`. Keep the draft open and unchanged until importing the result.
3. Enter your API key without putting it in shell history. The explicit `--send` flag authorizes one potentially billable request. The exact destination is OpenAI through `http://127.0.0.1:8787` (or your configured port).

```bash
read -r -s -p 'OpenAI API key: ' OPENAI_API_KEY
export OPENAI_API_KEY
node server/client.cjs --send < /tmp/voca-prompt.txt
unset OPENAI_API_KEY
```

The client prints the response JSON to your terminal. Paste it into the same draft's **AI response** field, review it, and explicitly accept/edit/reject before saving. The importer rejects a response if the draft changed. Output validation checks structure, request ID and a quote from the selected evidence; it cannot prove every proposed claim is true.

Press Ctrl+C to cancel the client. Cancellation aborts the upstream connection but may not prevent provider charges. A timeout or error never retries automatically. Check the error and explicitly run again only if you want another potentially billable request.

When finished:

```bash
kill "$relay_pid"
unset VOCA_RELAY_TOKEN VOCA_MODEL VOCA_MODELS
rm /tmp/voca-prompt.txt
```

Your terminal scrollback and any files you create may retain resume content. The relay itself writes neither request bodies nor keys to disk. No credentials belong in GitHub, browser storage, backups, URLs or command-line arguments.

## Contract and limits

`POST /api/tailor`, JSON content type, `Authorization: Bearer <relay token>` and `X-Provider-Key: <user API key>`.

Input has exactly `requestId`, `model`, `jobDescription`, `evidence`. Evidence consists of `{path, quote}` entries from `profile.summary` or `experiences[n].description`. Unknown fields (including contact properties or endpoints) are rejected. Models must be explicitly configured by the operator.

- 50,000-byte request body; JD up to 20,000 characters; 1–20 unique evidence passages, each up to 8,000 characters.
- 60-second request deadline, including upload and provider response.
- 2,000 provider output tokens and 128,000 response bytes; output strings up to 8,000 characters. These caps are not price estimates.
- Result: `{requestId, proposed, reason, evidence: {path, quote}}`; no acceptance flag or master-profile write.
- Sanitized error codes distinguish local authentication, provider key/access, model/request rejection, rate/quota, refusal, timeout, network and invalid output. Provider error text is never returned.

## Validation and opt-in live smoke

`npm run test:relay` runs mocked HTTP/provider tests without credentials or charges. CI also runs the existing app and desktop/mobile browser regressions. Tests cover request boundaries, authentication, DNS rebinding/Origin rejection, malformed/incomplete/refused output, quoted evidence, provider failures, cancellation, timeout recovery, rate/concurrency bounds and no retries.

For an optional live smoke, prepare a handoff using synthetic resume text and a synthetic JD, then follow the explicit `--send` flow above. Verify the returned request ID, quoted evidence, pending review, acceptance and save/reopen. This requires your own API account and may incur charges. No live paid provider request was executed during this implementation; mocked checks do not establish model availability or account permissions.

## Browser integration

Run the relay as above, then run `npm start` in another terminal and open Voca locally. In Tailor, select evidence and prepare an AI prompt. The API section then lets you enter the relay access token, check the relay, select one of its configured models, and enter your provider API key. Review the displayed JSON payload and check the explicit paid-request consent before generating. The resulting suggestion is pending until you accept/edit/reject it.

The connection check uses authenticated `GET /api/capabilities`. It returns the OpenAI provider identifier and configured model IDs without sending resume text or the provider key to OpenAI. It does **not** verify API billing or provider/model access. Those are checked by the generation request.

The default local relay is `http://127.0.0.1:8787` and accepts `http://localhost:3000`. If you open the frontend on another local port/host, set `VOCA_ORIGIN` to that exact origin before starting the relay. The UI supports cancellation and aborts requests on draft changes/navigation. Credentials stay in component memory, are cleared on draft changes/navigation or with Clear credentials, and never enter the profile or backups. Provider keys are also cleared on successful generation. No automatic retry is made.

For a future reviewed deployment, `REACT_APP_VOCA_RELAY_URL` pins the HTTPS relay origin at build time (no paths, credentials, query strings or fragments). This is a public URL setting, **not a secret**. There is no user-editable endpoint field or fallback to another destination. Loopback HTTP is allowed only from local HTTP pages. The public GitHub Pages build has no relay configured and retains manual handoff. Never put a relay token or provider key in build variables. A hosted adapter must implement the same authenticated capabilities and tailoring routes, CORS and bounded-error contract; the existing loopback server must not simply be exposed publicly.

Browser CI intercepts relay traffic with synthetic fixtures and verifies consent, source preservation, mandatory review, credential non-persistence, cancellation and stale responses on desktop/mobile. No real provider key is used.

## Next release slice

Select and configure the managed hosting/authentication approach, then activate the implemented browser connection flow against that reviewed HTTPS endpoint. Keep manual handoff available. Additional providers follow the same validated proposal contract after the first complete flow is working.

## Cloudflare adapter

The selected hosted target now has a separate Worker adapter and deployment workflow. Follow [Cloudflare deployment](CLOUDFLARE_DEPLOYMENT.md). The local Node server remains loopback-only; Cloudflare activation requires account setup and live verification.
