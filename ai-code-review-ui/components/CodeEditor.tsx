// frontend/components/CodeEditor.tsx
"use client";

import { Dispatch, SetStateAction, useCallback, useState, useRef, useEffect } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { useDropzone } from "react-dropzone";
import { Terminal, Upload, FileCode2 } from "lucide-react";
import type { editor } from "monaco-editor";
import LoadingOverlay from "./LoadingOverlay";

// Types for structured review suggestions (used for inline annotations)
export interface ReviewSuggestion {
  line: number;
  severity: "error" | "warning" | "info";
  message: string;
  original?: string;
  replacement?: string;
}

interface CodeEditorProps {
  code: string;
  setCode: Dispatch<SetStateAction<string>>;
  suggestions?: ReviewSuggestion[];
  onApplyFix?: (suggestion: ReviewSuggestion) => void;
  status?: "idle" | "loading" | "success" | "error";
  isApplyingFix?: boolean;
}

// Map file extension to Monaco language ID
const EXT_TO_LANG: Record<string, string> = {
  py: "python",
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  java: "java",
  cpp: "cpp",
  c: "c",
  cs: "csharp",
  go: "go",
  rb: "ruby",
  rs: "rust",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  html: "html",
  css: "css",
  json: "json",
  md: "markdown",
  sql: "sql",
  sh: "shell",
  yaml: "yaml",
  yml: "yaml",
  xml: "xml",
};

export default function CodeEditor({ code, setCode, suggestions = [], onApplyFix, status = "idle", isApplyingFix = false }: CodeEditorProps) {
  const [detectedLang, setDetectedLang] = useState("python");
  const [droppedFileName, setDroppedFileName] = useState<string | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);

  // Handle file drop
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const lang = EXT_TO_LANG[ext] || "plaintext";

      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        setCode(text);
        setDetectedLang(lang);
        setDroppedFileName(file.name);
      };
      reader.readAsText(file);
    },
    [setCode]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    multiple: false,
  });

  // Mount handler — save refs
  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  // Apply inline annotations (decorations + markers) when suggestions change
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || suggestions.length === 0) {
      // Clear old decorations
      if (decorationsRef.current) {
        decorationsRef.current.clear();
        decorationsRef.current = null;
      }
      // Clear markers
      if (monaco && editor) {
        const model = editor.getModel();
        if (model) monaco.editor.setModelMarkers(model, "ai-review", []);
      }
      return;
    }

    const model = editor.getModel();
    if (!model) return;

    // Set markers (squiggly underlines)
    const markers: editor.IMarkerData[] = suggestions.map((s) => {
      const lineLength = model.getLineLength(Math.min(s.line, model.getLineCount()));
      return {
        startLineNumber: Math.min(s.line, model.getLineCount()),
        startColumn: 1,
        endLineNumber: Math.min(s.line, model.getLineCount()),
        endColumn: lineLength + 1,
        message: s.message,
        severity:
          s.severity === "error"
            ? monaco.MarkerSeverity.Error
            : s.severity === "warning"
              ? monaco.MarkerSeverity.Warning
              : monaco.MarkerSeverity.Info,
        source: "AI Review",
      };
    });
    monaco.editor.setModelMarkers(model, "ai-review", markers);

    // Set glyph margin decorations
    const newDecorations: editor.IModelDeltaDecoration[] = suggestions.map((s) => ({
      range: new monaco.Range(
        Math.min(s.line, model.getLineCount()),
        1,
        Math.min(s.line, model.getLineCount()),
        1
      ),
      options: {
        isWholeLine: true,
        glyphMarginClassName:
          s.severity === "error"
            ? "glyph-error"
            : s.severity === "warning"
              ? "glyph-warning"
              : "glyph-info",
        glyphMarginHoverMessage: { value: `**AI Review (${s.severity}):** ${s.message}` },
        className:
          s.severity === "error"
            ? "line-highlight-error"
            : s.severity === "warning"
              ? "line-highlight-warning"
              : "line-highlight-info",
      },
    }));

    if (decorationsRef.current) {
      decorationsRef.current.clear();
    }
    decorationsRef.current = editor.createDecorationsCollection(newDecorations);
  }, [suggestions]);

  return (
    <div {...getRootProps()} className="flex flex-col h-full relative">
      <input {...getInputProps()} />

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-2">
        <div className="flex items-center gap-3 text-[var(--frozen-water)]">
          <Terminal className="w-5 h-5 opacity-80" />
          <h2 className="text-xl font-semibold tracking-tight">Input Source Code</h2>
        </div>
        {droppedFileName && (
          <div className="flex items-center gap-2 text-sm text-[var(--frozen-water)] bg-white/10 px-3 py-1 rounded-lg font-medium border border-white/20">
            <FileCode2 className="w-4 h-4 opacity-80" />
            {droppedFileName}
          </div>
        )}
      </div>

      {/* Drag-and-Drop Overlay */}
      {isDragActive && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center glass-panel border-2 border-dashed border-white/40 backdrop-blur-md transition-all">
          <Upload className="w-12 h-12 text-[var(--frozen-water)] mb-3 animate-bounce" />
          <p className="text-lg font-semibold text-[var(--frozen-water)]">
            Drop your file here
          </p>
          <p className="text-sm text-[var(--frozen-water)]/70 mt-1">
            Supports .py, .js, .ts, .java, .cpp and more
          </p>
        </div>
      )}

      {/* Monaco Editor */}
      <div className="flex-grow rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] min-h-[400px] lg:min-h-[600px] border border-black bg-[#1e1e1e]">
        <Editor
          height="100%"
          language={detectedLang}
          value={code}
          onChange={(value) => setCode(value || "")}
          theme="vs-dark"
          options={{
            readOnly: status === "loading" || isApplyingFix,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: "gutter",
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            glyphMargin: true,
            folding: true,
            bracketPairColorization: { enabled: true },
            automaticLayout: true,
            fontFamily: "'Geist Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
            fontLigatures: true,
          }}
          onMount={handleEditorMount}
          loading={
            <div className="flex items-center justify-center h-full text-[var(--frozen-water)] gap-3 font-medium bg-[#1e1e1e]">
              <div className="w-5 h-5 border-2 border-white/30 border-t-[var(--blush-rose)] rounded-full animate-spin" />
              Loading Editor...
            </div>
          }
        />

        {/* Loading Overlay */}
        <LoadingOverlay 
          variant="panel" 
          message={isApplyingFix ? "Applying fix..." : "Analyzing your code..."} 
          isVisible={status === "loading" || isApplyingFix} 
        />
      </div>
    </div>
  );
}