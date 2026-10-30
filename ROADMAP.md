# Voca — Product Vision & Roadmap

> **Tagline:** Your career, clearly organised. Your next move, better prepared.

## Vision
A welcoming, privacy-conscious career workspace for students, graduates, experienced professionals, career changers, freelancers, and people returning to work — across industries, countries, devices, and levels of technical confidence.

## Product principles
1. Useful before sign-up: core workflows work without an account.
2. User owns their data: transparent storage, export, deletion, and no sale of career data.
3. Truth over keyword gaming: never invent qualifications, skills, employers, dates, metrics, or outcomes.
4. Explainable assistance: show why suggestions were made and what evidence supports them.
5. Accessible by default: keyboard, screen-reader, contrast, reduced-motion, and mobile-first support.
6. Global by design: locale-aware dates, paper sizes, terminology, and language-ready UI.
7. No artificial paywalls: creating and exporting a usable resume remains in the free core.
8. Progressive complexity: simple onboarding with advanced controls when needed.
9. Quality is a feature: tests, performance, security, and export reliability are release requirements.
10. AI is optional: manual and deterministic workflows remain useful without an AI provider.

## Product scope
- Career profile: work history, achievements, skills, education, projects, certifications, languages, volunteering.
- Resume builder, resume import, job-description analysis, tailored versions, cover letters, interview preparation, application tracking.
- Export, backup, restore, and deletion controls.

### First-release non-goals
- Auto-applying or submitting forms for users.
- Predicting hiring outcomes or claiming an authoritative ATS score.
- Scraping authenticated sites or bypassing platform controls.
- Mandatory AI, mandatory accounts, or paid downloads.

## Roadmap

### Phase 0 — Rebrand, product foundations, quality baseline
- [x] Adopt Voca identity across the app and docs.
- [ ] Audit routes, components, persistence, dependencies, accessibility.
- [ ] Establish browser/device support and performance budgets (unit/build/desktop/mobile CI baseline established).
- [ ] Add accessibility checks and document privacy/data-flow boundaries.
**Exit:** coherent identity, agreed scope, measurable quality baseline, green CI.

### Phase 1 — Career profile foundation
- [x] Define a versioned canonical career-profile schema.
- [x] Migrate existing LocalStorage records without data loss.
- [x] Add validation, safe defaults, and migration tests.
- [ ] Add achievement evidence and skill provenance.
- [x] Validate backup/restore; retain legacy data until migration is verified.
**Exit:** one validated source of truth; existing users retain data; backup/restore tested.

### Phase 2 — Resume import and document engine
- [ ] Import PDF, DOCX, TXT with file limits and validation.
- [ ] Extract locally where feasible; show preview and correction UI.
- [ ] Handle malformed/multi-column documents; disclose OCR limitations.
- [ ] Build reusable data-driven resume renderer.
- [ ] Add editable DOCX and selectable-text PDF exports.
- [ ] Test A4/Letter, pagination, long names, links, multilingual text.
**Exit:** manually created or imported profiles render and export reliably.

### Phase 3 — Resume builder redesign
- [ ] Improve onboarding and information architecture.
- [ ] Add section reorder, visibility controls, and writing guidance.
- [ ] Offer ATS-conscious and expressive templates.
- [ ] Add live preview, accessible controls, and independent resume versions.
**Exit:** new users can create, edit, preview, download on desktop and mobile.

### Phase 4 — Explainable job intelligence
- [ ] Parse responsibilities, must-haves, nice-to-haves, seniority, location.
- [ ] Match structured career evidence, not keyword presence alone.
- [ ] Explain matched, partial, missing, and unverified requirements.
- [ ] Keep scoring deterministic and transparent; no hiring prediction claims.
- [ ] Test technical and non-technical roles at varied seniority.
**Exit:** useful, explainable analysis without AI.

### Phase 5 — Optional AI-assisted tailoring
- [ ] Define provider-neutral adapter and strict structured output schema.
- [ ] Start with one provider plus mocked tests; add others behind same contract.
- [ ] Use user-supplied keys without persisting by default.
- [ ] Disclose exactly what data is sent before each provider request.
- [ ] Ground rewrites in source evidence and retain provenance.
- [ ] Show diffs; require explicit approval for every change.
- [ ] Reject unsupported claims; provide cancellation, timeout, retry, error handling.
**Exit:** AI improves wording without inventing facts or overwriting source profile.

### Phase 6 — Application workspace
- [ ] Track company, role, URL, status, dates, notes, contacts.
- [ ] Link applications to exact resume/cover-letter versions.
- [ ] Add reminders, timeline, and data export.
**Exit:** users can track applications through outcome without losing context.

### Phase 7 — Career preparation
- [ ] Evidence-grounded cover letters.
- [ ] Role-specific interview questions.
- [ ] STAR/CAR story bank from approved achievements.
- [ ] Practice notes and self-review.
**Exit:** preparation tools without false guarantees or fabricated stories.

### Phase 8 — Global readiness and optional sync
- [ ] Internationalisation foundations and translation workflow.
- [ ] Locale-aware dates, phone numbers, paper sizes, resume conventions.
- [ ] WCAG 2.2 AA review of critical journeys.
- [ ] PWA/offline support where reliable.
- [ ] Threat-model optional encrypted sync before adding accounts/cloud storage.
- [ ] Define retention, export, and deletion controls before cloud profiles.
**Exit:** accessible, localisation-ready product and privacy-reviewed optional sync path.

## Paperkit-aligned contributor and privacy safeguards

- [x] No mandatory login, accounts or paid API for Voca's core functionality.
- [x] MIT-licensed public repository with the same contributor-approval and owner-bypass main ruleset as Paperkit.
- [x] Preserve user-owned browser persistence for the career profile; no hosted resume storage.
- [x] Document Paperkit-aligned privacy, open-source contribution standards and security reporting.
- [x] Provide bug/feature templates and a PR review checklist.
- [x] Add a separate dependency-security audit workflow that uploads reports for review.
- [ ] Add complete local-data deletion across canonical, legacy and job-match keys with regression tests.
- [ ] Add reviewed local resume file validation/processing lifecycle before PDF/DOCX/TXT import.
- [ ] Add CI-tested linting and explicit dependency-license checks.

## Delivery strategy
- Small, reviewable PRs; no unrelated refactors bundled together.
- Unit tests for logic and browser coverage for important user journeys.
- CI must pass before merge; deployment only from the default branch.
- Ship useful vertical slices; update roadmap and link issues/PRs to phases.

## Current baseline
The repository already includes experience tracking, a three-template resume builder, LocalStorage persistence and import/export, deterministic job matching, Jest tests, Playwright tests, and GitHub Pages deployment. Build on these capabilities rather than replacing them wholesale.
