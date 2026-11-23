# Editable DOCX export

Download DOCX from Resume Builder, or Download draft DOCX from Tailor. Choose A4 or Letter independently of the PDF settings. No login, API key, upload or network request is required for generation; no new package dependency is added.

The document contains editable Unicode paragraphs in a standard single-column layout, with section and entry headings, normal text, line breaks and tabs. All supported career sections follow the same reading order as the text PDF. Bullet markers are editable text, not automatic Word list numbering. Links are plain text. The selected visual PDF template is not reproduced. Editor fonts, script shaping and pagination can differ; review the document in your editor before submitting an application.

Draft export reads the current version, including accepted suggestions and manual edits. Pending/rejected suggestions, job descriptions, evidence, review history and the original source snapshot are not embedded. Export does not save or modify the draft or master profile. Save draft separately to retain changes in Voca; edits made in Word do not sync back automatically.

## Limits and format

The export supports up to 200,000 text characters. Empty resumes, invalid XML 1.0 characters and unsupported paper sizes fail visibly without download. Resume text is XML-escaped; the package has no macros, images, external relationships or embedded metadata. Fonts are not embedded. A bounded stored ZIP uses the existing zip.js dependency and standard OOXML document/styles parts.

The format follows Microsoft's [WordprocessingML document structure](https://learn.microsoft.com/en-us/office/open-xml/word/structure-of-a-wordprocessingml-document). Automated checks validate XML, package CRCs/relationships, page settings, Unicode, text order, long content, draft decisions, local re-import and source preservation on desktop/mobile. Direct Word/Google Docs visual compatibility testing remains a manual release check; tests do not guarantee identical rendering in those editors.

Cloudflare activation remains paused in #38. Next product work: JD requirement/evidence mapping, then skills review. Broader text-PDF fonts and dependency remediation (#23) remain open.
