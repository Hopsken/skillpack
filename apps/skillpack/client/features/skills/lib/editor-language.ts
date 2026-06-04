import { StreamLanguage } from "@codemirror/language";
import type { Extension } from "@codemirror/state";

interface EditorLanguageInput {
  mediaType: string | undefined;
  path: string;
}

type EditorLanguage =
  | "javascript"
  | "json"
  | "markdown"
  | "python"
  | "shell"
  | "yaml";

const extensionLanguageMap: Record<string, EditorLanguage> = {
  bash: "shell",
  cjs: "javascript",
  js: "javascript",
  json: "json",
  jsx: "javascript",
  md: "markdown",
  mjs: "javascript",
  py: "python",
  sh: "shell",
  ts: "javascript",
  tsx: "javascript",
  yaml: "yaml",
  yml: "yaml",
};

const mediaTypeLanguageMap: Record<string, EditorLanguage> = {
  "application/javascript": "javascript",
  "application/json": "json",
  "application/typescript": "javascript",
  "application/x-sh": "shell",
  "application/x-yaml": "yaml",
  "text/javascript": "javascript",
  "text/markdown": "markdown",
  "text/x-python": "python",
  "text/x-shellscript": "shell",
  "text/yaml": "yaml",
};

const getFileExtension = (path: string) => {
  const lastSegment = path.split("/").at(-1) ?? path;
  const extension = lastSegment.includes(".")
    ? lastSegment.split(".").at(-1)
    : undefined;

  return extension?.toLowerCase();
};

const getEditorLanguage = ({
  mediaType,
  path,
}: EditorLanguageInput): EditorLanguage | undefined => {
  const extension = getFileExtension(path);

  if (extension && extensionLanguageMap[extension]) {
    return extensionLanguageMap[extension];
  }

  if (mediaType && mediaTypeLanguageMap[mediaType]) {
    return mediaTypeLanguageMap[mediaType];
  }
};

const loadJavaScriptLanguage = async (path: string) => {
  const { javascript } = await import("@codemirror/lang-javascript");
  const extension = getFileExtension(path);

  return javascript({
    jsx: extension === "jsx" || extension === "tsx",
    typescript: extension === "ts" || extension === "tsx",
  });
};

export const loadEditorLanguage = async (
  input: EditorLanguageInput
): Promise<Extension[]> => {
  const language = getEditorLanguage(input);

  switch (language) {
    case "javascript": {
      return [await loadJavaScriptLanguage(input.path)];
    }
    case "json": {
      const { json } = await import("@codemirror/lang-json");
      return [json()];
    }
    case "markdown": {
      const { markdown, markdownLanguage } =
        await import("@codemirror/lang-markdown");
      return [markdown({ base: markdownLanguage })];
    }
    case "python": {
      const { python } = await import("@codemirror/lang-python");
      return [python()];
    }
    case "shell": {
      const { shell } = await import("@codemirror/legacy-modes/mode/shell");
      return [StreamLanguage.define(shell)];
    }
    case "yaml": {
      const { yaml } = await import("@codemirror/lang-yaml");
      return [yaml()];
    }
    default: {
      return [];
    }
  }
};
