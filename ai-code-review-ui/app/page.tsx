// frontend/app/page.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import CodeEditor from "@/components/CodeEditor";
import ReviewDisplay from "@/components/ReviewDisplay";
import StatusIndicator from "@/components/StatusIndicator";
import InitialLoader from "@/components/InitialLoader";
import { Button } from "@/components/ui/button";
import { BotMessageSquare, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import type { StructuredReview, ReviewSuggestion, ReviewIssue } from "@/components/ReviewDisplay";

export default function Home() {
  const [code, setCode] = useState<string>(
    "def calculate_average(numbers):\n    total = 0\n    for num in numbers:\n        total += num\n    return total / len(numbers)"
  );
  const [review, setReview] = useState<StructuredReview | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [streamingText, setStreamingText] = useState<string>("");
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const hasSeen = sessionStorage.getItem("hasSeenLoading");
    if (hasSeen) {
      setIsInitialLoading(false);
    } else {
      sessionStorage.setItem("hasSeenLoading", "true");
    }
  }, []);

  // Derive suggestions from structured review for the editor annotations
  const suggestions = review?.suggestions ?? [];

  const handleAnalyze = useCallback(async () => {
    if (!code.trim()) return;
    setStatus("loading");
    setReview(null);
    setErrorMessage("");
    setStreamingText("");

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

    try {
      // Attempt SSE streaming endpoint first
      const response = await fetch(`${API_BASE_URL}/review/stream`, {
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
        const fallbackRes = await fetch(`${API_BASE_URL}/review/`, {
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

  // Apply Fix: dynamically fetch the corrected code from Gemini API
  const handleApplyFix = useCallback(
    async (suggestion: ReviewSuggestion) => {
      setIsApplyingFix(true);
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const res = await fetch(`${API_BASE_URL}/fix/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            issue_message: suggestion.message,
            line: suggestion.line,
            original_snippet: suggestion.original || "",
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch fix: ${res.status}`);
        }

        const data = await res.json();
        if (data.fixed_code) {
          setCode(data.fixed_code);
        }
      } catch (error) {
        console.error("Apply fix error:", error);
        // Fallback to old simple replacement if API fails
        if (suggestion.original && suggestion.replacement) {
          const newCode = code.replace(suggestion.original, suggestion.replacement);
          if (newCode !== code) {
            setCode(newCode);
          }
        }
      } finally {
        setIsApplyingFix(false);
      }
    },
    [code, setCode]
  );

  const handleRemoveSuggestion = useCallback((suggestionToRemove: ReviewSuggestion) => {
    setReview((prev) => {
      if (!prev) return prev;

      const { line, severity } = suggestionToRemove;
      
      // Helper to remove any issues that match the fixed suggestion's line and severity
      const filterCategory = (issues: ReviewIssue[]) =>
        issues.filter((issue) => !(issue.line === line && issue.severity === severity));

      return {
        ...prev,
        categories: {
          ...prev.categories,
          bugs: filterCategory(prev.categories.bugs),
          security: filterCategory(prev.categories.security),
          performance: filterCategory(prev.categories.performance),
          best_practices: filterCategory(prev.categories.best_practices),
        },
        suggestions: prev.suggestions.filter((s) => s !== suggestionToRemove)
      };
    });
  }, []);

  return (
    <>
      <InitialLoader 
        isLoading={isInitialLoading} 
        onLoadingComplete={() => setIsInitialLoading(false)} 
      />
      <div className="min-h-screen bg-transparent text-[var(--frozen-water)] flex flex-col font-sans">
      {/* Slim Header */}
      <header className="sticky top-0 z-50 glass-panel !rounded-none !border-x-0 !border-t-0">
        <nav className="max-w-[95rem] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--soft-apricot)] rounded-xl">
               <BotMessageSquare className="w-6 h-6 text-[var(--dark-amethyst)]" />
            </div>
            <h1 
              className="text-2xl font-bold tracking-wide" 
              style={{ fontFamily: 'var(--font-fraunces), serif' }}
            >
              AI Code <span className="font-light italic text-[var(--soft-apricot)]">Reviewer</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <StatusIndicator status={status} />
            <motion.div
              whileHover={status === "loading" ? {} : { scale: 1.02 }}
              whileTap={status === "loading" ? {} : { scale: 0.96 }}
              className="transform-gpu"
            >
              <Button 
                  onClick={handleAnalyze} 
                  disabled={status === "loading"}
                  className="gap-2 glass-button-primary hover:bg-[#c9457b] text-white border-none text-base px-6 py-5 rounded-xl transition-all font-semibold"
              >
                {status === "loading" ? "Analyzing..." : "Analyze Code"}
                <Sparkles className="w-5 h-5" />
              </Button>
            </motion.div>
          </div>
        </nav>
      </header>

      {/* Main Split-Pane Layout */}
      <main className="flex-grow max-w-[95rem] mx-auto w-full p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-[1.2fr,1fr] gap-8">
        
        {/* Left Pane - Editor */}
        <div className="glass-panel !rounded-3xl p-6 flex flex-col gap-4">
          <CodeEditor 
            code={code} 
            setCode={setCode}
            suggestions={suggestions}
            onApplyFix={handleApplyFix}
            status={status}
            isApplyingFix={isApplyingFix}
          />
        </div>

        {/* Right Pane - Review */}
        <div className="glass-panel !rounded-3xl p-6 flex flex-col relative overflow-hidden">
          <ReviewDisplay 
            review={review}
            status={status}
            errorMessage={errorMessage}
            streamingText={streamingText}
            onApplyFix={handleApplyFix}
            onRemoveSuggestion={handleRemoveSuggestion}
            isApplyingFix={isApplyingFix}
          />
        </div>

      </main>

      <footer className="py-6 border-t border-zinc-100 dark:border-zinc-800 mt-12 text-center text-zinc-500 text-sm">
        Powered by Google Gemini 2.5 Flash • Built with Next.js &amp; FastAPI
      </footer>
    </div>
    </>
  );
}