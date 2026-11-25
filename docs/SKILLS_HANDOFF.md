# Skills review with your AI chat

In Tailor, use **Review skills with your AI chat**:

1. Select 1–20 original-source passages. Summary, experience, projects and skills sections are eligible; contact header blocks are excluded. Each passage is limited to 8,000 characters. Review selected text for personal details.
2. Prepare and review the prompt, then copy it into your chosen AI chat. The prompt contains the JD, selected passages and existing skill names. Sharing is manual and your chat provider's policies apply; no API key or hosted relay is needed.
3. Paste the JSON response. Up to 20 suggestions import as pending, regardless of provider-supplied decisions. An empty list means no additional skills were suggested.
4. Accept, edit or reject each skill independently. Accepted/edited names are added to the draft's top-level Skills section. Edits must still be explicitly present in the quoted original evidence.
5. Save draft to retain additions, evidence and pending/completed decisions. These survive reopen and full JSON backup/restore. PDF/DOCX downloads include current approved additions, never pending/rejected additions or review metadata.

## Factual limits

Only literal, case-sensitive source mentions with word boundaries are allowed. This prevents suggestions based only on the JD and common truncated-token mistakes such as Java from JavaScript or C from C++. It does not establish proficiency: a passage could describe a desired skill, a teammate's work or a negation. Review context before accepting. Synonym expansion, inferred skills, renaming unsupported by the source, removing/reordering existing skills and skills API generation are outside this first version.

Existing top-level skills and experience-specific skills remain unchanged. A skill found in experience may be surfaced in the top-level list. Duplicate top-level names are compared case-insensitively. Source snapshots and the master profile remain unchanged. Original source text may still mention rejected suggestions in other sections; only approved additions enter the Skills section.

Names are limited to 100 characters on a single line; reasons to 2,000; prompt/response to 100,000; approved additions to 100. Unknown or unselected evidence, forged quotes, duplicate suggestions, malformed responses and stale request bindings fail before applying changes. Changes to the draft invalidate a prepared prompt. New batches require resolving pending suggestions and replace the latest review cards while retaining approved additions and their evidence; this is not a full suggestion history.

## Validation and follow-up

Unit tests cover literal evidence, duplicates, truncated tokens, malformed/stale responses, pending review, edits, source preservation, batch continuity, saving, backup round trips, invalid restores and legacy drafts. Desktop/mobile tests cover individual decisions, reopened pending/completed review, stale prompts and actual PDF/DOCX Skills content.

Cloudflare activation remains paused in #38. Next suggested work: AI-assisted extraction of JD requirements into the existing review checklist, retaining exact JD quotes and mandatory review. Broader semantic fact checking and additional providers remain open.
