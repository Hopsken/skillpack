import type { SkillSpecifier } from '../types.js';

/**
 * Parse a single skill specifier (no batch expansion).
 *
 * Grammar:
 *   file:<path>
 *   owner/repo
 *   owner/repo@<version|sha>
 *   owner/repo#skill-name
 *   owner/repo#skill-name@<version|sha>
 */
export function parseSpecifier(input: string): SkillSpecifier {
  if (input.startsWith('file:')) {
    return { type: 'local', localPath: input.slice(5) };
  }

  let remaining = input;
  let versionRange: string | undefined;

  // Extract version — last `@` that appears after the first `/`
  const slashIdx = remaining.indexOf('/');
  if (slashIdx === -1) throw new Error(`Invalid specifier (missing owner/repo): ${input}`);

  const afterSlash = remaining.slice(slashIdx);
  const atIdx = afterSlash.lastIndexOf('@');
  if (atIdx > 0) {
    versionRange = afterSlash.slice(atIdx + 1);
    remaining = remaining.slice(0, slashIdx + atIdx);
  }

  // Extract skill name — first `#`
  let skillName: string | undefined;
  const hashIdx = remaining.indexOf('#');
  if (hashIdx !== -1) {
    skillName = remaining.slice(hashIdx + 1);
    remaining = remaining.slice(0, hashIdx);
  }

  const parts = remaining.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid specifier (bad owner/repo): ${input}`);
  }

  return {
    type: 'github',
    owner: parts[0],
    repo: parts[1],
    skillName,
    versionRange,
  };
}

/**
 * Expand batch specifiers.
 * owner/repo#a#b@version → [owner/repo#a@version, owner/repo#b@version]
 */
export function expandBatchSpecifier(input: string): string[] {
  if (input.startsWith('file:')) return [input];

  // Extract version
  let base = input;
  let versionSuffix = '';

  const slashIdx = base.indexOf('/');
  if (slashIdx === -1) return [input];

  const afterSlash = base.slice(slashIdx);
  const atIdx = afterSlash.lastIndexOf('@');
  if (atIdx > 0) {
    versionSuffix = afterSlash.slice(atIdx); // includes @
    base = base.slice(0, slashIdx + atIdx);
  }

  // Split on #
  const hashIdx = base.indexOf('#');
  if (hashIdx === -1) return [input];

  const repoBase = base.slice(0, hashIdx);
  const skills = base.slice(hashIdx + 1).split('#');

  if (skills.length <= 1) return [input];

  return skills.map(s => `${repoBase}#${s}${versionSuffix}`);
}

export function serializeSpecifier(spec: SkillSpecifier): string {
  if (spec.type === 'local') return `file:${spec.localPath}`;
  let result = `${spec.owner}/${spec.repo}`;
  if (spec.skillName) result += `#${spec.skillName}`;
  if (spec.versionRange) result += `@${spec.versionRange}`;
  return result;
}

export function deriveSkillName(spec: SkillSpecifier): string {
  if (spec.type === 'local') {
    const parts = spec.localPath!.split('/');
    return parts[parts.length - 1];
  }
  return spec.skillName || spec.repo!;
}
