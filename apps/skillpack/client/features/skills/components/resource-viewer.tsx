import { lazy, Suspense } from "react";

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
  mediaType: string;
  path: string;
  size: number;
}

interface ResourceViewerProps {
  file: ResourceViewerFile | undefined;
  rawUrl: string | undefined;
  resource: ResourceViewerResource | undefined;
  status: string;
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

const ResourceMeta = ({
  resource,
}: {
  resource: ResourceViewerResource | undefined;
}) => {
  if (!resource) {
    return null;
  }

  return (
    <div className="border-b border-border px-6 py-3 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{resource.path}</span>
      <span className="mx-2">·</span>
      <span>{formatBytes(resource.size)}</span>
    </div>
  );
};

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
  file,
  rawUrl,
  resource,
  status,
}: ResourceViewerProps) => {
  if (!resource) {
    return <p className="px-6 py-4 text-sm text-muted-foreground">{status}</p>;
  }

  return (
    <section>
      <ResourceMeta resource={resource} />
      <ResourceBody
        file={file}
        kind={getSkillResourceKind(resource)}
        rawUrl={rawUrl}
        resource={resource}
        status={status}
      />
    </section>
  );
};
