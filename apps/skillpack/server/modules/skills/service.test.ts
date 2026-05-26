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
  name: "demo",
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
  skillId: input?.skillId ?? 1,
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

const createService = () => {
  const repository = {
    commitSkillVersion: vi.fn<SkillRepository["commitSkillVersion"]>(),
    findLatestSkillVersion: vi.fn<SkillRepository["findLatestSkillVersion"]>(),
    findResourceByPath: vi.fn<SkillRepository["findResourceByPath"]>(),
    findSkillById: vi.fn<SkillRepository["findSkillById"]>(),
    findSkillOrigin: vi.fn<SkillRepository["findSkillOrigin"]>(),
    findSkillVersionByNumber:
      vi.fn<SkillRepository["findSkillVersionByNumber"]>(),
    insertSkill: vi.fn<SkillRepository["insertSkill"]>(),
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
  it("serializes canonical SKILL.md before committing the first version", async () => {
    const { repository, resourceManifest, service } = createService();
    const skill = skillRow();
    const committedVersion = versionRow();
    const manifest = [storedResource()];

    repository.insertSkill.mockResolvedValue(skill);
    resourceManifest.storeSkillFile.mockResolvedValue({
      mediaType: "text/markdown; charset=utf-8",
      path: "SKILL.md",
      sha256: "skill-md",
      size: 120,
    });
    resourceManifest.createSnapshot.mockResolvedValue(manifest);
    repository.commitSkillVersion.mockResolvedValue(committedVersion);
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
    expect(repository.commitSkillVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        resources: [
          expect.objectContaining({ path: "SKILL.md", sha256: "skill-md" }),
          ...manifest,
        ],
        skillFileMetadata: expect.objectContaining({
          description: "Demo description",
          name: "demo",
        }),
        skillId: skill.id,
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
});
