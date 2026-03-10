import { collectSkillFiles, loadSkill } from "./_lib/skills.mjs";

const skillFiles = await collectSkillFiles();

for (const skillFile of skillFiles) {
  const skill = await loadSkill(skillFile);
  const prefix = skill.isTemplate ? "template" : "skill";
  console.log(
    `${prefix}\t${skill.frontmatter.name}\t${skill.frontmatter.description}\t${skill.relativePath}`,
  );
}
