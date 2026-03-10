import { collectSkillFiles, loadSkill, validateSkill } from "./_lib/skills.mjs";

const skillFiles = await collectSkillFiles();
const failures = [];

for (const skillFile of skillFiles) {
  try {
    const skill = await loadSkill(skillFile);
    failures.push(...validateSkill(skill));
  } catch (error) {
    failures.push(`${skillFile}: ${error.message}`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  process.exit(1);
}

console.log(`validated ${skillFiles.length} skill files`);
