import type { OriginService } from "@server/modules/origins/service";
import { describe, expect, it, vi } from "vitest";

import type { SkillRepository } from "./repository";
import type { ResourceManifest } from "./resource-manifest";
import { SkillService } from "./service";
import type {
  SkillResourceRow,
  SkillOriginRow,
  SkillRow,
  SkillVersionRow,
  StoredResourceObject,
} from "./types";

const createdAt = new Date("2026-05-25T12:00:00.000Z");
const updatedAt = new Date("2026-05-25T12:01:00.000Z");

const skillFileContent = `---
name: demo
description: Demo description
license: Apache-2.0
metadata:
  author: acme
allowed-tools: Read
---

# Demo
`;

const skillRow = (input?: Partial<SkillRow>): SkillRow => ({
  createdAt,
  id: input?.id ?? 1,
  name: input?.name ?? "demo",
  ownerUserId: input?.ownerUserId ?? "user-a",
  updatedAt,
});

const baseVersionRow: SkillVersionRow = {
  allowedTools: "Read",
  changeSummary: null,
  compatibility: null,
  createdAt,
  description: "Demo description",
  id: 10,
  label: null,
  license: "Apache-2.0",
  metadata: { author: "acme" },
  skillId: 1,
  versionNumber: 1,
};

const versionRow = (input?: Partial<SkillVersionRow>): SkillVersionRow => ({
  ...baseVersionRow,
  ...input,
});

const resourceRow = (input?: Partial<SkillResourceRow>): SkillResourceRow => ({
  createdAt,
  id: input?.id ?? 100,
  mediaType: input?.mediaType ?? "text/markdown; charset=utf-8",
  path: input?.path ?? "SKILL.md",
  sha256: input?.sha256 ?? "skill-md",
  size: input?.size ?? 120,
  skillVersionId: input?.skillVersionId ?? 10,
});

const originRow = (input?: Partial<SkillOriginRow>): SkillOriginRow => ({
  createdAt,
  id: input?.id ?? 1,
  kind: input?.kind ?? "github",
  metadata: input?.metadata ?? null,
  skillVersionId: input?.skillVersionId ?? 10,
  updatedAt,
  url: input?.url ?? "https://github.com/example/skills",
});

const storedResource = (
  input?: Partial<StoredResourceObject>
): StoredResourceObject => ({
  mediaType: input?.mediaType ?? "text/plain; charset=utf-8",
  path: input?.path ?? "references/notes.txt",
  sha256: input?.sha256 ?? "notes",
  size: input?.size ?? 12,
});

const objectWithText = (text: string) =>
  ({
    size: text.length,
    text: () => Promise.resolve(text),
  }) as R2ObjectBody;

const missingSkill = null as unknown as Awaited<
  ReturnType<SkillRepository["findSkillById"]>
>;

const originDefinition = (input?: {
  content?: string;
  name?: string;
  selectionName?: string;
}) => ({
  content: input?.content ?? skillFileContent,
  description: "Forked description",
  name: input?.name ?? "demo",
  provenance: {
    kind: "github" as const,
    metadata: { resolvedSkillPath: "skills/demo/SKILL.md" },
    url: "https://github.com/example/skills",
  },
  resources: [],
  selection: { skillName: input?.selectionName ?? input?.name ?? "demo" },
});

const createService = () => {
  const repository = {
    commitSkillVersion: vi.fn<SkillRepository["commitSkillVersion"]>(),
    createSkill: vi.fn<SkillRepository["createSkill"]>(),
    findLatestSkillVersion: vi.fn<SkillRepository["findLatestSkillVersion"]>(),
    findResourceByPath: vi.fn<SkillRepository["findResourceByPath"]>(),
    findSkillById: vi.fn<SkillRepository["findSkillById"]>(),
    findSkillByName: vi.fn<SkillRepository["findSkillByName"]>(),
    findSkillOrigin: vi.fn<SkillRepository["findSkillOrigin"]>(),
    findSkillVersionByNumber:
      vi.fn<SkillRepository["findSkillVersionByNumber"]>(),
    listResourcesByVersionId:
      vi.fn<SkillRepository["listResourcesByVersionId"]>(),
  };
  const resourceManifest = {
    createSnapshot: vi.fn<ResourceManifest["createSnapshot"]>(),
    getObjectBySha256: vi.fn<ResourceManifest["getObjectBySha256"]>(),
    getResourceObject: vi.fn<ResourceManifest["getResourceObject"]>(),
    patchSnapshot: vi.fn<ResourceManifest["patchSnapshot"]>(),
    storeSkillFile: vi.fn<ResourceManifest["storeSkillFile"]>(),
  };
  const originService = {
    readSkillDefinitions: vi.fn<OriginService["readSkillDefinitions"]>(),
  };

  return {
    originService,
    repository,
    resourceManifest,
    service: new SkillService(
      repository as unknown as SkillRepository,
      resourceManifest as unknown as ResourceManifest,
      originService as unknown as OriginService
    ),
  };
};

describe("SkillService version commit handoff", () => {
  it("treats skills outside the owner scope as not found", async () => {
    const { repository, service } = createService();

    repository.findSkillById.mockResolvedValue(missingSkill);

    await expect(service.resolveSkill(1)).rejects.toMatchObject({
      code: "skill-not-found",
    });
    expect(repository.findSkillById).toHaveBeenCalledWith(1);
  });

  it("resolves a skill by the owner's Skill Name", async () => {
    const { repository, resourceManifest, service } = createService();
    const skill = skillRow({ id: 9, name: "demo-skill" });
    const committedVersion = versionRow({
      id: 19,
      skillId: skill.id,
      versionNumber: 2,
    });

    repository.findSkillByName.mockResolvedValue(skill);
    repository.findSkillVersionByNumber.mockResolvedValue(committedVersion);
    repository.findSkillOrigin.mockResolvedValue(
      originRow({ skillVersionId: 19 })
    );
    repository.listResourcesByVersionId.mockResolvedValue([resourceRow()]);
    resourceManifest.getResourceObject.mockResolvedValue(
      objectWithText(skillFileContent)
    );

    const result = await service.resolveSkillByName("demo-skill", 2);

    expect(result.skill).toBe(skill);
    expect(result.version).toBe(committedVersion);
    expect(repository.findSkillByName).toHaveBeenCalledWith("demo-skill");
    expect(repository.findSkillVersionByNumber).toHaveBeenCalledWith(9, 2);
  });

  it("treats a missing Skill Name as not found", async () => {
    const { repository, service } = createService();

    repository.findSkillByName.mockResolvedValue(missingSkill);

    await expect(service.resolveSkillByName("missing")).rejects.toMatchObject({
      code: "skill-not-found",
    });
  });

  it("serializes canonical SKILL.md before committing the first version", async () => {
    const { repository, resourceManifest, service } = createService();
    const skill = skillRow();
    const committedVersion = versionRow();
    const manifest = [storedResource()];

    repository.createSkill.mockResolvedValue({
      skill,
      version: committedVersion,
    });
    resourceManifest.storeSkillFile.mockResolvedValue({
      mediaType: "text/markdown; charset=utf-8",
      path: "SKILL.md",
      sha256: "skill-md",
      size: 120,
    });
    resourceManifest.createSnapshot.mockResolvedValue(manifest);
    repository.findSkillById.mockResolvedValue(skill);
    repository.findLatestSkillVersion.mockResolvedValue(committedVersion);
    repository.findSkillOrigin.mockResolvedValue(originRow());
    repository.listResourcesByVersionId.mockResolvedValue([resourceRow()]);
    resourceManifest.getResourceObject.mockResolvedValue(
      objectWithText(skillFileContent)
    );

    await service.createSkill({
      allowedTools: "Read",
      content: "# Demo\n",
      description: "Demo description",
      license: "Apache-2.0",
      metadata: { author: "acme" },
      name: "demo",
      resources: [],
    });

    expect(resourceManifest.storeSkillFile).toHaveBeenCalledWith(
      expect.stringContaining("allowed-tools: Read")
    );
    expect(repository.createSkill).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "demo",
        resources: [
          expect.objectContaining({ path: "SKILL.md", sha256: "skill-md" }),
          ...manifest,
        ],
        skillFileMetadata: expect.objectContaining({
          description: "Demo description",
          name: "demo",
        }),
      }),
      expect.any(Date)
    );
  });

  it("patches metadata/body through a new canonical SKILL.md and complete resource manifest", async () => {
    const { repository, resourceManifest, service } = createService();
    const currentSkill = skillRow();
    const currentVersion = versionRow();
    const currentResources = [
      resourceRow(),
      resourceRow({
        id: 101,
        mediaType: "text/plain; charset=utf-8",
        path: "references/notes.txt",
        sha256: "notes",
        size: 12,
      }),
    ];
    const nextResources = [
      storedResource({
        mediaType: "text/plain; charset=utf-8",
        path: "references/notes.txt",
        sha256: "notes-next",
      }),
    ];

    repository.findSkillById.mockResolvedValue(currentSkill);
    repository.findLatestSkillVersion.mockResolvedValue(currentVersion);
    repository.findSkillOrigin.mockResolvedValue(originRow());
    repository.listResourcesByVersionId.mockResolvedValue(currentResources);
    resourceManifest.getResourceObject.mockResolvedValue(
      objectWithText(skillFileContent)
    );
    resourceManifest.storeSkillFile.mockResolvedValue({
      mediaType: "text/markdown; charset=utf-8",
      path: "SKILL.md",
      sha256: "next-skill-md",
      size: 140,
    });
    resourceManifest.patchSnapshot.mockResolvedValue(nextResources);
    repository.commitSkillVersion.mockResolvedValue(
      versionRow({
        description: "Next description",
        id: 11,
        versionNumber: 2,
      })
    );

    await service.patchSkill(currentSkill.id, {
      content: "# Next\n",
      deleteResourcePaths: [],
      description: "Next description",
      upsertResources: [],
    });

    expect(resourceManifest.storeSkillFile).toHaveBeenCalledWith(
      expect.stringContaining("description: Next description")
    );
    expect(resourceManifest.patchSnapshot).toHaveBeenCalledWith(
      currentResources,
      expect.objectContaining({ content: "# Next\n" })
    );
    expect(repository.commitSkillVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        resources: [
          expect.objectContaining({
            path: "SKILL.md",
            sha256: "next-skill-md",
          }),
          ...nextResources,
        ],
        skillFileMetadata: expect.objectContaining({
          description: "Next description",
        }),
        skillId: currentSkill.id,
      }),
      expect.any(Date)
    );
  });

  it("rejects patches that do not change SKILL.md or resources", async () => {
    const { repository, resourceManifest, service } = createService();
    const currentSkill = skillRow();
    const currentVersion = versionRow();

    repository.findSkillById.mockResolvedValue(currentSkill);
    repository.findLatestSkillVersion.mockResolvedValue(currentVersion);
    repository.findSkillOrigin.mockResolvedValue(originRow());
    repository.listResourcesByVersionId.mockResolvedValue([resourceRow()]);
    resourceManifest.getResourceObject.mockResolvedValue(
      objectWithText(skillFileContent)
    );

    await expect(
      service.patchSkill(currentSkill.id, {
        changeSummary: "Retitle release",
        deleteResourcePaths: [],
        upsertResources: [],
        versionLabel: "label-only",
      })
    ).rejects.toMatchObject({ code: "empty-skill-patch" });

    expect(resourceManifest.storeSkillFile).not.toHaveBeenCalled();
    expect(repository.commitSkillVersion).not.toHaveBeenCalled();
  });

  it("restores by committing historical canonical SKILL.md and resources as a new version", async () => {
    const { repository, service } = createService();
    const currentSkill = skillRow();
    const historicalVersion = versionRow({ id: 8, versionNumber: 1 });
    const historicalResources = [
      resourceRow({ id: 1, sha256: "old-skill-md", skillVersionId: 8 }),
      resourceRow({
        id: 2,
        mediaType: "text/plain; charset=utf-8",
        path: "references/notes.txt",
        sha256: "old-notes",
        size: 12,
        skillVersionId: 8,
      }),
    ];

    repository.findSkillById.mockResolvedValue(currentSkill);
    repository.findSkillVersionByNumber.mockResolvedValue(historicalVersion);
    repository.findSkillOrigin.mockResolvedValue(originRow());
    repository.listResourcesByVersionId.mockResolvedValue(historicalResources);
    repository.commitSkillVersion.mockResolvedValue(
      versionRow({ id: 12, versionNumber: 3 })
    );

    await service.restoreSkillVersion(currentSkill.id, 1, {
      changeSummary: "Restore v1",
    });

    expect(repository.commitSkillVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        changeSummary: "Restore v1",
        resources: [
          expect.objectContaining({
            path: "SKILL.md",
            sha256: "old-skill-md",
          }),
          expect.objectContaining({
            path: "references/notes.txt",
            sha256: "old-notes",
          }),
        ],
        skillId: currentSkill.id,
      }),
      expect.any(Date)
    );
  });

  it("adds a source skill with an existing name as a new version of the user's skill", async () => {
    const { originService, repository, resourceManifest, service } =
      createService();
    const existingSkill = skillRow({ id: 7, name: "demo" });
    const committedVersion = versionRow({
      id: 22,
      skillId: existingSkill.id,
      versionNumber: 2,
    });

    originService.readSkillDefinitions.mockResolvedValue([
      { definition: originDefinition(), status: "resolved" },
    ]);
    repository.findSkillByName.mockResolvedValue(existingSkill);
    resourceManifest.storeSkillFile.mockResolvedValue({
      mediaType: "text/markdown; charset=utf-8",
      path: "SKILL.md",
      sha256: "forked-skill-md",
      size: 140,
    });
    resourceManifest.createSnapshot.mockResolvedValue([]);
    repository.commitSkillVersion.mockResolvedValue(committedVersion);
    repository.findSkillById.mockResolvedValue(existingSkill);
    repository.findLatestSkillVersion.mockResolvedValue(committedVersion);
    repository.findSkillOrigin.mockResolvedValue(
      originRow({ skillVersionId: 22 })
    );
    repository.listResourcesByVersionId.mockResolvedValue([resourceRow()]);
    resourceManifest.getResourceObject.mockResolvedValue(
      objectWithText(skillFileContent)
    );

    const result = await service.forkSkill({
      origin: { kind: "github", repoUrl: "https://github.com/example/skills" },
      selections: [{ skillName: "demo" }],
    });

    expect(result.results[0]).toMatchObject({
      skill: { skill: { id: existingSkill.id, name: "demo" } },
      status: "forked",
    });
    expect(repository.createSkill).not.toHaveBeenCalled();
    expect(repository.commitSkillVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: {
          kind: "github",
          metadata: { resolvedSkillPath: "skills/demo/SKILL.md" },
          url: "https://github.com/example/skills",
        },
        skillId: existingSkill.id,
      }),
      expect.any(Date)
    );
  });

  it("fails later fork selections that resolve to a duplicate skill name", async () => {
    const { originService, repository, resourceManifest, service } =
      createService();
    const skill = skillRow({ id: 7, name: "shared-name" });
    const committedVersion = versionRow({
      id: 22,
      skillId: skill.id,
      versionNumber: 1,
    });

    originService.readSkillDefinitions.mockResolvedValue([
      {
        definition: originDefinition({
          name: "shared-name",
          selectionName: "path-a",
        }),
        status: "resolved",
      },
      {
        definition: originDefinition({
          name: "shared-name",
          selectionName: "path-b",
        }),
        status: "resolved",
      },
    ]);
    repository.findSkillByName.mockResolvedValue(missingSkill);
    repository.createSkill.mockResolvedValue({
      skill,
      version: committedVersion,
    });
    resourceManifest.storeSkillFile.mockResolvedValue({
      mediaType: "text/markdown; charset=utf-8",
      path: "SKILL.md",
      sha256: "forked-skill-md",
      size: 140,
    });
    resourceManifest.createSnapshot.mockResolvedValue([]);
    repository.findSkillById.mockResolvedValue(skill);
    repository.findLatestSkillVersion.mockResolvedValue(committedVersion);
    repository.findSkillOrigin.mockResolvedValue(
      originRow({ skillVersionId: 22 })
    );
    repository.listResourcesByVersionId.mockResolvedValue([resourceRow()]);
    resourceManifest.getResourceObject.mockResolvedValue(
      objectWithText(skillFileContent)
    );

    const result = await service.forkSkill({
      origin: { kind: "github", repoUrl: "https://github.com/example/skills" },
      selections: [{ skillName: "path-a" }, { skillName: "path-b" }],
    });

    expect(result.results).toMatchObject([
      { status: "forked" },
      {
        error: "Multiple selected skills resolve to the same Skill Name",
        selection: { skillName: "path-b" },
        status: "failed",
      },
    ]);
    expect(repository.createSkill).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "shared-name",
        origin: {
          kind: "github",
          metadata: { resolvedSkillPath: "skills/demo/SKILL.md" },
          url: "https://github.com/example/skills",
        },
      }),
      expect.any(Date)
    );
    expect(repository.commitSkillVersion).not.toHaveBeenCalled();
  });
});
