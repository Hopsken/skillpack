import { skillContentPath } from "@server/constants";
import {
  getDefaultMediaType,
  getTextSize,
  markdownMediaType,
} from "@server/shared/text-resource";
import {
  discoverSkillsResponseSchema,
  readSkillDefinitionsResponseSchema,
} from "@skillpack/contracts/origins/responses";

import type { OriginDefinitionResult, OriginDiscoveryResult } from "./types";

export const presentOriginDiscovery = (result: OriginDiscoveryResult) =>
  discoverSkillsResponseSchema.parse(result);

export const presentOriginDefinitions = (results: OriginDefinitionResult[]) =>
  readSkillDefinitionsResponseSchema.parse({
    results: results.map((result) => {
      if (result.status === "failed") {
        return result;
      }

      return {
        definition: {
          content: result.definition.content,
          description: result.definition.description,
          name: result.definition.name,
          resources: [
            {
              content: result.definition.content,
              mediaType: markdownMediaType,
              path: skillContentPath,
              size: getTextSize(result.definition.content),
            },
            ...result.definition.resources.map((resource) => ({
              content: resource.content,
              mediaType:
                resource.mediaType ?? getDefaultMediaType(resource.path),
              path: resource.path,
              size: getTextSize(resource.content),
            })),
          ],
          selection: result.definition.selection,
        },
        status: result.status,
      };
    }),
  });
