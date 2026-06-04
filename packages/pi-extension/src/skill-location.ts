export interface SkillpackLocation {
  skillName: string;
}

export interface SkillpackCatalogItem {
  description: string;
  name: string;
}

const skillpackProtocol = "skill:";
const skillpackHost = "skillpack";
const skillNamePattern = /^(?=.*[a-z])[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const parseSkillName = (value: string) => {
  if (!skillNamePattern.test(value)) {
    throw new Error("Expected skill://skillpack/{skillName}");
  }

  return value;
};

export const toSkillpackLocation = (skillName: string) =>
  `skill://skillpack/${skillName}`;

export const parseSkillpackLocation = (location: string): SkillpackLocation => {
  let url: URL;

  try {
    url = new URL(location);
  } catch {
    throw new Error("Expected skill://skillpack/{skillName}");
  }

  if (
    url.protocol !== skillpackProtocol ||
    url.hostname !== skillpackHost ||
    url.search !== ""
  ) {
    throw new Error("Expected skill://skillpack/{skillName}");
  }

  return {
    skillName: parseSkillName(url.pathname.replace(/^\//u, "")),
  };
};

export const formatSkillpackCatalog = (skills: SkillpackCatalogItem[]) => {
  if (skills.length === 0) {
    return "";
  }

  const lines = [
    "",
    "The following Skillpack Managed Skills are available through Skill Delivery.",
    "When a task matches a Skillpack skill, call skillpack_read with its skill:// location.",
    "Use skillpack_read with a resource path to read attached references, scripts, and assets.",
    "",
    "<skillpack_skills>",
  ];

  for (const skill of skills) {
    lines.push("  <skill>");
    lines.push(`    <name>${escapeXml(skill.name)}</name>`);
    lines.push(
      `    <description>${escapeXml(skill.description)}</description>`
    );
    lines.push(`    <location>${toSkillpackLocation(skill.name)}</location>`);
    lines.push("  </skill>");
  }

  lines.push("</skillpack_skills>");
  return lines.join("\n");
};
