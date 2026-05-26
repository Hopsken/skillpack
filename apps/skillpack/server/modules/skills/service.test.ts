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

const skillRow = (input?: Partial<SkillRow>): SkillRow => ({
  createdAt,
  currentVersionId: input?.currentVersionId ?? 10,
  id: input?.id ?? 1,
  name: input?.name ?? "demo",
  updatedAt,
});

const versionRow = (input?: Partial<SkillVersionRow>): SkillVersionRow => ({
  changeSummary: input?.changeSummary ?? null,
  createdAt,
  description: input?.description ?? "Demo description",
  id: input?.id ?? 10,
  label: input?.label ?? null,
  skillId: input?.skillId ?? 1,
  versionNumber: input?.versionNumber ?? 1,
});

const resourceRow = (input?: Partial<SkillResourceRow>): SkillResourceRow => ({
  createdAt,
  id: input?.id ?? 100,
  mediaType: input?.mediaType ?? "text/markdown; charset=utf-8",
  path: input?.path ?? "SKILL.md",
  sha256: input?.sha256 ?? "skill-md",
  size: input?.size ?? 12,
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
  mediaType: input?.mediaType ?? "text/markdown; charset=utf-8",
  path: input?.path ?? "SKILL.md",
  sha256: input?.sha256 ?? "skill-md",
  size: input?.size ?? 12,
});

const createService = () => {
  const repository = {
    commitSkillVersion: vi.fn<SkillRepository["commitSkillVersion"]>(),
    findCurrentSkillVersion:
      vi.fn<SkillRepository["findCurrentSkillVersion"]>(),
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
    getResourceObject: vi.fn<ResourceManifest["getResourceObject"]>(),
    patchSnapshot: vi.fn<ResourceManifest["patchSnapshot"]>(),
    resolveSnapshot: vi.fn<ResourceManifest["resolveSnapshot"]>(),
  };
  const originService = {
    readSkillDefinitions: vi.fn<OriginService["readSkillDefinitions"]>(),
  };

  return {
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
  it("creates a Resource Manifest snapshot before committing a new skill version", async () => {
    const { repository, resourceManifest, service } = createService();
    const skill = skillRow({ currentVersionId: null });
    const committedVersion = versionRow();
    const manifest = [storedResource()];

    repository.insertSkill.mockResolvedValue(skill);
    resourceManifest.createSnapshot.mockResolvedValue(manifest);
    repository.commitSkillVersion.mockResolvedValue(committedVersion);
    repository.findSkillById.mockResolvedValue(
      skillRow({ currentVersionId: committedVersion.id })
    );
    repository.findCurrentSkillVersion.mockResolvedValue(committedVersion);
    repository.findSkillOrigin.mockResolvedValue(originRow());
    repository.listResourcesByVersionId.mockResolvedValue([resourceRow()]);
    resourceManifest.resolveSnapshot.mockResolvedValue({
      content: "# Demo",
      resources: [],
    });

    await service.createSkill({
      content: "# Demo",
      description: "Demo description",
      name: "demo",
      resources: [],
    });

    expect(repository.commitSkillVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Demo description",
        resources: manifest,
        skillId: skill.id,
      }),
      expect.any(Date)
    );
    expect(
      resourceManifest.createSnapshot.mock.invocationCallOrder[0]
    ).toBeLessThan(repository.commitSkillVersion.mock.invocationCallOrder[0]);
  });

  it("commits the complete patched Resource Manifest snapshot, not the patch input", async () => {
    const { repository, resourceManifest, service } = createService();
    const currentSkill = skillRow();
    const currentVersion = versionRow();
    const currentResources = [resourceRow()];
    const nextResources = [
      storedResource({ sha256: "next-skill-md" }),
      storedResource({
        mediaType: "text/plain; charset=utf-8",
        path: "references/notes.txt",
        sha256: "notes",
      }),
    ];

    repository.findSkillById.mockResolvedValue(currentSkill);
    repository.findCurrentSkillVersion.mockResolvedValue(currentVersion);
    repository.findSkillOrigin.mockResolvedValue(originRow());
    repository.listResourcesByVersionId.mockResolvedValue(currentResources);
    resourceManifest.patchSnapshot.mockResolvedValue(nextResources);
    repository.commitSkillVersion.mockResolvedValue(
      versionRow({ id: 11, versionNumber: 2 })
    );

    await service.patchSkill(currentSkill.id, {
      content: "# Next",
      deleteResourcePaths: [],
      upsertResources: [],
    });

    expect(resourceManifest.patchSnapshot).toHaveBeenCalledWith(
      currentResources,
      expect.objectContaining({ content: "# Next" })
    );
    expect(repository.commitSkillVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        resources: nextResources,
        skillId: currentSkill.id,
      }),
      expect.any(Date)
    );
  });

  it("restores by committing a new version from historical resource rows", async () => {
    const { repository, service } = createService();
    const currentSkill = skillRow();
    const historicalVersion = versionRow({ id: 8, versionNumber: 1 });
    const historicalResources = [
      resourceRow({ id: 1, sha256: "old-skill-md", skillVersionId: 8 }),
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
        ],
        skillId: currentSkill.id,
      }),
      expect.any(Date)
    );
  });
});
