import DOMPurify from "dompurify";
import { useEffect, useState } from "react";
import type {
  HighlighterCore,
  LanguageInput,
  ThemeRegistrationAny,
} from "shiki/core";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

interface CodeResourceProps {
  content: string;
  language: string;
}

type SupportedLanguage =
  | "bash"
  | "javascript"
  | "json"
  | "python"
  | "typescript"
  | "yaml";
type SupportedTheme = "github-dark" | "github-light";

const highlighter = createHighlighterCore({
  engine: createJavaScriptRegexEngine(),
});

const languageLoaders: Record<SupportedLanguage, () => Promise<LanguageInput>> =
  {
    bash: async () => {
      const module = await import("shiki/langs/bash.mjs");
      return module.default;
    },
    javascript: async () => {
      const module = await import("shiki/langs/javascript.mjs");
      return module.default;
    },
    json: async () => {
      const module = await import("shiki/langs/json.mjs");
      return module.default;
    },
    python: async () => {
      const module = await import("shiki/langs/python.mjs");
      return module.default;
    },
    typescript: async () => {
      const module = await import("shiki/langs/typescript.mjs");
      return module.default;
    },
    yaml: async () => {
      const module = await import("shiki/langs/yaml.mjs");
      return module.default;
    },
  };

const themeLoaders: Record<
  SupportedTheme,
  () => Promise<ThemeRegistrationAny>
> = {
  "github-dark": async () => {
    const module = await import("shiki/themes/github-dark.mjs");
    return module.default;
  },
  "github-light": async () => {
    const module = await import("shiki/themes/github-light.mjs");
    return module.default;
  },
};

const loadedLanguages = new Set<SupportedLanguage>();
const loadedThemes = new Set<SupportedTheme>();

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const getCurrentCodeTheme = (): SupportedTheme => {
  if (document.documentElement.classList.contains("dark")) {
    return "github-dark";
  }

  return "github-light";
};

const getHighlightLanguage = (language: string): SupportedLanguage | "text" => {
  if (language in languageLoaders) {
    return language as SupportedLanguage;
  }

  return "text";
};

const ensureTheme = async (
  highlighterInstance: HighlighterCore,
  theme: SupportedTheme
) => {
  if (loadedThemes.has(theme)) {
    return;
  }

  await highlighterInstance.loadTheme(await themeLoaders[theme]());
  loadedThemes.add(theme);
};

const ensureLanguage = async (
  highlighterInstance: HighlighterCore,
  language: SupportedLanguage | "text"
) => {
  if (language === "text" || loadedLanguages.has(language)) {
    return;
  }

  await highlighterInstance.loadLanguage(await languageLoaders[language]());
  loadedLanguages.add(language);
};

const getReadyHighlighter = async (language: string, theme: SupportedTheme) => {
  const highlighterInstance = await highlighter;
  const highlightLanguage = getHighlightLanguage(language);

  await Promise.all([
    ensureTheme(highlighterInstance, theme),
    ensureLanguage(highlighterInstance, highlightLanguage),
  ]);

  return { highlightLanguage, highlighterInstance };
};

export const CodeResource = ({ content, language }: CodeResourceProps) => {
  const [html, setHtml] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    const highlight = async () => {
      setHtml(undefined);

      try {
        const theme = getCurrentCodeTheme();
        const { highlighterInstance, highlightLanguage } =
          await getReadyHighlighter(language, theme);
        const highlighted = highlighterInstance.codeToHtml(content, {
          lang: highlightLanguage,
          theme,
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
