# Experience-bullet tailoring

In **Tailor my resume**, prepare a draft from a profile or imported resume with structured experience entries. Under **Tailor experience bullets with your AI chat**, select up to 20 non-empty lines, prepare and inspect the prompt, then copy it into your chosen AI chat. Paste the JSON reply back into Voca.

Every suggestion shows its previous wording, suggested wording, explanation and a quote from its own original source bullet. Accept, edit or reject each one independently. Importing suggestions does not modify the draft. Only accepted wording and explicitly applied edits appear in the preview and PDF. The master profile and immutable source copy are unchanged. Pending and completed decisions survive saving, reloading and full JSON backup/restore.

## Scope and limits

- Each non-empty description line is one bullet; Voca does not guess sentence boundaries, add/reorder roles or insert/delete lines. Blank lines and untouched bullets are preserved.
- Select 1–20 bullets; each line and output field is at most 4,000 characters, each eligible experience description at most 20,000, and prompt/response at most 100,000 characters.
- Only selected original lines, their current draft wording, snapshot-specific entry/line identifiers and the JD are shared. Contact fields and structured employer/title/date fields are excluded; selected text can itself contain personal details, so review before copying.
- Responses must match the prepared request and unchanged draft. Unknown or duplicate targets, evidence from a different bullet, multiline output and altered numeric tokens are rejected. Returned acceptance flags or extra fields cannot alter the profile.
- Numerical-token checks do not prove semantic accuracy. They cannot detect every invented skill or reassigned achievement; the user must verify facts. Explicit user edits can change claims and are marked as edited.
- All pending suggestions must be resolved before a fresh batch. Importing a new batch replaces the previous review cards but retains approved draft text; this is not a complete history of all past batches.
- Skills tailoring, multi-line restructuring and automatic API experience generation remain future work. Existing API generation still targets summaries only. Cloudflare activation is paused in issue #38.

## Persistence and verification

Draft schema version 1 gains optional `experienceEdits` (description-only deltas by source entry index) and `experienceProposals` (the latest review batch, anchored to source entry/line IDs). Older drafts without these fields reopen unchanged. Save rejects changes to structured role/company/date fields or experience counts. Backup validation rejects invalid edit targets and proposal structures before restore.

Unit tests cover evidence isolation, stale responses, individual decisions, numeric/multiline/size validation, source protection, persistence and malformed backup rejection. Desktop/mobile browser checks cover pending-review persistence, accept/edit/reject, source protection and extracting approved wording from downloaded PDF files. These tests use synthetic AI replies and make no paid provider requests.
