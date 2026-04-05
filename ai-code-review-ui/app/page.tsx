// frontend/app/page.tsx
"use client";

import { useState } from "react";
import CodeEditor from "@/components/CodeEditor";
import ReviewDisplay from "@/components/ReviewDisplay";
import StatusIndicator from "@/components/StatusIndicator";
import { Button } from "@/components/ui/button";
import { BotMessageSquare, Sparkles } from "lucide-react";

export default function Home() {
  const [code, setCode] = useState<string>("def calculate_average(numbers):\n    total = 0\n    for num in numbers:\n        total += num\n    return total / len(numbers)");
  const [language, setLanguage] = useState<string>("python");
  const [reviewOutput, setReviewOutput] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleAnalyze = async () => {
    if (!code.trim()) return;
    setStatus("loading");
    setReviewOutput("");

    try {
      const response = await fetch("http://localhost:8000/review/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });

      if (!response.ok) throw new Error("API Request Failed");

      const data = await response.ok ? await response.json() : null;
      if (data && data.success) {
        setReviewOutput(data.review);
        setStatus("success");
      } else {
        throw new Error(data?.detail || "Unknown Error");
      }
    } catch (error) {
      console.error(error);
      setStatus("error");
      setReviewOutput(`### ⚠️ Review Error\n\nFailed to get a response from the AI backend. Please ensure the server is running on port 8000.\n\n\`\`\`text\n${error}\n\`\`\``);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      {/* Slim Header */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-900/95 border-b border-zinc-200 dark:border-zinc-800 backdrop-blur-sm">
        <nav className="max-w-[95rem] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-900 dark:bg-white rounded-xl">
               <BotMessageSquare className="w-6 h-6 text-white dark:text-zinc-900" />
            </div>
            <h1 className="text-2xl font-bold tracking-tighter">AI Code <span className="font-light text-zinc-500">Reviewer</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <StatusIndicator status={status} />
            <Button 
                onClick={handleAnalyze} 
                disabled={status === "loading"}
                className="gap-2 bg-zinc-900 hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 text-base px-6 py-5 rounded-xl shadow-lg shadow-zinc-950/10"
            >
              {status === "loading" ? "Analyzing..." : "Analyze Code"}
              <Sparkles className="w-5 h-5" />
            </Button>
          </div>
        </nav>
      </header>

      {/* Main Split-Pane Layout */}
      <main className="flex-grow max-w-[95rem] mx-auto w-full p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-[1.2fr,1fr] gap-8">
        
        {/* Left Pane - Editor */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col gap-4">
          <CodeEditor 
            code={code} 
            setCode={setCode} 
            language={language} 
            setLanguage={setLanguage} 
          />
        </div>

        {/* Right Pane - Review */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col">
          <ReviewDisplay 
            review={reviewOutput} 
            status={status} 
          />
        </div>

      </main>

      <footer className="py-6 border-t border-zinc-100 dark:border-zinc-800 mt-12 text-center text-zinc-500 text-sm">
        Powered by Google Gemini 1.5 Flash • Built with Next.js & FastAPI
      </footer>
    </div>
  );
}