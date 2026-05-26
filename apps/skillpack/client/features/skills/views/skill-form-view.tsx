import type {
  CreateSkillInput,
  PatchSkillInput,
} from "@skillpack/contracts/skills/requests";
import type { ResolvedSkill } from "@skillpack/contracts/skills/responses";
import { ArrowLeftIcon, SaveIcon } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SkillFormViewProps {
  mode: "create" | "edit";
  skill?: ResolvedSkill;
  status: string;
  onSubmit: (input: CreateSkillInput | PatchSkillInput) => Promise<void>;
}

const textAreaClassName =
  "min-h-32 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const parseResourceLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const buildResourcePayload = (
  path: string,
  content: string,
  mediaType: string
) => {
  const trimmedPath = path.trim();

  if (!(trimmedPath && content)) {
    return [];
  }

  return [
    {
      content,
      mediaType: mediaType.trim() || undefined,
      path: trimmedPath,
    },
  ];
};

const formatMetadata = (metadata: Record<string, string> | null | undefined) =>
  metadata ? JSON.stringify(metadata, null, 2) : "";

const parseMetadata = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = JSON.parse(trimmed) as unknown;

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    Object.values(parsed).some((item) => typeof item !== "string")
  ) {
    throw new Error("Metadata must be a JSON object with string values");
  }

  return parsed as Record<string, string>;
};

export const SkillFormView = ({
  mode,
  skill,
  status,
  onSubmit,
}: SkillFormViewProps) => {
  const [allowedTools, setAllowedTools] = useState(skill?.allowedTools ?? "");
  const [compatibility, setCompatibility] = useState(
    skill?.compatibility ?? ""
  );
  const [name, setName] = useState(skill?.name ?? "");
  const [description, setDescription] = useState(skill?.description ?? "");
  const [content, setContent] = useState(skill?.content ?? "# New Skill\n");
  const [license, setLicense] = useState(skill?.license ?? "");
  const [metadata, setMetadata] = useState(formatMetadata(skill?.metadata));
  const [versionLabel, setVersionLabel] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [resourcePath, setResourcePath] = useState("");
  const [resourceMediaType, setResourceMediaType] = useState("");
  const [resourceContent, setResourceContent] = useState("");
  const [deleteResourcePaths, setDeleteResourcePaths] = useState("");
  const [submitStatus, setSubmitStatus] = useState(status);

  const title =
    mode === "create" ? "Create Managed Skill" : "Edit Managed Skill";
  const submitLabel = mode === "create" ? "Create" : "Save Version";
  const currentResources = useMemo(
    () => skill?.resources.map((resource) => resource.path).join("\n") ?? "",
    [skill?.resources]
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitStatus("Saving...");

    const sharedInput = {
      allowedTools: allowedTools.trim() || null,
      changeSummary: changeSummary.trim() || undefined,
      compatibility: compatibility.trim() || null,
      content,
      description,
      license: license.trim() || null,
      metadata: parseMetadata(metadata),
      name,
      versionLabel: versionLabel.trim() || undefined,
    };
    const upsertResources = buildResourcePayload(
      resourcePath,
      resourceContent,
      resourceMediaType
    );

    try {
      await onSubmit(
        mode === "create"
          ? {
              ...sharedInput,
              resources: upsertResources,
            }
          : {
              ...sharedInput,
              deleteResourcePaths: parseResourceLines(deleteResourcePaths),
              upsertResources,
            }
      );

      setSubmitStatus("Saved");
    } catch (error) {
      setSubmitStatus(error instanceof Error ? error.message : "Save failed");
    }
  };

  return (
    <main className="flex h-svh min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link
              to={skill ? `/skills/${skill.id}` : "/skills"}
              aria-label="Back"
            >
              <ArrowLeftIcon />
            </Link>
          </Button>
          <h1 className="truncate text-lg font-semibold tracking-tight">
            {title}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{submitStatus}</p>
      </header>

      <OverlayScrollbarsComponent
        defer
        options={{ scrollbars: { autoHide: "leave", theme: "os-theme-dark" } }}
        className="min-h-0 flex-1"
      >
        <form onSubmit={submit} className="mx-auto grid max-w-4xl gap-6 p-6">
          <section className="grid gap-4 border-b border-border pb-6">
            <h2 className="text-sm font-semibold">Frontmatter</h2>
            <label
              htmlFor="skill-name"
              className="grid gap-2 text-sm font-medium"
            >
              Skill Name
              <Input
                id="skill-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <label
              htmlFor="skill-description"
              className="grid gap-2 text-sm font-medium"
            >
              Description
              <Input
                id="skill-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              <label
                htmlFor="skill-license"
                className="grid gap-2 text-sm font-medium"
              >
                License
                <Input
                  id="skill-license"
                  value={license}
                  onChange={(event) => setLicense(event.target.value)}
                />
              </label>
              <label
                htmlFor="skill-compatibility"
                className="grid gap-2 text-sm font-medium"
              >
                Compatibility
                <Input
                  id="skill-compatibility"
                  value={compatibility}
                  onChange={(event) => setCompatibility(event.target.value)}
                />
              </label>
              <label
                htmlFor="skill-allowed-tools"
                className="grid gap-2 text-sm font-medium"
              >
                Allowed Tools
                <Input
                  id="skill-allowed-tools"
                  value={allowedTools}
                  onChange={(event) => setAllowedTools(event.target.value)}
                />
              </label>
            </div>
            <label
              htmlFor="skill-metadata"
              className="grid gap-2 text-sm font-medium"
            >
              Metadata
              <textarea
                id="skill-metadata"
                aria-label="Metadata"
                className={textAreaClassName}
                value={metadata}
                onChange={(event) => setMetadata(event.target.value)}
                placeholder='{"author":"example-org"}'
              />
            </label>
          </section>

          <section className="grid gap-3 border-b border-border pb-6">
            <div className="grid gap-3 md:grid-cols-2">
              <label
                htmlFor="skill-version-label"
                className="grid gap-2 text-sm font-medium"
              >
                Version Label
                <Input
                  id="skill-version-label"
                  value={versionLabel}
                  onChange={(event) => setVersionLabel(event.target.value)}
                />
              </label>
              <label
                htmlFor="skill-change-summary"
                className="grid gap-2 text-sm font-medium"
              >
                Change Summary
                <Input
                  id="skill-change-summary"
                  value={changeSummary}
                  onChange={(event) => setChangeSummary(event.target.value)}
                />
              </label>
            </div>
          </section>

          <label
            htmlFor="skill-content"
            className="grid gap-2 border-b border-border pb-6 text-sm font-medium"
          >
            Instructions
            <textarea
              id="skill-content"
              aria-label="SKILL.md"
              className={`${textAreaClassName} min-h-80 font-mono`}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              required
            />
          </label>

          <section className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
              <label
                htmlFor="skill-resource-path"
                className="grid gap-2 text-sm font-medium"
              >
                Upsert Resource Path
                <Input
                  id="skill-resource-path"
                  value={resourcePath}
                  onChange={(event) => setResourcePath(event.target.value)}
                  placeholder="scripts/check.ts"
                />
              </label>
              <label
                htmlFor="skill-resource-media-type"
                className="grid gap-2 text-sm font-medium"
              >
                Media Type
                <Input
                  id="skill-resource-media-type"
                  value={resourceMediaType}
                  onChange={(event) => setResourceMediaType(event.target.value)}
                  placeholder="text/typescript; charset=utf-8"
                />
              </label>
            </div>
            <label
              htmlFor="skill-resource-content"
              className="grid gap-2 text-sm font-medium"
            >
              Upsert Resource Content
              <textarea
                id="skill-resource-content"
                aria-label="Upsert resource content"
                className={`${textAreaClassName} font-mono`}
                value={resourceContent}
                onChange={(event) => setResourceContent(event.target.value)}
              />
            </label>
          </section>

          {mode === "edit" && (
            <section className="grid gap-3">
              <label
                htmlFor="skill-delete-resource-paths"
                className="grid gap-2 text-sm font-medium"
              >
                Delete Resource Paths
                <textarea
                  id="skill-delete-resource-paths"
                  aria-label="Delete resource paths"
                  className={textAreaClassName}
                  value={deleteResourcePaths}
                  onChange={(event) =>
                    setDeleteResourcePaths(event.target.value)
                  }
                  placeholder="old-notes.md"
                />
              </label>
              {currentResources && (
                <pre className="rounded-md border border-border bg-muted p-3 text-xs text-muted-foreground">
                  {currentResources}
                </pre>
              )}
            </section>
          )}

          <div className="flex justify-end">
            <Button type="submit">
              <SaveIcon />
              {submitLabel}
            </Button>
          </div>
        </form>
      </OverlayScrollbarsComponent>
    </main>
  );
};
