import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(__dirname, "..", "..");
export const skillsRoot = path.join(repoRoot, "skills");

export async function collectSkillFiles(root = skillsRoot) {
  const skillFiles = [];

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);

      if (!entry.isDirectory()) {
        continue;
      }

      const skillFile = path.join(entryPath, "SKILL.md");

      try {
        await readFile(skillFile, "utf8");
        skillFiles.push(skillFile);
      } catch {
        await walk(entryPath);
      }
    }
  }

  await walk(root);
  return skillFiles.sort();
}

export async function loadSkill(skillFile) {
  const text = await readFile(skillFile, "utf8");
  const parsed = parseSkill(text);

  return {
    ...parsed,
    path: skillFile,
    folder: path.basename(path.dirname(skillFile)),
    relativePath: path.relative(repoRoot, skillFile),
    isTemplate: skillFile.includes(`${path.sep}_templates${path.sep}`),
  };
}

export function parseSkill(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    throw new Error("missing YAML frontmatter");
  }

  const [, frontmatterBlock, body] = match;
  const frontmatter = {};

  for (const rawLine of frontmatterBlock.split("\n")) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      continue;
    }

    if (/^\s/.test(rawLine)) {
      throw new Error(`frontmatter line must stay single-line and unindented: "${rawLine}"`);
    }

    const separator = line.indexOf(":");

    if (separator === -1) {
      throw new Error(`invalid frontmatter line: "${line}"`);
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    if (!key || !value) {
      throw new Error(`frontmatter key/value must be single-line: "${line}"`);
    }

    frontmatter[key] = value;
  }

  return {
    frontmatter,
    body,
  };
}

export function validateSkill(skill) {
  const errors = [];
  const { frontmatter, folder, isTemplate, relativePath } = skill;

  for (const field of ["name", "description"]) {
    if (!frontmatter[field]) {
      errors.push(`${relativePath}: missing required frontmatter field "${field}"`);
    }
  }

  if (!isTemplate && frontmatter.name && frontmatter.name !== folder) {
    errors.push(
      `${relativePath}: frontmatter name "${frontmatter.name}" should match folder "${folder}"`,
    );
  }

  if (frontmatter.metadata) {
    try {
      JSON.parse(frontmatter.metadata);
    } catch (error) {
      errors.push(`${relativePath}: metadata must be valid single-line JSON (${error.message})`);
    }
  }

  if (!skill.body.trim()) {
    errors.push(`${relativePath}: body is empty`);
  }

  return errors;
}
