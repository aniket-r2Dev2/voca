# AI-assisted JD requirement extraction

In Tailor, use **Extract requirements with your AI chat**:

1. Prepare and review the prompt. It contains the job description, existing requirement quotes and available checklist capacity. Resume content, linked evidence and review notes are excluded. Check the JD itself for sensitive information.
2. Copy the prompt into your chosen AI chat and paste its JSON response back. No automatic provider call or API key is involved; your chat provider's data policies apply when you share the text.
3. Review each exact JD quote, suggested priority and explanation. Accept it, edit its quote/priority, or reject it. Edits must remain exact contiguous JD quotes.
4. Accepted/edited requirements append to the existing checklist as **unreviewed**, with no evidence or notes. Acceptance means inclusion in your checklist, not that you meet the requirement. Link evidence and assess support in the checklist separately.
5. Save draft to persist pending/completed suggestions, checklist items, notes and assessments. Full JSON backup/restore also preserves them.

An empty response list leaves the checklist intact. Existing checklist rows and their evidence/assessments are never replaced by extraction. Resolve pending suggestions before another batch; a new batch replaces the previous suggestion cards but retains checklist items. Deleting a checklist row does not undo its historical suggestion decision; use the manual add control if it needs to be restored.

## Validation and limits

The response must match the prepared request and unchanged draft. Up to 30 checklist items total; imported suggestions cannot exceed remaining capacity. Quotes and explanations are limited to 2,000 characters each, JD to 30,000, and prompt/response to 100,000. Unknown priorities, empty/non-JD quotes, duplicates, malformed JSON and oversized/stale responses are rejected before changing review state. Decisions are forced to pending on import; provider-supplied evidence, status, decisions and other fields are ignored.

Accept/edit checks current checklist capacity and duplicate quotes/IDs again, so manual checklist changes after import cannot overwrite rows or overfill the list. Rejection remains possible when the checklist is full. Optional saved `requirementProposals` are validated on save and backup restore; older drafts remain readable.

Exact quoting does **not** guarantee a complete or correct requirement. An AI can omit qualifiers or negations by selecting too small a passage, misclassify priority, or mistake a benefit for a requirement. Compare with the full JD and check omissions. This feature does not assess applicant qualifications or produce an ATS score.

## Privacy, exports and tests

Extraction does not edit the source resume, master profile, current resume version, PDF or DOCX output. Suggestion metadata is included only in full JSON backups. Cloudflare activation remains paused in #38.

Tests cover privacy of prompts, forged/duplicate quotes, malformed and stale responses, pending decisions, edits, capacity conflicts, existing evidence preservation, empty results, saved draft/backup round trips and legacy compatibility. Desktop/mobile regression tests check the complete review/reopen flow and exclusion from actual DOCX downloads. No paid live-provider call is part of automated tests.
