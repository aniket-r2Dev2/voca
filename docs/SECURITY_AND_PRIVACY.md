# Voca security, privacy, and data lifecycle

This document applies the same privacy-first approach used by Paperkit, adapted for a **career workspace whose edits must survive page refreshes**.

## Authentication and cost

- No login, registration, social sign-in, account, or authentication wall for core experiences, resume building, job matching or export.
- Core manual/deterministic workflows are free, with no mandatory AI subscription, key, paid download or hosted API.
- A **career profile** is a locally stored collection of experience and contact fields. It is **not** an account or hosted identity.

## Current data map

| Data | Storage | Persistence / deletion |
| --- | --- | --- |
| Career profile, experience, education, certifications, projects | Browser LocalStorage (`voca_career_profile_v1`) | Persists across sessions on that browser until manually cleared or browser storage is wiped |
| Legacy experience/profile/sections keys | Browser LocalStorage (`work_experience_data`, `user_profile_data`, `resume_sections_data`) | Retained for safe migration; must be included in complete local deletion |
| Job description and rule-based analysis | Browser LocalStorage (`job_match_data`) | Persists in that browser and should be removed by complete local deletion |
| Selected files / generated resume downloads | Browser memory and local download | Do not persist the raw upload or generated output to an application server; download goes to the user's chosen device location |
| Optional future AI API keys | In-memory by default | No persistent storage without a separate user choice and security review |

**Important:** LocalStorage is not encrypted and can be accessed by JavaScript operating under the same origin. Use browser/device security; do not enter data on an untrusted shared device. Browser storage is origin-specific, may be deleted by browser settings or private-mode termination, and does **not** automatically sync across devices.

## Operational rules

1. No Voca backend, database, object store, CDN, analytics or error-reporting endpoint should retain uploaded resumes, personal career information, job descriptions, or filenames.
2. Browser file imports should validate extension, MIME type and, where feasible, magic bytes; apply size, page, memory and processing-time limits; reject malformed files.
3. Treat resume files as untrusted; parse locally where feasible, never interpolate content into executable HTML, and disclose OCR/server-processing limitations honestly.
4. Dispose of temporary File/Blob references and object URLs after use, cancellation, errors, replacement and unmount. Never log document bodies, access tokens, passwords or provider keys.
5. Saving/restoring canonical records must validate data and avoid overwriting valid records with malformed input. Show a preview and explicit confirmation before replacing data.
6. Provide user-controlled JSON backup/restore and clear-all local-data controls. Clearing app data must include **legacy keys and job matches**, not just the canonical profile.
7. For any future optional cloud sync, conduct an explicit security, encryption, threat-model, data-retention and consent review first. Do not silently change core storage semantics.
8. For optional AI processing, explain which fields and external provider will receive data before each transfer. Never invent career claims.
9. CI includes unit/build checks, desktop/mobile browser tests, deployment verification and a separate dependency-audit report. The audit initially reports known vulnerabilities rather than automatically upgrading potentially breaking transitive dependencies.

## Source transparency

The repository is MIT licensed; follow CONTRIBUTING.md and SECURITY.md. Contributions must use synthetic career examples. Any feature needing a server or cross-device persistence requires a separate issue, scope review and explicit opt-in, without blocking the free local core.
