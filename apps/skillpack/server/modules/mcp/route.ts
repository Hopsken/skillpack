import { StreamableHTTPTransport } from "@hono/mcp";
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { skillContentPath } from "@server/constants";
import type { AppBindings } from "@server/types";
import { safeRelativePathSchema } from "@skillpack/core/primitives";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";

const skillpackLocationPattern =
  /^skill:\/\/skillpack\/(?<skillId>[1-9]\d*)(?:\?version=(?<version>[1-9]\d*))?$/u;

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const toSkillpackLocation = (skillId: number) => `skill://skillpack/${skillId}`;

const toPinnedSkillpackLocation = (skillId: number, version: number) =>
  `${toSkillpackLocation(skillId)}?version=${version}`;

const toSkillpackResourceUri = (
  skillId: number,
  version: number,
  path: string
) =>
  `skillpack-resource://skillpack/${skillId}?version=${version}&path=${encodeURIComponent(path)}`;

const parseSkillpackLocation = (location: string) => {
  const match = skillpackLocationPattern.exec(location);

  if (!match?.groups) {
    throw new Error("Expected skill://skillpack/{skillId}");
  }

  return {
    skillId: Number(match.groups.skillId),
    version: match.groups.version ? Number(match.groups.version) : undefined,
  };
};

const parseSkillpackResourceUri = (uri: URL) => {
  if (uri.protocol !== "skillpack-resource:" || uri.hostname !== "skillpack") {
    throw new Error("Expected skillpack-resource://skillpack/{skillId}");
  }

  const skillId = Number(uri.pathname.replace(/^\//u, ""));
  const version = Number(uri.searchParams.get("version"));
  const path = safeRelativePathSchema.parse(uri.searchParams.get("path"));

  if (!(Number.isInteger(skillId) && skillId > 0)) {
    throw new Error("Expected positive numeric Skill ID");
  }

  if (!(Number.isInteger(version) && version > 0)) {
    throw new Error("Expected positive numeric Skill version");
  }

  return { path, skillId, version };
};

const formatSkillContent = (
  content: string,
  resources: { mediaType: string; path: string; size: number }[]
) => {
  let formattedContent = `<skill>\n${content}`;
  const attachedResources = resources.filter(
    (resource) => resource.path !== skillContentPath
  );

  if (attachedResources.length > 0) {
    const lines = ["<resources>"];
    for (const resource of attachedResources) {
      lines.push(
        `  <resource path="${escapeXml(resource.path)}" media_type="${escapeXml(resource.mediaType)}" size="${resource.size}" />`
      );
    }
    lines.push("</resources>");

    formattedContent += `${content.endsWith("\n") ? "\n" : "\n\n"}${lines.join("\n")}`;
  }

  return `${formattedContent}\n</skill>`;
};

const formatSkillpackCatalog = (
  skills: {
    currentVersion: number;
    description: string;
    id: number;
    name: string;
  }[]
) => {
  const lines = [
    "The following Skillpack Managed Skills are available through Skill Delivery.",
    "When a task matches a Skillpack skill, call skillpack_read with its skill:// location.",
    "Use skillpack_read with a resource path to read attached references, scripts, and assets.",
    "",
    "<skillpack_skills>",
  ];

  for (const skill of skills) {
    lines.push("  <skill>");
    lines.push(`    <name>${escapeXml(skill.name)}</name>`);
    lines.push(
      `    <description>${escapeXml(skill.description)}</description>`
    );
    lines.push(`    <location>${toSkillpackLocation(skill.id)}</location>`);
    lines.push(
      `    <current_version>${skill.currentVersion}</current_version>`
    );
    lines.push("  </skill>");
  }

  lines.push("</skillpack_skills>");
  return lines.join("\n");
};

const createMcpServer = (c: Context<AppBindings>) => {
  const server = new McpServer(
    {
      name: "skillpack-mcp",
      version: "0.1.0",
    },
    {
      instructions:
        "Use Skillpack MCP tools and resources to read authenticated Managed Skills. Do not treat skill:// locations as filesystem paths.",
    }
  );

  server.registerTool(
    "skillpack_list",
    {
      description:
        "List Skillpack Managed Skills available to the authenticated user.",
      title: "List Skillpack Skills",
    },
    async () => {
      const skills = await c.var.skillService.listSkills();
      return {
        content: [
          {
            text: JSON.stringify(
              {
                skills: skills.map(({ skill, version }) => ({
                  currentVersion: version.versionNumber,
                  description: version.description,
                  location: toSkillpackLocation(skill.id),
                  name: skill.name,
                })),
              },
              null,
              2
            ),
            type: "text",
          },
        ],
      };
    }
  );

  server.registerTool(
    "skillpack_read",
    {
      description:
        "Read a Skillpack skill or one attached resource from a skill:// location.",
      inputSchema: {
        location: z
          .string()
          .describe("Skillpack location like skill://skillpack/42?version=3"),
        path: safeRelativePathSchema
          .describe("Safe relative resource path. Omit to read SKILL.md.")
          .optional(),
      },
      title: "Read Skillpack Skill",
    },
    async ({ location, path }) => {
      const parsed = parseSkillpackLocation(location);

      if (!path || path === skillContentPath) {
        const resolvedSkill = await c.var.skillService.resolveSkill(
          parsed.skillId,
          parsed.version
        );
        const skillFile = await c.var.skillService.readSkillTextFile({
          path: skillContentPath,
          skillId: parsed.skillId,
          version: parsed.version,
        });

        return {
          content: [
            {
              text: formatSkillContent(
                skillFile.content,
                resolvedSkill.resources
              ),
              type: "text",
            },
          ],
        };
      }

      const result = await c.var.skillService.readSkillTextFile({
        path,
        skillId: parsed.skillId,
        version: parsed.version,
      });

      return {
        content: [{ text: result.content, type: "text" }],
      };
    }
  );

  server.registerResource(
    "skillpack_skill",
    new ResourceTemplate("skill://skillpack/{skillId}{?version}", {
      list: async () => {
        const skills = await c.var.skillService.listSkills();
        const resources = [];

        for (const { skill, version } of skills) {
          const resolvedSkill = await c.var.skillService.resolveSkill(
            skill.id,
            version.versionNumber
          );
          const skillFile = resolvedSkill.resources.find(
            (resource) => resource.path === skillContentPath
          );

          resources.push({
            description: version.description,
            mimeType: skillFile?.mediaType,
            name: skill.name,
            size: skillFile?.size,
            uri: toPinnedSkillpackLocation(skill.id, version.versionNumber),
          });

          for (const resource of resolvedSkill.resources) {
            if (resource.path === skillContentPath) {
              continue;
            }

            resources.push({
              mimeType: resource.mediaType,
              name: `${skill.name}: ${resource.path}`,
              size: resource.size,
              uri: toSkillpackResourceUri(
                skill.id,
                version.versionNumber,
                resource.path
              ),
            });
          }
        }

        return { resources };
      },
    }),
    {
      description: "Skillpack Managed Skill instructions.",
      title: "Skillpack Skill",
    },
    async (uri) => {
      const parsed = parseSkillpackLocation(uri.toString());
      const result = await c.var.skillService.readSkillTextFile({
        path: skillContentPath,
        skillId: parsed.skillId,
        version: parsed.version,
      });

      return {
        contents: [
          {
            mimeType: result.resource.mediaType,
            text: result.content,
            uri: uri.toString(),
          },
        ],
      };
    }
  );

  server.registerResource(
    "skillpack_resource",
    new ResourceTemplate(
      "skillpack-resource://skillpack/{skillId}{?version,path}",
      {
        list: undefined,
      }
    ),
    {
      description: "Skillpack Managed Skill attached resource.",
      title: "Skillpack Resource",
    },
    async (uri) => {
      const parsed = parseSkillpackResourceUri(uri);
      const result = await c.var.skillService.readSkillTextFile(parsed);

      return {
        contents: [
          {
            mimeType: result.resource.mediaType,
            text: result.content,
            uri: uri.toString(),
          },
        ],
      };
    }
  );

  server.registerPrompt(
    "use_skillpack_skills",
    {
      description:
        "Guide an agent to discover and read Skillpack Managed Skills.",
      title: "Use Skillpack Skills",
    },
    async () => {
      const skills = await c.var.skillService.listSkills();

      return {
        messages: [
          {
            content: {
              text: formatSkillpackCatalog(
                skills.map(({ skill, version }) => ({
                  currentVersion: version.versionNumber,
                  description: version.description,
                  id: skill.id,
                  name: skill.name,
                }))
              ),
              type: "text",
            },
            role: "user",
          },
        ],
      };
    }
  );

  return server;
};

export const mcpRoute = new Hono<AppBindings>()
  .post("/", async (c) => {
    const server = createMcpServer(c);
    const transport = new StreamableHTTPTransport({
      enableJsonResponse: true,
      strictAcceptHeader: false,
    });

    await server.connect(transport);

    return await transport.handleRequest(c);
  })
  .all("/", (c) => {
    c.header("Allow", "POST");
    return c.json({ error: "Method Not Allowed" }, 405);
  });
