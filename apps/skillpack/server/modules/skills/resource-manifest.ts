import { skillErrors } from "./errors";
import { markdownMediaType, skillContentPath } from "./storage";
import type { SkillStorage } from "./storage";
import type {
  PatchSkillServiceInput,
  SkillResourceRow,
  StoredResourceObject,
  TextResourceInput,
} from "./types";

export interface ResolvedResourceManifest {
  content: string;
  resources: SkillResourceRow[];
}

const validateResourcePaths = (resources: TextResourceInput[]) => {
  const resourcePaths = new Set(resources.map((resource) => resource.path));

  if (resourcePaths.size !== resources.length) {
    throw skillErrors.duplicateResourcePath();
  }

  if (resourcePaths.has(skillContentPath)) {
    throw skillErrors.reservedResourcePath();
  }
};

const toStoredResource = (
  resource: SkillResourceRow
): StoredResourceObject => ({
  mediaType: resource.mediaType,
  path: resource.path,
  sha256: resource.sha256,
  size: resource.size,
});

export class ResourceManifest {
  private readonly storage: SkillStorage;

  constructor(storage: SkillStorage) {
    this.storage = storage;
  }

  async createSnapshot(
    content: string,
    resources: TextResourceInput[]
  ): Promise<StoredResourceObject[]> {
    validateResourcePaths(resources);

    const storedResources = [
      await this.storage.putTextResource({
        content,
        mediaType: markdownMediaType,
        path: skillContentPath,
      }),
    ];

    for (const resource of resources) {
      storedResources.push(await this.storage.putTextResource(resource));
    }

    return storedResources;
  }

  async patchSnapshot(
    currentResources: SkillResourceRow[],
    input: PatchSkillServiceInput
  ): Promise<StoredResourceObject[]> {
    const nextResources = new Map<string, StoredResourceObject>();

    for (const resource of currentResources) {
      nextResources.set(resource.path, toStoredResource(resource));
    }

    if (input.deleteResourcePaths.includes(skillContentPath)) {
      throw skillErrors.reservedResourcePath();
    }

    for (const path of input.deleteResourcePaths) {
      nextResources.delete(path);
    }

    if (input.content) {
      nextResources.set(
        skillContentPath,
        await this.storage.putTextResource({
          content: input.content,
          mediaType: markdownMediaType,
          path: skillContentPath,
        })
      );
    }

    validateResourcePaths(input.upsertResources);

    for (const resource of input.upsertResources) {
      nextResources.set(
        resource.path,
        await this.storage.putTextResource(resource)
      );
    }

    if (!nextResources.has(skillContentPath)) {
      throw skillErrors.skillFileNotFound();
    }

    return [...nextResources.values()];
  }

  static restoreSnapshot(
    resources: SkillResourceRow[]
  ): StoredResourceObject[] {
    if (!resources.some((resource) => resource.path === skillContentPath)) {
      throw skillErrors.skillFileNotFound();
    }

    return resources.map(toStoredResource);
  }

  async resolveSnapshot(
    resources: SkillResourceRow[]
  ): Promise<ResolvedResourceManifest> {
    const contentResource = resources.find(
      (resource) => resource.path === skillContentPath
    );

    if (!contentResource) {
      throw skillErrors.skillFileNotFound();
    }

    const object = await this.getResourceObject(contentResource);

    return {
      content: await object.text(),
      resources: resources.filter(
        (resource) => resource.path !== skillContentPath
      ),
    };
  }

  async getResourceObject(resource: SkillResourceRow) {
    const object = await this.storage.getSkillObject(resource.sha256);

    if (!object) {
      throw skillErrors.skillObjectNotFound();
    }

    return object;
  }
}
