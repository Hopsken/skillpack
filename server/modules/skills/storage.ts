import { digestHex } from "@server/lib/crypto";
import type { CreateSkillResourceInput } from "@shared/schemas/skills";

import { skillContentPath } from "./location";
import type { StoredResourceObject } from "./types";

export const markdownMediaType = "text/markdown; charset=utf-8";
const textMediaType = "text/plain; charset=utf-8";

const getTextSize = (content: string) =>
  new TextEncoder().encode(content).length;

const getResourceObjectKey = (handle: string, version: string, path: string) =>
  `skills/skillpack/${handle}/${version}/${path}`;

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

export const putSkillContent = async (
  bucket: R2Bucket,
  handle: string,
  version: string,
  content: string
) => {
  const objectKey = getResourceObjectKey(handle, version, skillContentPath);
  const sha256 = await digestHex(content);

  await bucket.put(objectKey, content, {
    customMetadata: { sha256 },
    httpMetadata: { contentType: markdownMediaType },
  });

  return { objectKey, sha256 };
};

export const putSkillResource = async (
  bucket: R2Bucket,
  handle: string,
  version: string,
  resource: CreateSkillResourceInput
): Promise<StoredResourceObject> => {
  const mediaType = resource.mediaType ?? getDefaultMediaType(resource.path);
  const objectKey = getResourceObjectKey(handle, version, resource.path);
  const sha256 = await digestHex(resource.content);
  const size = getTextSize(resource.content);

  await bucket.put(objectKey, resource.content, {
    customMetadata: { sha256 },
    httpMetadata: { contentType: mediaType },
  });

  return {
    mediaType,
    objectKey,
    path: resource.path,
    sha256,
    size,
  };
};

export const getSkillObject = (bucket: R2Bucket, objectKey: string) =>
  bucket.get(objectKey);

export const deleteSkillObjects = async (bucket: R2Bucket, handle: string) => {
  const prefix = `skills/skillpack/${handle}/`;
  let cursor: string | undefined;

  do {
    const listed = await bucket.list({ cursor, prefix });
    const keys = listed.objects.map((object) => object.key);

    if (keys.length > 0) {
      await bucket.delete(keys);
    }

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
};
