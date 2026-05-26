import { describe, expect, it, vi } from "vitest";

import { createGitHubRetrieval } from "./github-retrieval";
import type { GitHubTransport, GitHubTreeEntry } from "./github-retrieval";

const origin = {
  kind: "github" as const,
  repoUrl: "https://github.com/acme/skills",
};

const skillContent = (name: string, description = "A useful skill") => `---
name: ${name}
description: ${description}
---

# ${name}
`;

const treeEntry = (path: string): GitHubTreeEntry => ({
  path,
  sha: path,
  type: "blob",
});

const createTransport = (
  tree: GitHubTreeEntry[],
  files: Record<string, string>
) => {
  const transport = {
    getCommit: vi.fn<GitHubTransport["getCommit"]>().mockResolvedValue({
      commit: { tree: { sha: "tree-sha" } },
      sha: "commit-sha",
    }),
    getRawText: vi
      .fn<GitHubTransport["getRawText"]>()
      .mockImplementation((_owner, _repo, _revision, path) => {
        const content = files[path];

        if (content === undefined) {
          throw new Error(`Missing fixture for ${path}`);
        }

        return Promise.resolve(content);
      }),
    getRepository: vi.fn<GitHubTransport["getRepository"]>().mockResolvedValue({
      default_branch: "main",
    }),
    getTree: vi.fn<GitHubTransport["getTree"]>().mockResolvedValue({ tree }),
  };

  return transport;
};

describe("GitHub Origin retrieval", () => {
  it("discovers candidates in Skillpack priority order without reading raw files", async () => {
    const transport = createTransport(
      [
        treeEntry(".codex/skills/codex/SKILL.md"),
        treeEntry("skills/.system/system/SKILL.md"),
        treeEntry("skills/core/SKILL.md"),
        treeEntry("SKILL.md"),
        treeEntry("random/SKILL.md"),
        treeEntry(".agents/skills/agent/SKILL.md"),
      ],
      {}
    );
    const retrieval = createGitHubRetrieval(transport);

    const result = await retrieval.discover(origin);

    expect(result.candidates.map((candidate) => candidate.name)).toStrictEqual([
      "skills",
      "core",
      "system",
      "agent",
      "codex",
    ]);
    expect(result.resolvedOrigin).toStrictEqual({
      branch: "main",
      kind: "github",
      repoUrl: origin.repoUrl,
      rev: "commit-sha",
    });
    expect(transport.getRawText).not.toHaveBeenCalled();
  });

  it("uses fallback discovery when priority roots are empty", async () => {
    const transport = createTransport(
      [
        treeEntry("docs/reference/deep-skill/SKILL.md"),
        treeEntry("a/b/c/d/e/f/SKILL.md"),
      ],
      {}
    );
    const retrieval = createGitHubRetrieval(transport);

    const result = await retrieval.discover(origin);

    expect(result.candidates.map((candidate) => candidate.path)).toStrictEqual([
      "docs/reference/deep-skill/SKILL.md",
    ]);
  });

  it("keeps the first candidate when path-derived names duplicate", async () => {
    const transport = createTransport(
      [
        treeEntry("skills/demo/SKILL.md"),
        treeEntry(".agents/skills/demo/SKILL.md"),
      ],
      {}
    );
    const retrieval = createGitHubRetrieval(transport);

    const result = await retrieval.discover(origin);

    expect(result.candidates).toStrictEqual([
      {
        name: "demo",
        path: "skills/demo/SKILL.md",
        selection: { skillName: "demo" },
      },
    ]);
  });

  it("assembles a selected definition from frontmatter, resources, and provenance", async () => {
    const transport = createTransport(
      [
        treeEntry("skills/folder-name/SKILL.md"),
        treeEntry("skills/folder-name/references/notes.txt"),
        treeEntry("skills/folder-name/scripts/run.ts"),
      ],
      {
        "skills/folder-name/SKILL.md": skillContent(
          "frontmatter-name",
          "From frontmatter"
        ),
        "skills/folder-name/references/notes.txt": "notes",
        "skills/folder-name/scripts/run.ts": "export {};",
      }
    );
    const retrieval = createGitHubRetrieval(transport);

    const [result] = await retrieval.readDefinitions(origin, [
      { skillName: "folder-name" },
    ]);

    expect(result).toStrictEqual({
      definition: {
        allowedTools: null,
        compatibility: null,
        content: skillContent("frontmatter-name", "From frontmatter"),
        description: "From frontmatter",
        license: null,
        metadata: null,
        name: "frontmatter-name",
        provenance: {
          kind: "github",
          metadata: {
            branch: "main",
            resolvedSkillPath: "skills/folder-name/SKILL.md",
            rev: "commit-sha",
          },
          url: origin.repoUrl,
        },
        resources: [
          { content: "notes", path: "references/notes.txt" },
          { content: "export {};", path: "scripts/run.ts" },
        ],
        selection: { skillName: "folder-name" },
      },
      status: "resolved",
    });
  });

  it("reads selected definitions from a pinned revision", async () => {
    const transport = createTransport([treeEntry("skills/demo/SKILL.md")], {
      "skills/demo/SKILL.md": skillContent("demo"),
    });
    const retrieval = createGitHubRetrieval(transport);

    await retrieval.readDefinitions(
      { ...origin, branch: "main", rev: "pinned-sha" },
      [{ skillName: "demo" }]
    );

    expect(transport.getCommit).toHaveBeenCalledWith(
      "acme",
      "skills",
      "pinned-sha"
    );
  });

  it("fails a selected definition with missing frontmatter name or description", async () => {
    const transport = createTransport([treeEntry("skills/demo/SKILL.md")], {
      "skills/demo/SKILL.md": "# No frontmatter",
    });
    const retrieval = createGitHubRetrieval(transport);

    const [result] = await retrieval.readDefinitions(origin, [
      { skillName: "demo" },
    ]);

    expect(result).toMatchObject({
      error: "Skill frontmatter must include name and description",
      selection: { skillName: "demo" },
      status: "failed",
    });
  });

  it("fails a selected definition with unsupported resource extensions", async () => {
    const transport = createTransport(
      [
        treeEntry("skills/demo/SKILL.md"),
        treeEntry("skills/demo/assets/logo.png"),
      ],
      {
        "skills/demo/SKILL.md": skillContent("demo"),
      }
    );
    const retrieval = createGitHubRetrieval(transport);

    const [result] = await retrieval.readDefinitions(origin, [
      { skillName: "demo" },
    ]);

    expect(result).toMatchObject({
      error: "Unsupported resource type: assets/logo.png",
      selection: { skillName: "demo" },
      status: "failed",
    });
  });

  it("fails a selected definition with unsafe resource paths", async () => {
    const transport = createTransport(
      [
        treeEntry("skills/demo/SKILL.md"),
        treeEntry("skills/demo/bad\\path.txt"),
      ],
      {
        "skills/demo/SKILL.md": skillContent("demo"),
      }
    );
    const retrieval = createGitHubRetrieval(transport);

    const [result] = await retrieval.readDefinitions(origin, [
      { skillName: "demo" },
    ]);

    expect(result).toMatchObject({
      error: "Unsafe resource path: bad\\path.txt",
      selection: { skillName: "demo" },
      status: "failed",
    });
  });

  it("returns per-selection failures when the repo snapshot cannot load", async () => {
    const transport = createTransport([], {});
    transport.getRepository.mockRejectedValue(new Error("network down"));
    const retrieval = createGitHubRetrieval(transport);

    const results = await retrieval.readDefinitions(origin, [
      { skillName: "one" },
      { skillName: "two" },
    ]);

    expect(results).toStrictEqual([
      {
        error: "GitHub request failed",
        selection: { skillName: "one" },
        status: "failed",
      },
      {
        error: "GitHub request failed",
        selection: { skillName: "two" },
        status: "failed",
      },
    ]);
  });

  it("normalizes raw file read failures to definition failures", async () => {
    const transport = createTransport([treeEntry("skills/demo/SKILL.md")], {});
    const retrieval = createGitHubRetrieval(transport);

    const [result] = await retrieval.readDefinitions(origin, [
      { skillName: "demo" },
    ]);

    expect(result).toMatchObject({
      error: "GitHub raw file request failed",
      selection: { skillName: "demo" },
      status: "failed",
    });
  });
});
