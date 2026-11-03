# Voca — Job-tailored Resume Roadmap

Updated: 2026-11-01. This replaces the previous broad career-workspace delivery order.

> Upload your resume. Paste the job description. Use your AI. Review the changes. Download your tailored resume.

## Product goal

Voca helps a job seeker turn their existing experience into a resume tailored to a specific job, without inventing qualifications or overwriting their original.
The immediate product is a focused resume-tailoring workflow. Application tracking, interview preparation and broad workspace features are deferred.

## Core workflow

1. Upload PDF, DOCX or TXT, or paste resume text.
2. Review extraction and confirm a source resume.
3. Paste the job description; optionally enter company and role.
4. Choose an AI mode and, for automatic mode, a supported provider/model.
5. Review the data being sent and generate suggested changes.
6. Compare original and proposed content; accept, reject or edit changes.
7. Save a separate job-specific version and download PDF or DOCX.
8. Return later to the original or another version; back up or delete local data.

Manual editing and existing exports remain usable without AI or a Voca account.

## Two AI modes — subscriptions are not API keys

### Automatic tailoring: bring your own API key
- Users supply access to their own provider API account; provider usage/credits are billed under that account.
- OpenAI, Anthropic and Google Gemini are target integrations, delivered one at a time.
- Start with one verified adapter (OpenAI proposed), then Anthropic, then Gemini.
- Add an advanced OpenAI-compatible endpoint option only after endpoint, authentication, model and structured-output compatibility tests. Do not advertise support for every AI service.
- Provider/model selection must reflect actual supported capabilities and access, not a frozen list of model names.
- Voca does not charge for creating, reviewing or downloading a resume; AI providers may charge for requests.
- ChatGPT or Claude chat subscriptions are not credentials Voca can consume. API setup and billing are separate; any eligible plan credits must be checked with the provider.

### Manual handoff: use an existing chat account
- Prepare a bounded prompt containing only user-approved source details, the JD and a structured output contract.
- User explicitly copies it into ChatGPT, Claude or another chat tool, then pastes the response back into Voca.
- Validate the response and use the same change-review flow as API output.
- This is a manual workflow subject to the chat service's limits, not an automatic subscription integration.
- Never collect chat passwords, session cookies or subscription tokens; do not automate authenticated chat UIs.

Official billing references (checked 2026-11-01):
- https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform
- https://support.claude.com/en/articles/9876003-why-is-claude-api-usage-billed-separately-from-my-paid-claude-plan

## Where we are now

Verified against main at 64cd95b (PR #27 merged).

| Area | Existing capability | Work still needed |
| --- | --- | --- |
| Career data | Canonical profile, migration, browser persistence | Immutable source snapshots and job-specific versions |
| Import | Local UTF-8 TXT up to 1 MiB; editable review and confirmation | PDF/DOCX extraction, paste-text input, richer mapping |
| Resume builder | Manual editing and three visual templates | A focused upload/JD/tailor/review/download workspace |
| Export | Visual PDF; selectable-text PDF with A4/Letter | Editable DOCX, broader script/font support, version-specific export |
| Matching | Basic deterministic job matching | Structured JD requirements and evidence-linked tailoring |
| AI | No automatic AI tailoring or provider connection shipped | Adapters, transport, credentials, consent, structured output and review |
| Data controls | JSON backup/restore and complete local deletion | Include versions/JDs; always exclude credentials |
| Quality | Unit/build/desktop/mobile CI; Pages deployment smoke check | Import, AI failures, factual constraints and end-to-end tailored-output tests |

Text PDF currently supports Western European text and explicitly rejects unsupported characters; visual PDF remains available.
Existing audit reporting is not a clean security bill: dependency remediation remains tracked in #23.

## Preserve, modify and add

### Preserve
- Canonical career data, existing migration and recovery paths.
- TXT import validation/review, current editors and PDF exports.
- Free core, no mandatory Voca login, user-controlled local storage, backup and deletion.
- MIT/open-source contribution standards and CI/deployment verification.

### Modify
- Make the primary journey "Tailor my resume", rather than several disconnected career tools.
- Reuse import review but import into a working source draft; replacement of the master remains a separate explicit action.
- Pass a selected resume/version to previews and exports instead of always reading the master profile.
- Expand backup and deletion to cover versions and JDs with backward-compatible migrations.
- Explain local processing versus external AI requests accurately; never say all data stays on-device when cloud AI is enabled.
- Move minimal JD analysis, evidence mapping and versioning ahead of cosmetic redesign.

### Add
- A Tailor workspace with source resume, JD, generation status and resumable drafts.
- A version schema: source snapshot/revision, JD, company/role, approved content, change decisions, provider/model metadata and timestamps.
- Provider-neutral request/result contract and an independently tested transport.
- Change review with before/after content, reason, source references and unsupported-requirement warnings.
- Manual prompt handoff and validated response import.
- DOCX/PDF imports and editable DOCX export.

## Delivery order and acceptance criteria

### M1 — Source + JD workspace and safe versioning (complete)
- [x] Create a Tailor route with existing profile, TXT import and paste-text entry points.
- [x] Capture JD and optional company/role; validate empty and oversized input.
- [x] Create immutable source snapshots and separate job-specific drafts.
- [x] Define the structured proposal contract and change decisions using mocked fixtures before adding paid API calls.
- [x] Preview/export a selected version through existing PDF utilities.
- [x] Migrate backup/restore/deletion to include drafts, JDs and versions without losing existing profiles.
**Acceptance:** user can prepare a source + JD draft, edit it, reload and export it without changing the master. Cancelled/failed writes preserve existing data. Old backups still restore. No provider request occurs.

Likely affected: src/App.js, a new src/pages/Tailor.js, new tailoring components/hooks/schema utilities, src/hooks/useCareerStore.js, src/utils/careerBackup.js, src/utils/localDataPrivacy.js, src/pages/Resume.js and export utilities. Final paths are implementation decisions.

### M2 — Practical resume inputs (next build-ready task)
- [x] Add local DOCX extraction to the editable Tailor source-review flow.
- [ ] Add local text-based PDF extraction to the same flow.
- [ ] Establish byte/page/uncompressed-size limits, timeouts, cancellation and worker processing where necessary.
- [ ] Review parser dependencies, licenses and advisories before adoption.
- [ ] Reject corrupt, encrypted and unsupported files with useful recovery guidance.
- [ ] Preserve uncertain text, warn about tables/multiple columns and require user review.
- [ ] Detect scanned/image-only PDFs and explain that OCR is not included in the first release.
**Acceptance:** normal DOCX/PDF resumes produce editable source drafts; malformed files, cancelled parsing and storage failures do not overwrite data. Import alone makes no external request.

### M3 — Provider connection and first complete tailoring flow
- [ ] Complete a transport/security decision before implementing browser credential entry.
- [ ] Implement one provider adapter against a common contract, with mocked CI and an explicit opt-in live smoke test.
- [ ] Add provider/model selection, connection testing and clear API-account/billing guidance.
- [ ] Show the actual provider destination and approved resume/JD payload before generation; exclude contact details by default where not needed.
- [ ] Show request limits and estimated usage/cost when reliable; label estimates and provide token/output caps.
- [ ] Handle invalid keys, unavailable models, rate limits, quota, cancellation, timeout, malformed output and network failure.
- [ ] No automatic paid retry loops; require an explicit retry and disclose possible additional charges.
**Acceptance:** a user can generate a draft proposal with their own API access, see where their data goes, cancel, and recover from errors without losing the source. Keys never enter logs, analytics, backups or browser persistence.

### M4 — Trustworthy review, manual handoff and additional providers
- [ ] Rewrite summary/bullets and prioritize supported skills/experience using the source and JD.
- [ ] Include source entry IDs and an explanation for each suggested change.
- [ ] Lock employer names, titles, dates, credentials and numerical claims unless the user explicitly edits the underlying source.
- [ ] Reject unknown source references and prohibited fact changes; flag unsupported JD requirements instead of inserting them.
- [ ] Treat resume/JD text and returned output as untrusted data; never execute instructions, HTML or tool calls from them.
- [ ] Validate schema/size and show accept/reject/edit controls before any proposal becomes an approved version.
- [ ] Add manual prompt export + response paste with the same validation; bind responses to the correct source/JD revision and reject stale responses.
- [ ] Add Anthropic and Gemini adapters after each passes the same contract and failure tests.
- [ ] Add compatible endpoints only with explicit endpoint-specific credential selection; never forward one provider's key to another destination.
**Acceptance:** upload/source + JD -> API or manual handoff -> review -> save separate version -> PDF works on desktop/mobile. Unsupported facts cannot be silently applied. Automated checks reduce risk but do not guarantee truth; user review is mandatory.

### M5 — Application-ready downloads and release quality
- [ ] Add editable DOCX export from approved versions.
- [ ] Broaden text-PDF font/script support; test non-Latin names and multilingual content.
- [ ] Verify reading order, links, long text, pagination and A4/Letter.
- [ ] Finish accessible keyboard/mobile states, progress, error recovery and empty-state guidance.
- [ ] Add deterministic provider fixtures, adversarial JD/resume fixtures and end-to-end extraction-to-download tests.
- [ ] Add linting, dependency-license checks and continue security remediation.
**Acceptance:** approved versions export without silent text loss, original data stays intact, unsupported cases are explained, and latest-head required checks plus post-merge deployment checks pass.

M3 must include a minimal M4 review gate in its first user-visible slice. Never ship a generate-and-overwrite shortcut while waiting for the full review UI.

## AI architecture and privacy boundary

The current hosted product is a static GitHub Pages app. It cannot itself hold server secrets or run a backend.
Do not assume every provider permits secure browser-origin API calls or shares the same authentication/CORS behavior.

Planned default for automatic BYOK:
- A small server-side relay for the hosted product so users can select a provider, enter an API key and generate without installing software. This is new backend work, not a capability of GitHub Pages.
- User-entered keys remain in frontend memory only until cleared/navigation; send only over HTTPS to the explicitly disclosed relay. The relay uses them only for the request, never stores them, and redacts authorization headers, request bodies and errors from logs/APM. Never embed a shared provider key in the frontend.
- Offer a user-controlled local/self-hosted gateway as an alternative; its keys may come from user-managed environment/secret configuration.
- Verify provider SDK guidance and transport support during M3; record the decision and setup requirements.
- Preserve no mandatory Voca account where feasible using short-lived request/session authorization, strict origin controls, rate limits and abuse controls. CORS alone is not authentication. Self-hosted/local listeners also need authentication and safe binding.
- Keep arbitrary endpoint access out of the public gateway: use destination validation/allowlists and private-network protections where applicable.
- Keep keys out of LocalStorage, sessionStorage, IndexedDB, URLs, exported files, service-worker caches and telemetry; memory-only input is still sensitive to frontend XSS, so review dependencies, CSP and third-party scripts.
- Before a managed relay ships, verify hosting cost, provider terms, request authentication, abuse/rate controls, secret redaction, request-size limits and retention behavior. Resume/JD content and credentials pass through it transiently; disclose this explicitly and do not claim the data stays on-device. No persistent resume/key database is planned. If those release gates cannot be met, keep automatic mode unavailable and offer manual handoff/self-hosting instead.
- The static hosted app retains manual handoff and local editing/export when the relay is unavailable. Any hosting expenses are Voca operating costs, separate from the user's provider charges.

Only approved source fields and the JD go to the selected AI endpoint. Voca must disclose that provider retention/training policies apply and must not promise zero retention without evidence.
Changing provider/endpoint clears connection state. No hidden fallback to another provider.

## Deferred until the core tailoring workflow is reliable

- Application tracker, reminders and automatic job saving.
- Cover letters, interview practice and STAR story bank.
- LinkedIn optimisation, browser extension and auto-apply.
- Major visual-template redesign and advanced section customisation.
- Accounts, hosted profile storage and cross-device sync.
- OCR for scanned resumes and broad internationalisation.

Accessibility, security fixes and preventing data loss are ongoing requirements, not deferred polish.

## Delivery rules

- Small reviewable PRs, each with one useful vertical slice and explicit acceptance criteria.
- Preserve working functionality and migration compatibility; do not replace the app wholesale.
- Unit and desktop/mobile browser coverage for critical journeys; provider CI uses mocks, never real user keys.
- Validate latest-head checks before merge and the deployed default branch after merge.
- Update this roadmap and tracking issue #12 together as milestones land.
- No unsupported ATS-score or hiring-outcome guarantees.
- No Voca paywall on editing/export; external provider charges remain the user's responsibility.
