export interface SkillpackLocation {
  skillId: number;
  version?: number;
}

export interface SkillpackCatalogItem {
  currentVersion: number;
  description: string;
  id: number;
  name: string;
}

const skillpackProtocol = "skill:";
const skillpackHost = "skillpack";

export const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const parsePositiveInteger = (value: string, message: string) => {
  if (!/^[1-9]\d*$/u.test(value)) {
    throw new Error(message);
  }

  return Number(value);
};

export const toSkillpackLocation = (skillId: number) =>
  `skill://skillpack/${skillId}`;

export const parseSkillpackLocation = (location: string): SkillpackLocation => {
  let url: URL;

  try {
    url = new URL(location);
  } catch {
    throw new Error("Expected skill://skillpack/{skillId}");
  }

  if (url.protocol !== skillpackProtocol || url.hostname !== skillpackHost) {
    throw new Error("Expected skill://skillpack/{skillId}");
  }

  const skillId = parsePositiveInteger(
    url.pathname.replace(/^\//u, ""),
    "Expected positive numeric Skill ID"
  );
  const rawVersion = url.searchParams.get("version");

  return {
    skillId,
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
    lines.push(`    <location>${toSkillpackLocation(skill.id)}</location>`);
    lines.push(
      `    <current_version>${skill.currentVersion}</current_version>`
    );
    lines.push("  </skill>");
  }

  lines.push("</skillpack_skills>");
  return lines.join("\n");
};
