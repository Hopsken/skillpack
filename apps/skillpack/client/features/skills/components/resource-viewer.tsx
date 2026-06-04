import { lazy, Suspense } from "react";

import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import { formatBytes } from "../lib/format-bytes";
import {
  getSkillResourceKind,
  getSkillResourceLanguage,
} from "../lib/resource-kind";

interface ResourceViewerFile {
  content: string;
  mediaType: string;
  path: string;
  size: number;
}

interface ResourceViewerResource {
  description?: string;
  mediaType: string;
  path: string;
  size: number;
}

interface ResourceViewerProps {
  canEditDescription?: boolean;
  descriptionValue?: string;
  file: ResourceViewerFile | undefined;
  rawUrl: string | undefined;
  resource: ResourceViewerResource | undefined;
  showMeta?: boolean;
  status: string;
  onDescriptionChange?: (description: string) => void;
}

interface ResourceBodyProps {
  file: ResourceViewerFile | undefined;
  kind: ReturnType<typeof getSkillResourceKind>;
  rawUrl: string | undefined;
  resource: ResourceViewerResource;
  status: string;
}

const loadMarkdownContent = async () => {
  const module = await import("./markdown-content");
  return { default: module.MarkdownContent };
};

const loadCodeResource = async () => {
  const module = await import("./code-resource");
  return { default: module.CodeResource };
};

const MarkdownContent = lazy(loadMarkdownContent);
const CodeResource = lazy(loadCodeResource);

export const ResourceMeta = ({
  resource,
}: {
  resource: ResourceViewerResource;
}) => (
  <div className="flex min-h-14 shrink-0 items-center border-b border-border bg-background px-6 text-sm text-muted-foreground">
    <span className="font-medium text-foreground">{resource.path}</span>
    <span className="mx-2">·</span>
    <span>{formatBytes(resource.size)}</span>
  </div>
);

export const SkillDescription = ({
  canEditDescription,
  description,
  onDescriptionChange,
}: {
  canEditDescription?: boolean;
  description: string;
  onDescriptionChange?: (description: string) => void;
}) => (
  <div className="shrink-0 border-b border-border bg-background">
    <Table>
      <TableBody>
        <TableRow>
          <TableCell className="w-28 py-3 pr-4 pl-6 text-muted-foreground">
            description
          </TableCell>
          <TableCell className="py-3 pr-6 pl-0 whitespace-normal text-foreground">
            {canEditDescription ? (
              <Textarea
                aria-label="Skill description"
                className="max-w-3xl"
                value={description}
                onChange={(event) => onDescriptionChange?.(event.target.value)}
              />
            ) : (
              description
            )}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
);

const ResourceBody = ({
  file,
  kind,
  rawUrl,
  resource,
  status,
}: ResourceBodyProps) => {
  if (kind === "image" && rawUrl) {
    return (
      <div className="p-6">
        <img
          src={rawUrl}
          alt={resource.path}
          className="max-h-[70vh] max-w-full rounded-lg border border-border object-contain"
        />
      </div>
    );
  }

  if (kind === "markdown") {
    return (
      <Suspense
        fallback={
          <p className="px-6 py-4 text-sm text-muted-foreground">
            Loading markdown preview...
          </p>
        }
      >
        <MarkdownContent content={file?.content} fallback={status} />
      </Suspense>
    );
  }

  if (kind === "code" && file?.content) {
    return (
      <Suspense
        fallback={
          <p className="px-6 py-4 text-sm text-muted-foreground">
            Loading code preview...
          </p>
        }
      >
        <CodeResource
          content={file.content}
          language={getSkillResourceLanguage(resource.path)}
        />
      </Suspense>
    );
  }

  if (kind === "code") {
    return <p className="px-6 py-4 text-sm text-muted-foreground">{status}</p>;
  }

  return (
    <pre className="whitespace-pre-wrap px-6 py-4 text-sm leading-6 text-foreground">
      {file?.content ?? status}
    </pre>
  );
};

export const ResourceViewer = ({
  canEditDescription,
  descriptionValue,
  file,
  rawUrl,
  resource,
  showMeta = true,
  status,
  onDescriptionChange,
}: ResourceViewerProps) => {
  if (!resource) {
    return <p className="px-6 py-4 text-sm text-muted-foreground">{status}</p>;
  }

  const kind = getSkillResourceKind(resource);
  const showDescription =
    kind === "markdown" &&
    (canEditDescription || resource.description !== undefined);

  return (
    <section className="flex h-full min-h-0 flex-col">
      {showMeta ? <ResourceMeta resource={resource} /> : null}
      {showDescription ? (
        <SkillDescription
          canEditDescription={canEditDescription}
          description={descriptionValue ?? resource.description ?? ""}
          onDescriptionChange={onDescriptionChange}
        />
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto">
        <ResourceBody
          file={file}
          kind={kind}
          rawUrl={rawUrl}
          resource={resource}
          status={status}
        />
      </div>
    </section>
  );
};
