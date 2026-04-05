// frontend/components/CodeEditor.tsx
"use client";

import { Dispatch, SetStateAction } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Terminal } from "lucide-react";

interface CodeEditorProps {
  code: string;
  setCode: Dispatch<SetStateAction<string>>;
  language: string;
  setLanguage: Dispatch<SetStateAction<string>>;
}

const SUPPORTED_LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
];

export default function CodeEditor({ code, setCode, language, setLanguage }: CodeEditorProps) {
  // Simple line number generation
  const lineCount = code.split("\n").length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join("\n");

  return (
    <>
      <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-2">
        <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-zinc-400" />
            <h2 className="text-xl font-semibold tracking-tight">Input Source Code</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <Label htmlFor="language" className="text-sm text-zinc-500">Language:</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger id="language" className="w-[160px] rounded-xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative flex-grow flex font-mono text-sm border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950 shadow-inner">
        {/* Line Numbers */}
        <textarea
          readOnly
          value={lineNumbers}
          className="absolute top-0 left-0 w-12 h-full py-4 text-right pr-3 select-none text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 resize-none overflow-hidden active:outline-none focus:outline-none"
          tabIndex={-1}
        />
        
        {/* Main Code Input */}
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code snippet here (e.g., function add(a, b) { return a + b; })"
          className="flex-grow h-full min-h-[400px] lg:min-h-[600px] pl-16 pr-4 py-4 bg-transparent resize-none outline-none active:outline-none focus:outline-none text-zinc-800 dark:text-zinc-200 leading-relaxed"
          spellCheck="false"
        />
      </div>
    </>
  );
}