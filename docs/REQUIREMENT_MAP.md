# Job requirements and evidence

In Tailor, open or create a draft and use **Job requirements and evidence**:

1. Choose a JD line or paste an exact requirement passage, then Add requirement. Line suggestions are not automatic requirement extraction; review headings, benefits and other nonrequirements yourself.
2. Set the priority (required, preferred or unspecified).
3. Link up to five passages from the original resume. Read the complete passage below the selector; option labels show only the first 180 characters.
4. Mark the item supported, partial or a gap, and optionally add a review note. Supported/partial assessments require linked evidence. A gap requires no linked evidence. Adding or removing evidence resets the assessment to unreviewed.
5. Save draft. The checklist and notes persist through reopen and full JSON backup/restore. Remove requirement deletes a checklist row; save again to persist deletion.

This is a manual local assessment, not an ATS score, a claim that requirements are met, or an AI analysis. A gap means no supporting evidence is linked here; it does not prove the person lacks a skill. Unreviewed items are counted separately. Nothing is sent to a provider, and Cloudflare activation remains paused in #38.

## Source and export guarantees

JD quotes must be exact nonempty substrings of this draft's JD. Evidence references bind to blocks in the immutable original source snapshot, and the full quoted text must match that block. Evidence includes supported resume sections; name/contact header blocks are excluded from the selector. Text within section content may itself contain personal details. Evidence is not inferred from newly generated wording. The user must judge relevance and completeness, including dates, years of experience and qualifications.

The checklist does not modify the original resume, current resume wording or master profile. PDF/DOCX exports contain resume content only, without requirements, assessment notes or evidence metadata. Full JSON backups do include this review data and the JD.

## Limits and compatibility

Up to 30 requirements, 2,000 characters per JD quote/note, and five evidence links per requirement. Eligible source blocks must be nonempty and at most 8,000 characters. The JD dropdown shows the first 100 unique nonempty lines of at most 2,000 characters; paste any other exact passage in the quote field. Duplicate IDs, duplicate quotes, invalid statuses, fabricated source references and invalid evidence/status combinations fail validation.

The optional `requirementMap` field is validated during draft saving and backup restore; older drafts remain readable. Editing current draft wording leaves source-based mapping intact. Changing evidence requires reassessment. Updating a checklist also invalidates any previously prepared AI prompt through existing draft-revision binding.

Tests cover validation, immutable source/current version, save/reopen, backup round trips and invalid backup rejection, desktop/mobile review flows, and actual DOCX exclusion of review-only content. Automatic extraction, semantic matching and skills tailoring remain later work; next priority is skills review through manual AI handoff.
