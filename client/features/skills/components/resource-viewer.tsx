import type {
  ResourceManifestItem,
  SkillResourceResponse,
} from "@shared/schemas/skills";
import DOMPurify from "dompurify";
import { useEffect, useState } from "react";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import bash from "shiki/langs/bash.mjs";
import javascript from "shiki/langs/javascript.mjs";
import json from "shiki/langs/json.mjs";
import python from "shiki/langs/python.mjs";
import typescript from "shiki/langs/typescript.mjs";
import yaml from "shiki/langs/yaml.mjs";
import githubDark from "shiki/themes/github-dark.mjs";
import githubLight from "shiki/themes/github-light.mjs";

import { formatBytes } from "../lib/format-bytes";
import {
  getSkillResourceKind,
  getSkillResourceLanguage,
} from "../lib/resource-kind";
import { MarkdownContent } from "./markdown-content";

interface ResourceViewerProps {
  file: SkillResourceResponse | undefined;
  rawUrl: string | undefined;
  resource: ResourceManifestItem | undefined;
  status: string;
}

interface CodeResourceProps {
  content: string;
  language: string;
}

interface ResourceBodyProps {
  file: SkillResourceResponse | undefined;
  kind: ReturnType<typeof getSkillResourceKind>;
  rawUrl: string | undefined;
  resource: ResourceManifestItem;
  status: string;
}

const highlighter = createHighlighterCore({
  engine: createJavaScriptRegexEngine(),
  langs: [bash, javascript, json, python, typescript, yaml],
  themes: [githubDark, githubLight],
});

const supportedLanguages = new Set([
  "bash",
  "javascript",
  "json",
  "python",
  "typescript",
  "yaml",
]);

const ResourceMeta = ({
  resource,
}: {
  resource: ResourceManifestItem | undefined;
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

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const getCurrentCodeTheme = () => {
  if (document.documentElement.classList.contains("dark")) {
    return "github-dark";
  }

  return "github-light";
};

const getHighlightLanguage = (language: string) => {
  if (supportedLanguages.has(language)) {
    return language;
  }

  return "text";
};

const CodeResource = ({ content, language }: CodeResourceProps) => {
  const [html, setHtml] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    const highlight = async () => {
      setHtml(undefined);

      try {
        const highlighterInstance = await highlighter;
        const highlighted = highlighterInstance.codeToHtml(content, {
          lang: getHighlightLanguage(language),
          theme: getCurrentCodeTheme(),
        });
        const sanitized = DOMPurify.sanitize(highlighted);

        if (isMounted) {
          setHtml(sanitized);
        }
      } catch {
        if (isMounted) {
          setHtml(
            DOMPurify.sanitize(`<pre><code>${escapeHtml(content)}</code></pre>`)
          );
        }
      }
    };

    void highlight();

    return () => {
      isMounted = false;
    };
  }, [content, language]);

  if (!html) {
    return (
      <p className="px-6 py-4 text-sm text-muted-foreground">
        Highlighting code...
      </p>
    );
  }

  return (
    <div
      className="[&_pre]:m-0 [&_pre]:overflow-x-auto [&_pre]:p-6 [&_pre]:text-sm [&_pre]:leading-6"
      dangerouslySetInnerHTML={{ __html: html }}
    />
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
    return <MarkdownContent content={file?.content} fallback={status} />;
  }

  if (kind === "code" && file?.content) {
    return (
      <CodeResource
        content={file.content}
        language={getSkillResourceLanguage(resource.path)}
      />
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
