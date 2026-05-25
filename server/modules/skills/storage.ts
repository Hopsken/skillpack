import { digestHex } from "@server/lib/crypto";

import type { StoredResourceObject, TextResourceInput } from "./types";

export const skillContentPath = "SKILL.md";
export const markdownMediaType = "text/markdown; charset=utf-8";
const textMediaType = "text/plain; charset=utf-8";

const textEncoder = new TextEncoder();

const getTextSize = (content: string) => textEncoder.encode(content).length;

export const getResourceObjectKey = (sha256: string) =>
  `objects/sha256/${sha256}`;

const getDefaultMediaType = (path: string) => {
  const lowerPath = path.toLowerCase();

  if (lowerPath.endsWith(".md")) {
    return markdownMediaType;
  }

  if (lowerPath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }

  if (lowerPath.endsWith(".js") || lowerPath.endsWith(".mjs")) {
    return "text/javascript; charset=utf-8";
  }

  if (lowerPath.endsWith(".ts")) {
    return "text/typescript; charset=utf-8";
  }

  if (lowerPath.endsWith(".py")) {
    return "text/x-python; charset=utf-8";
  }

  if (lowerPath.endsWith(".sh")) {
    return "text/x-shellscript; charset=utf-8";
  }

  return textMediaType;
};

export class SkillStorage {
  private readonly bucket: R2Bucket;

  constructor(bucket: R2Bucket) {
    this.bucket = bucket;
  }

  async putTextResource(
    resource: TextResourceInput
  ): Promise<StoredResourceObject> {
    const mediaType = resource.mediaType ?? getDefaultMediaType(resource.path);
    const sha256 = await digestHex(resource.content);
    const objectKey = getResourceObjectKey(sha256);
    const existing = await this.bucket.head(objectKey);

    if (!existing) {
      await this.bucket.put(objectKey, resource.content, {
        customMetadata: { sha256 },
        httpMetadata: { contentType: mediaType },
      });
    }

    return {
      mediaType,
      path: resource.path,
      sha256,
      size: getTextSize(resource.content),
    };
  }

  getSkillObject(sha256: string) {
    return this.bucket.get(getResourceObjectKey(sha256));
  }
}
