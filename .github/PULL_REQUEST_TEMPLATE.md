## What changed and why?

Closes #

## Scope and validation
- [ ] Small, focused change; no unrelated refactors
- [ ] `npm ci`
- [ ] `CI=true npm test -- --watchAll=false`
- [ ] `npm run build`
- [ ] `npm run test:e2e` (or reason not needed)
- [ ] Latest-head GitHub Actions runs green before merge

## Paperkit-aligned product guardrails
- [ ] No login / user account / paid core dependency added
- [ ] Career-profile data remains local-first and exportable
- [ ] Raw uploaded resumes and secret keys are not stored or sent without consent
- [ ] Error, cancellation, validation, and privacy impact reviewed
- [ ] Accessibility and mobile UX considered
- [ ] No real personal data, resumes, tokens or secrets in commits, logs or test fixtures

## After merge
- [ ] Main CI success
- [ ] Live Pages smoke check and expected routes working
- [ ] Roadmap / issue updated
