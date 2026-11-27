// Indexes refer to immutable source skills followed by reviewed additions.
// Keep object-valued skills intact, including their original metadata.
export const defaultSkillOrder = skills => skills.map((_, index) => index);
export function validSkillOrder(order, skills) {
  return order === undefined || (Array.isArray(order) && order.length === skills.length
    && new Set(order).size === skills.length
    && order.every(index => Number.isSafeInteger(index) && index >= 0 && index < skills.length));
}
export function orderedSkills(skills, order) {
  if (!validSkillOrder(order, skills)) throw new Error('Skill order must contain each existing skill exactly once.');
  return (order ?? defaultSkillOrder(skills)).map(index => skills[index]);
}
export function moveSkill(review, position, direction) {
  const skills = review.version.skills;
  const order = [...(review.skillOrder ?? defaultSkillOrder(skills))];
  if (!validSkillOrder(order, skills) || !Number.isSafeInteger(position)
    || ![-1, 1].includes(direction) || position < 0 || position >= skills.length
    || position + direction < 0 || position + direction >= skills.length) throw new Error('Choose a skill that can move in that direction.');
  const nextSkills = [...skills];
  [order[position], order[position + direction]] = [order[position + direction], order[position]];
  [nextSkills[position], nextSkills[position + direction]] = [nextSkills[position + direction], nextSkills[position]];
  return { ...review, skillOrder: order, version: { ...review.version, skills: nextSkills } };
}
