import React, { useState } from 'react';
import { moveSkill } from '../../utils/skillOrder';
import { skillsWithAdditions } from '../../utils/skillsHandoff';

export default function SkillOrder({ review, onChange }) {
  const [notice, setNotice] = useState('');
  const skills = review.version.skills;
  function move(index, direction) {
    onChange(moveSkill(review, index, direction));
    setNotice(`Skill moved to position ${index + direction + 1}.`);
  }
  return <section aria-label="Skill priority" className="space-y-3 rounded border p-4">
    <h3 className="text-lg font-semibold">Prioritize skills for this job</h3>
    <p>Move the most relevant skills higher. This order appears in the draft preview and downloads. Your original profile stays unchanged.</p>
    {!skills.length && <p>No skills yet. Add source-supported skills using Skills tailoring above, or start with a profile that includes skills.</p>}
    <ol className="space-y-2">{skills.map((skill, index) => <li key={review.skillOrder?.[index] ?? index} className="flex flex-wrap items-center gap-3">
      <span>{index + 1}. {typeof skill === 'string' ? skill : skill.name}</span>
      <button className="rounded border px-3 py-2 disabled:opacity-50" aria-label={`Move skill ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}>Move up</button>
      <button className="rounded border px-3 py-2 disabled:opacity-50" aria-label={`Move skill ${index + 1} down`} disabled={index === skills.length - 1} onClick={() => move(index, 1)}>Move down</button>
    </li>)}</ol>
    {review.skillOrder && <button className="underline" onClick={() => {
      const { skillOrder, ...rest } = review;
      onChange({ ...rest, version: { ...review.version, skills: skillsWithAdditions(review.source, review.skillAdditions) } });
      setNotice('Original skill order restored; reviewed additions follow source skills.');
    }}>Reset skill order</button>}
    <p role="status" aria-live="polite">{notice}</p>
  </section>;
}
