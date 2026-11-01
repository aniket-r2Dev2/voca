import { TextDecoder } from "util";
import {
  finalizeResumeImport,
  parseResumeText,
  readResumeFile,
  RESUME_IMPORT_MAX_BYTES,
} from "../utils/resumeImport";
import { restoreCareerBackup } from "../utils/careerBackup";
import { CAREER_PROFILE_STORAGE_KEY } from "../utils/careerProfile";

global.TextDecoder = TextDecoder;
const file = (text, name = "resume.txt") => ({
  name,
  size: Buffer.byteLength(text),
  arrayBuffer: async () => Buffer.from(text),
});
const resume =
  "Name: Alex\r\nEmail: alex@example.com\r\nSummary\r\nBuilds tools.\r\nExperience\r\nEngineer | Example\r\nShipped services.\r\n\r\nLead | Other\r\nMentored team.\r\nEducation\r\nBSc | University\r\n2018–2022\r\n";

test("extracts only supported structure and preserves unmapped details", async () => {
  const result = await readResumeFile(file(resume));
  expect(result.draft.profile.fullName).toBe("Alex");
  expect(result.draft.experiences).toHaveLength(2);
  expect(result.draft.experiences[0]).toMatchObject({
    position: "Engineer",
    company: "Example",
    startDate: "",
    description: "Shipped services.",
  });
  expect(result.draft.education[0]).toMatchObject({
    degree: "BSc",
    institution: "University",
    startYear: "",
  });
  expect(result.remaining).toContain("2018–2022");
  expect(
    finalizeResumeImport(result.draft, result.remaining).profile.summary,
  ).toBe("Builds tools.\n\n2018–2022");
});

test.each(["", "  \n", "\u0000binary", "text\u0007"])(
  "rejects empty or binary text %p",
  (text) => {
    expect(() => parseResumeText(text)).toThrow();
  },
);

test("unknown formats and HTML stay literal, without guessed data", () => {
  const result = parseResumeText(
    "Alex Example\nExperience\nEngineer at Example\n<script>alert(1)</script>",
  );
  expect(result.draft.experiences).toEqual([]);
  expect(result.draft.profile.fullName).toBe("");
  expect(result.remaining).toContain("<script>alert(1)</script>");
  expect(() => finalizeResumeImport(result.draft, result.remaining)).toThrow(
    "name or email",
  );
});

test("rejects unsupported, oversized and invalid UTF-8 files before import", async () => {
  await expect(readResumeFile(file("text", "resume.pdf"))).rejects.toThrow(
    ".txt",
  );
  await expect(
    readResumeFile({ name: "resume.txt", size: RESUME_IMPORT_MAX_BYTES + 1 }),
  ).rejects.toThrow("1 MiB");
  await expect(
    readResumeFile({
      name: "resume.txt",
      size: 2,
      arrayBuffer: async () => new Uint8Array([0xff, 0xff]),
    }),
  ).rejects.toThrow("UTF-8");
  await expect(
    readResumeFile({
      name: "resume.txt",
      size: 2,
      arrayBuffer: async () => {
        throw new Error();
      },
    }),
  ).rejects.toThrow("Could not read");
});

test("accepts the exact byte limit and uppercase extension", async () => {
  await expect(
    readResumeFile(file("a".repeat(RESUME_IMPORT_MAX_BYTES), "RESUME.TXT")),
  ).resolves.toHaveProperty("source");
});

test("a failed import write leaves the existing record unchanged", () => {
  const previous = "previous profile";
  const storage = {
    getItem: () => previous,
    setItem: jest.fn(() => {
      throw new Error("QuotaExceededError");
    }),
  };
  const { draft } = parseResumeText("Name: Alex");
  expect(() =>
    restoreCareerBackup(storage, finalizeResumeImport(draft, "")),
  ).toThrow();
  expect(storage.getItem(CAREER_PROFILE_STORAGE_KEY)).toBe(previous);
  expect(storage.setItem).toHaveBeenCalledTimes(1);
});

test("prototype property names are treated as ordinary text", () => {
  const result = parseResumeText(
    "constructor\n__proto__: literal\nSummary\nSafe text",
  );
  expect(result.remaining).toBe("constructor\n__proto__: literal");
});
