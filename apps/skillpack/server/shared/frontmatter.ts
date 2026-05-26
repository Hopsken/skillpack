import { parse as parseYaml } from "yaml";

/**
 * Minimal frontmatter parser. Only supports YAML with the `---` delimiter.
 * Does not support `---js` / `---javascript`.
 */
export const parseFrontmatter = (
  raw: string
): {
  content: string;
  data: Record<string, unknown>;
} => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/u);

  if (!match) {
    return { content: raw, data: {} };
  }

  const data = (parseYaml(match[1] ?? "") as Record<string, unknown>) ?? {};

  return { content: match[2] ?? "", data };
};
