// frontend/app/page.tsx
"use client";

import { useState, useCallback } from "react";
import CodeEditor from "@/components/CodeEditor";
import ReviewDisplay from "@/components/ReviewDisplay";
import StatusIndicator from "@/components/StatusIndicator";
import { Button } from "@/components/ui/button";
import { BotMessageSquare, Sparkles } from "lucide-react";
import type { StructuredReview, ReviewSuggestion } from "@/components/ReviewDisplay";

export default function Home() {
  const [code, setCode] = useState<string>(
    "def calculate_average(numbers):\n    total = 0\n    for num in numbers:\n        total += num\n    return total / len(numbers)"
  );
  const [review, setReview] = useState<StructuredReview | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [streamingText, setStreamingText] = useState<string>("");

  // Derive suggestions from structured review for the editor annotations
  const suggestions = review?.suggestions ?? [];

  const handleAnalyze = useCallback(async () => {
    if (!code.trim()) return;
    setStatus("loading");
    setReview(null);
    setErrorMessage("");
    setStreamingText("");

    try {
      // Attempt SSE streaming endpoint first
      const response = await fetch("http://localhost:8000/review/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream available");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullReview = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);

              if (eventType === "chunk") {
                fullReview += data.text || "";
                setStreamingText(fullReview);
              } else if (eventType === "done") {
                fullReview = data.full_review || fullReview;
              } else if (eventType === "error") {
                throw new Error(data.detail || "Stream error");
              }
            } catch (parseErr) {
              // Ignore JSON parse errors on partial data
              if (eventType === "error") throw parseErr;
            }
            eventType = "";
          }
        }
      }

      // Parse the complete JSON review
      if (fullReview) {
        try {
          const parsed: StructuredReview = JSON.parse(fullReview);
          setReview(parsed);
          setStatus("success");
        } catch {
          // If JSON parsing fails, try to extract JSON from the response
          const jsonMatch = fullReview.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed: StructuredReview = JSON.parse(jsonMatch[0]);
            setReview(parsed);
            setStatus("success");
          } else {
            throw new Error("Failed to parse AI response as JSON");
          }
        }
      } else {
        throw new Error("No review content received");
      }
    } catch (error) {
      console.error("Review error:", error);

      // Fallback: try non-streaming endpoint
      try {
        const fallbackRes = await fetch("http://localhost:8000/review/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!fallbackRes.ok) throw new Error("Fallback also failed");

        const fallbackData = await fallbackRes.json();
        if (fallbackData.success && fallbackData.review) {
          const parsed: StructuredReview = JSON.parse(fallbackData.review);
          setReview(parsed);
          setStatus("success");
          return;
        }
      } catch {
        // Both endpoints failed
      }

      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to get a response. Please ensure the server is running on port 8000."
      );
    }
  }, [code]);

  // Apply Fix: replace original code lines with the suggestion replacement
  const handleApplyFix = useCallback(
    (suggestion: ReviewSuggestion) => {
      if (!suggestion.original || !suggestion.replacement) return;

      const lines = code.split("\n");
      const lineIndex = suggestion.line - 1;

      if (lineIndex >= 0 && lineIndex < lines.length) {
        // Try exact line match first
        if (lines[lineIndex].trim() === suggestion.original.trim()) {
          lines[lineIndex] = suggestion.replacement;
          setCode(lines.join("\n"));
        } else {
          // Fallback: find and replace the original text anywhere
          const newCode = code.replace(suggestion.original, suggestion.replacement);
          if (newCode !== code) {
            setCode(newCode);
          }
        }
      }
    },
    [code, setCode]
  );

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
            suggestions={suggestions}
            onApplyFix={handleApplyFix}
          />
        </div>

        {/* Right Pane - Review */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col">
          <ReviewDisplay 
            review={review}
            status={status}
            errorMessage={errorMessage}
            streamingText={streamingText}
            onApplyFix={handleApplyFix}
          />
        </div>

      </main>

      <footer className="py-6 border-t border-zinc-100 dark:border-zinc-800 mt-12 text-center text-zinc-500 text-sm">
        Powered by Google Gemini 2.5 Flash • Built with Next.js &amp; FastAPI
      </footer>
    </div>
  );
}