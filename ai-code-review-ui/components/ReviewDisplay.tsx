// frontend/components/ReviewDisplay.tsx
"use client";

import ReactMarkdown from "react-markdown";
import { MessageSquareText, Search, AlertTriangle } from "lucide-react";

interface ReviewDisplayProps {
  review: string;
  status: "idle" | "loading" | "success" | "error";
}

export default function ReviewDisplay({ review, status }: ReviewDisplayProps) {
  return (
    <>
      <div className="flex items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-6">
        <MessageSquareText className="w-5 h-5 text-zinc-400" />
        <h2 className="text-xl font-semibold tracking-tight">AI Engineering Feedback</h2>
      </div>

      <div className="flex-grow relative min-h-[300px]">
        {/* Idle State */}
        {status === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-zinc-500 gap-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-10">
            <Search className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Ready for Review</h3>
            <p className="max-w-xs text-sm">Paste your code in the left panel and click 'Analyze Code' to receive detailed feedback from Gemini AI.</p>
          </div>
        )}

        {/* Loading State Skeleton */}
        {status === "loading" && (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-3/4"></div>
            <div className="h-5 bg-zinc-100 dark:bg-zinc-800 rounded-md w-full"></div>
            <div className="h-5 bg-zinc-100 dark:bg-zinc-800 rounded-md w-5/6"></div>
            <div className="h-40 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-full mt-6"></div>
            <div className="h-5 bg-zinc-100 dark:bg-zinc-800 rounded-md w-4/5"></div>
          </div>
        )}

        {/* Success / Error - Markdown Display */}
        {(status === "success" || status === "error") && review && (
          <div className="prose prose-sm md:prose-base dark:prose-invert prose-zinc max-w-none prose-headings:tracking-tight prose-headings:font-semibold prose-h2:border-b prose-h2:border-zinc-100 prose-h2:dark:border-zinc-800 prose-h2:pb-2 prose-h2:mt-8 prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800 prose-pre:rounded-xl prose-pre:shadow-inner">
            <ReactMarkdown>{review}</ReactMarkdown>
          </div>
        )}
      </div>
    </>
  );
}