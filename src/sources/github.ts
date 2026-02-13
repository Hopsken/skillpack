import { ghJson } from '../util/http.js';
import * as semver from 'semver';

interface GitTag {
  name: string;
  commit: { sha: string };
}

interface RepoInfo {
  default_branch: string;
}

interface CommitInfo {
  sha: string;
}

export async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  const info = await ghJson<RepoInfo>(
    `https://api.github.com/repos/${owner}/${repo}`,
  );
  return info.default_branch;
}

export async function getBranchHeadSha(owner: string, repo: string, branch: string): Promise<string> {
  const info = await ghJson<CommitInfo>(
    `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`,
  );
  return info.sha;
}

export async function getTags(owner: string, repo: string): Promise<GitTag[]> {
  const tags: GitTag[] = [];
  let page = 1;
  while (true) {
    const batch = await ghJson<GitTag[]>(
      `https://api.github.com/repos/${owner}/${repo}/tags?per_page=100&page=${page}`,
    );
    if (batch.length === 0) break;
    tags.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return tags;
}

export async function resolveVersionRange(
  owner: string,
  repo: string,
  range: string,
): Promise<{ version: string; sha: string } | null> {
  // Direct commit SHA
  if (/^[0-9a-f]{7,40}$/.test(range)) {
    const info = await ghJson<CommitInfo>(
      `https://api.github.com/repos/${owner}/${repo}/commits/${range}`,
    );
    return { version: range, sha: info.sha };
  }

  const tags = await getTags(owner, repo);
  const versions = tags
    .map(t => ({
      raw: t.name,
      clean: semver.clean(t.name) || t.name.replace(/^v/, ''),
      sha: t.commit.sha,
    }))
    .filter(v => semver.valid(v.clean));

  const matched = semver.maxSatisfying(
    versions.map(v => v.clean),
    range,
  );

  if (!matched) return null;

  const entry = versions.find(v => v.clean === matched)!;
  return { version: matched, sha: entry.sha };
}

export async function validatePathExists(
  owner: string,
  repo: string,
  sha: string,
  path: string,
): Promise<boolean> {
  try {
    await ghJson(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${sha}`,
    );
    return true;
  } catch {
    return false;
  }
}

export function tarballUrl(owner: string, repo: string, ref: string): string {
  return `https://api.github.com/repos/${owner}/${repo}/tarball/${ref}`;
}
