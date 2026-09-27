"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "codemirror";
import { indentWithTab } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { keymap } from "@codemirror/view";
import { indentUnit } from "@codemirror/language";

// The indentUnit facet defaults to 2 spaces; Python's convention — and the
// wireframe — is 4, so declare it explicitly for python/python3.
const PYTHON_INDENT = indentUnit.of("    ");

/**
 * Line-numbered code editor (Phase C1) — CodeMirror 6 core in the product's
 * dark theme. The browser still sends only code: language, tests, execution
 * and scoring all live server-side. Languages without a CodeMirror mode
 * (e.g. Go, Rust, Kotlin, Swift) render as clean plain text — highlighting
 * is never faked for an unsupported language.
 */

/** Judge0 language key -> CodeMirror language mode (pure; null = plain). */
export function editorLanguageMode(language: string) {
  const key = language.trim().toLowerCase();
  if (key === "python" || key === "python3") return [python(), PYTHON_INDENT];
  if (key === "typescript") return [javascript({ typescript: true })];
  if (key === "javascript" || key === "node" || key === "nodejs") return [javascript()];
  return null;
}

/** Slate-950 product palette over the One Dark syntax colors. */
const productDarkTheme = EditorView.theme({
  "&": { backgroundColor: "#020617", color: "#f1f5f9" },
  ".cm-scroller": {
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
    fontSize: "13px",
    lineHeight: "1.625",
  },
  ".cm-content": { padding: "12px 8px" },
  ".cm-gutters": { backgroundColor: "#020617", color: "#475569", border: "none" },
  ".cm-gutter": { border: "none" },
  ".cm-activeLine": { backgroundColor: "rgba(59, 130, 246, 0.08)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#94a3b8" },
  "&.cm-focused .cm-cursor, .cm-cursor": { borderLeftColor: "#60a5fa" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, .cm-content ::selection":
    { backgroundColor: "rgba(59, 130, 246, 0.25) !important" },
  ".cm-panels": { backgroundColor: "#0f172a", color: "#f1f5f9" },
  ".cm-tooltip": { backgroundColor: "#0f172a", border: "1px solid #334155" },
});

export function CodeEditor({
  value,
  onChange,
  language,
  ariaLabel = "Code editor",
}: {
  value: string;
  onChange: (code: string) => void;
  language: string;
  ariaLabel?: string;
}) {
  const mode = useMemo(() => editorLanguageMode(language), [language]);
  const extensions = useMemo(
    () => [productDarkTheme, keymap.of([indentWithTab]), ...(mode ? [mode] : [])],
    [mode],
  );

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      height="100%"
      theme={oneDark}
      extensions={extensions}
      aria-label={ariaLabel}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: false,
        searchKeymap: false,
        history: true,
        historyKeymap: true,
        allowMultipleSelections: true,
      }}
    />
  );
}
