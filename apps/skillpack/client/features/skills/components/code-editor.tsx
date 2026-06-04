import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { Compartment, EditorState } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import type { ViewUpdate } from "@codemirror/view";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import { loadEditorLanguage } from "../lib/editor-language";

interface CodeEditorProps {
  ariaLabel: string;
  mediaType: string | undefined;
  path: string;
  value: string;
  onChange: (value: string) => void;
}

const getEditorTheme = () =>
  EditorView.theme({
    "&": {
      backgroundColor: "hsl(var(--background))",
      color: "hsl(var(--foreground))",
      fontSize: "0.875rem",
      height: "100%",
    },
    "&.cm-focused": {
      outline: "none",
    },
    ".cm-activeLine": {
      backgroundColor: "hsl(var(--muted) / 0.45)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "hsl(var(--muted) / 0.65)",
    },
    ".cm-content": {
      caretColor: "hsl(var(--foreground))",
      fontFamily:
        "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)",
      lineHeight: "1.5rem",
      minHeight: "100%",
      paddingBottom: "1rem",
      paddingTop: "1rem",
    },
    ".cm-gutters": {
      backgroundColor: "hsl(var(--muted) / 0.35)",
      borderRight: "1px solid hsl(var(--border))",
      color: "hsl(var(--muted-foreground))",
    },
    ".cm-line": {
      paddingLeft: "1rem",
      paddingRight: "1rem",
    },
    ".cm-scroller": {
      fontFamily: "inherit",
      overflow: "auto",
    },
  });

const getBaseExtensions = (
  onChangeRef: RefObject<(value: string) => void>
): Extension[] => [
  getEditorTheme(),
  lineNumbers(),
  highlightActiveLineGutter(),
  history(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  bracketMatching(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  highlightActiveLine(),
  EditorView.lineWrapping,
  keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
  EditorView.updateListener.of((update: ViewUpdate) => {
    if (update.docChanged) {
      onChangeRef.current(update.state.doc.toString());
    }
  }),
];

export const CodeEditor = ({
  ariaLabel,
  mediaType,
  path,
  value,
  onChange,
}: CodeEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const languageCompartment = useRef(new Compartment());
  const initialValueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: initialValueRef.current,
        extensions: [
          ...getBaseExtensions(onChangeRef),
          EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
          languageCompartment.current.of([]),
        ],
      }),
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [ariaLabel]);

  useEffect(() => {
    const view = viewRef.current;

    if (!view) {
      return;
    }

    const currentValue = view.state.doc.toString();

    if (currentValue === value) {
      return;
    }

    view.dispatch({
      changes: { from: 0, insert: value, to: currentValue.length },
    });
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;

    if (!view) {
      return;
    }

    let cancelled = false;

    const loadLanguage = async () => {
      const extension = await loadEditorLanguage({ mediaType, path });

      if (cancelled) {
        return;
      }

      view.dispatch({
        effects: languageCompartment.current.reconfigure(extension),
      });
    };

    void loadLanguage();

    return () => {
      cancelled = true;
    };
  }, [mediaType, path]);

  return <div ref={containerRef} className="h-full min-h-0 w-full" />;
};
