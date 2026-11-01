import React, { useEffect, useRef, useState } from "react";
import Button from "../common/Button";
import { finalizeResumeImport, readResumeFile } from "../../utils/resumeImport";

const fieldLabels = { position: "Role", company: "Company", description: "Description", startDate: "Start date", endDate: "End date", location: "Location", degree: "Degree", institution: "Institution", startYear: "Start year", endYear: "End year", gpa: "Grade" };

const fieldStyle =
  "mt-1 block w-full rounded border border-gray-300 bg-white p-2 text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-gray-100";
const Field = ({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
}) => (
  <label className="block text-sm font-medium">
    {label}
    {multiline ? (
      <textarea
        className={fieldStyle}
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    ) : (
      <input
        className={fieldStyle}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )}
  </label>
);

export default function ResumeImport({ onSave, onBackup, current }) {
  const [review, setReview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const request = useRef(0);
  const heading = useRef(null);
  useEffect(
    () => () => {
      request.current += 1;
    },
    [],
  );
  const reviewing = Boolean(review);
  useEffect(() => {
    if (reviewing) heading.current?.focus();
  }, [reviewing]);

  const cancel = () => {
    request.current += 1;
    setReview(null);
    setBusy(false);
    setError("");
  };
  const select = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    const id = ++request.current;
    setReview(null);
    setError("");
    setSuccess(false);
    if (!file) {
      setBusy(false);
      return;
    }
    setBusy(true);
    try {
      const result = await readResumeFile(file);
      if (id === request.current) setReview(result);
    } catch (failure) {
      if (id === request.current)
        setError(
          failure.message ||
            "Could not read the resume. Try another plain-text file.",
        );
    } finally {
      if (id === request.current) setBusy(false);
    }
  };
  const updateProfile = (key, value) =>
    setReview((valueNow) => ({
      ...valueNow,
      draft: {
        ...valueNow.draft,
        profile: { ...valueNow.draft.profile, [key]: value },
      },
    }));
  const updateEntry = (key, index, field, value) =>
    setReview((valueNow) => ({
      ...valueNow,
      draft: {
        ...valueNow.draft,
        [key]: valueNow.draft[key].map((entry, i) =>
          i === index ? { ...entry, [field]: value } : entry,
        ),
      },
    }));
  const addEntry = (key) => {
    const id = `txt-manual-${Date.now()}-${Math.random()}`;
    const entry =
      key === "experiences"
        ? {
            id,
            position: "",
            company: "",
            description: "",
            startDate: "",
            endDate: "",
            current: false,
            location: "",
            skills: [],
            achievements: [],
          }
        : {
            id,
            degree: "",
            institution: "",
            startYear: "",
            endYear: "",
            location: "",
            gpa: "",
          };
    setReview((value) => ({
      ...value,
      draft: { ...value.draft, [key]: [...value.draft[key], entry] },
    }));
  };
  const save = () => {
    setError("");
    try {
      const candidate = finalizeResumeImport(review.draft, review.remaining);
      if (
        !window.confirm(
          "Replace ALL career profile details, experience, education, projects, certifications, skills, languages and volunteering with this reviewed import? Download a full backup first if needed.",
        )
      )
        return;
      if (onSave(candidate)) {
        setReview(null);
        setSuccess(true);
      } else
        setError(
          "Could not save the import. Your previous profile is preserved. Download a backup and check browser storage before retrying.",
        );
    } catch (failure) {
      setError(failure.message);
    }
  };

  return (
    <section
      aria-label="Import a text resume"
      className="mb-8 rounded-xl border border-gray-200 bg-white p-5 text-gray-800 shadow-sm dark:border-gray-700 dark:bg-slate-800 dark:text-gray-100"
    >
      <h2 className="text-lg font-semibold">Import Resume</h2>
      <p className="my-2 text-sm">
        Choose a UTF-8 .txt file, up to 1 MiB. Review before saving. Processing
        stays on this device; no login or upload to a server.
      </p>
      <label className="block text-sm font-medium">
        Choose TXT resume
        <input
          className="my-3 block w-full max-w-full text-sm"
          type="file"
          accept=".txt,text/plain"
          onChange={select}
        />
      </label>
      {busy && (
        <div role="status">
          Reading resume…{" "}
          <Button variant="secondary" onClick={cancel}>
            Cancel Import
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="my-3 text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      {success && (
        <p role="status">
          Resume imported. You can edit it below and download your PDF.
        </p>
      )}
      {review && (
        <div className="space-y-4">
          <h3 ref={heading} tabIndex={-1} className="font-semibold">
            Review resume before replacing your data
          </h3>
          <p className="text-sm">
            Extraction is limited: labelled contact fields, Summary headings,
            and blank-line-separated entries headed “Role | Company” or “Degree
            | Institution”. Dates and other uncertain details are not guessed.
            Check every field. Unmapped text is included in your summary unless
            you move or remove it.
          </p>
          <details>
            <summary className="cursor-pointer">
              Original text (for reference)
            </summary>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-sm">
              {review.source}
            </pre>
          </details>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["fullName", "Import name"],
              ["headline", "Import headline"],
              ["email", "Import email"],
              ["phone", "Import phone"],
              ["location", "Import location"],
            ].map(([key, label]) => (
              <Field
                key={key}
                label={label}
                value={review.draft.profile[key]}
                onChange={(value) => updateProfile(key, value)}
              />
            ))}
          </div>
          <Field
            label="Import summary"
            multiline
            value={review.draft.profile.summary}
            onChange={(value) => updateProfile("summary", value)}
          />
          {["experiences", "education"].map((key) => (
            <div key={key} className="space-y-3">
              <h4 className="font-semibold">
                {key === "experiences" ? "Experience" : "Education"} (
                {review.draft[key].length})
              </h4>
              {review.draft[key].map((entry, index) => (
                <fieldset
                  key={entry.id}
                  className="space-y-3 rounded border p-3"
                >
                  <legend>
                    {key === "experiences" ? "Experience" : "Education"}{" "}
                    {index + 1}
                  </legend>
                  {(key === "experiences"
                    ? [
                        "position",
                        "company",
                        "description",
                        "startDate",
                        "endDate",
                        "location",
                      ]
                    : [
                        "degree",
                        "institution",
                        "startYear",
                        "endYear",
                        "location",
                        "gpa",
                      ]
                  ).map((field) => (
                    <Field
                      key={field}
                      label={`${key === "experiences" ? "Experience" : "Education"} ${index + 1}: ${fieldLabels[field]}`}
                      type={field.endsWith("Date") ? "date" : "text"}
                      multiline={field === "description"}
                      value={entry[field]}
                      onChange={(value) =>
                        updateEntry(key, index, field, value)
                      }
                    />
                  ))}
                  {key === "experiences" && (
                    <label className="block">
                      <input
                        type="checkbox"
                        checked={entry.current}
                        onChange={(e) =>
                          updateEntry(key, index, "current", e.target.checked)
                        }
                      />{" "}
                      Currently working here
                    </label>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setReview((value) => ({
                        ...value,
                        draft: {
                          ...value.draft,
                          [key]: value.draft[key].filter((_, i) => i !== index),
                        },
                      }))
                    }
                  >
                    Remove {key === "experiences" ? "experience" : "education"}{" "}
                    {index + 1}
                  </Button>
                </fieldset>
              ))}
              <Button variant="secondary" onClick={() => addEntry(key)}>
                Add import {key === "experiences" ? "experience" : "education"}
              </Button>
            </div>
          ))}
          <Field
            label="Unmapped text (included in summary)"
            multiline
            value={review.remaining}
            onChange={(remaining) =>
              setReview((value) => ({ ...value, remaining }))
            }
          />
          <p className="rounded border border-amber-400 p-3 text-sm">
            This replaces your entire saved career profile (
            {current.profile.fullName || "unnamed"},{" "}
            {current.experiences.length} experiences, {current.education.length}{" "}
            education entries, {current.projects.length} projects,{" "}
            {current.certifications.length} certifications,{" "}
            {current.skills.length} skills, {current.languages.length}{" "}
            languages, {current.volunteering.length} volunteering entries). The
            import contains {review.draft.experiences.length} experiences and{" "}
            {review.draft.education.length} education entries; other collections
            will be empty. Job matches are unchanged.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={onBackup}>
              Back Up Before Import
            </Button>
            <Button onClick={save}>Confirm Resume Import</Button>
            <Button variant="secondary" onClick={cancel}>
              Cancel Import
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
