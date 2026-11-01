import { createEmptyCareerProfile } from "./careerProfile";

export const RESUME_IMPORT_MAX_BYTES = 1024 * 1024;

export async function readResumeFile(file) {
  if (!/\.txt$/i.test(file.name))
    throw new Error(
      "Choose a UTF-8 .txt resume. PDF and DOCX are not supported yet.",
    );
  if (!file.size) throw new Error("The resume file is empty.");
  if (file.size > RESUME_IMPORT_MAX_BYTES)
    throw new Error("Choose a resume no larger than 1 MiB.");
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(
      await file.arrayBuffer(),
    );
  } catch {
    throw new Error(
      "Could not read UTF-8 text. Save your resume as UTF-8 plain text and try again.",
    );
  }
  return parseResumeText(text);
}

/** Only explicit labels and unambiguous pipe-separated entries are mapped.
 * Unmapped content remains editable and is included in the summary by default.
 * No storage, network, HTML interpretation or invented dates/qualifications.
 */
export function parseResumeText(text) {
  if (typeof text !== "string" || !text.trim())
    throw new Error("The resume file is empty.");
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(text))
    throw new Error(
      "This file contains binary data. Choose a plain-text resume.",
    );
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const draft = createEmptyCareerProfile();
  const sections = { contact: [], summary: [], experiences: [], education: [] };
  const headings = {
    summary: "summary",
    "professional summary": "summary",
    profile: "summary",
    experience: "experiences",
    "work experience": "experiences",
    "professional experience": "experiences",
    education: "education",
  };
  let section = "contact";
  source.split("\n").forEach((line) => {
    const heading = line.trim().replace(/:$/, "").toLowerCase();
    if (Object.prototype.hasOwnProperty.call(headings, heading))
      section = headings[heading];
    else sections[section].push(line);
  });
  const remaining = [];
  const labels = {
    name: "fullName",
    "full name": "fullName",
    email: "email",
    phone: "phone",
    location: "location",
    headline: "headline",
  };
  sections.contact.forEach((line) => {
    const match = line.match(/^\s*([^:]+):\s*(.+)$/);
    const label = match?.[1].toLowerCase().trim();
    const key = Object.prototype.hasOwnProperty.call(labels, label)
      ? labels[label]
      : null;
    if (key && !draft.profile[key]) draft.profile[key] = match[2].trim();
    else if (
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line.trim()) &&
      !draft.profile.email
    )
      draft.profile.email = line.trim();
    else remaining.push(line);
  });
  draft.profile.summary = sections.summary.join("\n").trim();
  ["experiences", "education"].forEach((key) => {
    const blocks = sections[key]
      .join("\n")
      .trim()
      .split(/\n\s*\n/);
    blocks.forEach((block, index) => {
      if (!block.trim()) return;
      const [header, ...body] = block.split("\n");
      const parts = header.split("|").map((part) => part.trim());
      if (parts.length !== 2 || parts.some((part) => !part)) {
        remaining.push(block);
      } else if (key === "experiences") {
        draft.experiences.push({
          id: `txt-experience-${index}`,
          position: parts[0],
          company: parts[1],
          description: body.join("\n").trim(),
          startDate: "",
          endDate: "",
          current: false,
          location: "",
          skills: [],
          achievements: [],
        });
      } else {
        draft.education.push({
          id: `txt-education-${index}`,
          degree: parts[0],
          institution: parts[1],
          startYear: "",
          endYear: "",
          location: "",
          gpa: "",
        });
        remaining.push(...body);
      }
    });
  });
  return { draft, source, remaining: remaining.join("\n").trim() };
}

export function finalizeResumeImport(draft, remaining) {
  if (!draft.profile.fullName.trim() && !draft.profile.email.trim())
    throw new Error("Add a name or email before importing.");
  return {
    ...draft,
    profile: {
      ...draft.profile,
      summary: [draft.profile.summary.trim(), remaining.trim()]
        .filter(Boolean)
        .join("\n\n"),
    },
  };
}
