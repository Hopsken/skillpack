export interface SkillpackLocation {
  skillName: string;
  version?: number;
}

export interface SkillpackCatalogItem {
  currentVersion: number;
  description: string;
  name: string;
}

const skillpackProtocol = "skill:";
const skillpackHost = "skillpack";
const skillNamePattern = /^(?=.*[a-z])[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const versionPattern = /^[1-9]\d*$/u;

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

const parsePositiveInteger = (value: string, message: string) => {
  if (!versionPattern.test(value)) {
    throw new Error(message);
  }

  return Number(value);
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

  if (url.protocol !== skillpackProtocol || url.hostname !== skillpackHost) {
    throw new Error("Expected skill://skillpack/{skillName}");
  }

  const skillName = parseSkillName(url.pathname.replace(/^\//u, ""));
  const rawVersion = url.searchParams.get("version");

  return {
    skillName,
    version:
      rawVersion === null
        ? undefined
        : parsePositiveInteger(
            rawVersion,
            "Expected positive numeric Skill version"
          ),
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
    lines.push(
      `    <current_version>${skill.currentVersion}</current_version>`
    );
    lines.push("  </skill>");
  }

  lines.push("</skillpack_skills>");
  return lines.join("\n");
};
