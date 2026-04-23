// frontend/components/ReviewDisplay.tsx
"use client";

import { useState } from "react";
import {
  MessageSquareText,
  Search,
  Bug,
  ShieldAlert,
  Gauge,
  BookOpen,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

// --- Types matching the backend JSON schema ---

export interface ReviewIssue {
  line?: number | null;
  severity: "error" | "warning" | "info";
  title: string;
  description: string;
}

export interface ReviewPositive {
  title: string;
  description: string;
}

export interface ReviewSuggestion {
  line: number;
  severity: "error" | "warning" | "info";
  message: string;
  original?: string;
  replacement?: string;
}

export interface StructuredReview {
  summary: string;
  categories: {
    bugs: ReviewIssue[];
    security: ReviewIssue[];
    performance: ReviewIssue[];
    best_practices: ReviewIssue[];
    positives: ReviewPositive[];
  };
  suggestions: ReviewSuggestion[];
}

interface ReviewDisplayProps {
  review: StructuredReview | null;
  status: "idle" | "loading" | "success" | "error";
  errorMessage?: string;
  streamingText?: string;
  onApplyFix?: (suggestion: ReviewSuggestion) => void;
}

// Tab definitions
const TABS = [
  { id: "summary", label: "Summary", icon: Sparkles },
  { id: "bugs", label: "Bugs", icon: Bug },
  { id: "security", label: "Security", icon: ShieldAlert },
  { id: "performance", label: "Performance", icon: Gauge },
  { id: "best_practices", label: "Practices", icon: BookOpen },
  { id: "positives", label: "Positives", icon: ThumbsUp },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Severity badge component
function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    error:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    warning:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    info: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800",
  };

  return (
    <span
      className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${colors[severity] || colors.info}`}
    >
      {severity}
    </span>
  );
}

// Collapsible issue card
function IssueCard({ issue, index }: { issue: ReviewIssue; index: number }) {
  const [expanded, setExpanded] = useState(index < 3);

  return (
    <div className="group border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden transition-all hover:border-zinc-300 dark:hover:border-zinc-600">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <SeverityBadge severity={issue.severity} />
          <span className="font-medium text-sm truncate">{issue.title}</span>
          {issue.line && (
            <span className="text-xs text-zinc-400 font-mono shrink-0">
              L{issue.line}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-50 dark:border-zinc-800/50">
          {issue.description}
        </div>
      )}
    </div>
  );
}

// Positive card (simpler — no severity)
function PositiveCard({ positive }: { positive: ReviewPositive }) {
  return (
    <div className="border border-emerald-100 dark:border-emerald-900/40 rounded-xl px-4 py-3 bg-emerald-50/50 dark:bg-emerald-900/10">
      <div className="flex items-center gap-2 mb-1">
        <ThumbsUp className="w-4 h-4 text-emerald-500" />
        <span className="font-medium text-sm text-emerald-700 dark:text-emerald-400">
          {positive.title}
        </span>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        {positive.description}
      </p>
    </div>
  );
}

// Suggestion card with Apply Fix button
function SuggestionCard({
  suggestion,
  onApplyFix,
}: {
  suggestion: ReviewSuggestion;
  onApplyFix?: (s: ReviewSuggestion) => void;
}) {
  return (
    <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <SeverityBadge severity={suggestion.severity} />
          <span className="text-sm font-medium">{suggestion.message}</span>
          <span className="text-xs text-zinc-400 font-mono">L{suggestion.line}</span>
        </div>
        {suggestion.replacement && onApplyFix && (
          <button
            onClick={() => onApplyFix(suggestion)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 hover:bg-sky-200 dark:hover:bg-sky-900/50 transition-colors"
          >
            Apply Fix
          </button>
        )}
      </div>
      {(suggestion.original || suggestion.replacement) && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 font-mono text-xs space-y-2">
          {suggestion.original && (
            <div>
              <span className="text-red-500 font-semibold select-none">- </span>
              <span className="text-red-600 dark:text-red-400">{suggestion.original}</span>
            </div>
          )}
          {suggestion.replacement && (
            <div>
              <span className="text-emerald-500 font-semibold select-none">+ </span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {suggestion.replacement}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Count badge for tabs
function CountBadge({ count, color }: { count: number; color: string }) {
  if (count === 0) return null;
  return (
    <span
      className={`ml-1.5 text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full ${color}`}
    >
      {count}
    </span>
  );
}

export default function ReviewDisplay({
  review,
  status,
  errorMessage,
  streamingText,
  onApplyFix,
}: ReviewDisplayProps) {
  const [activeTab, setActiveTab] = useState<TabId>("summary");

  // Count issues per category for badges
  const getCounts = () => {
    if (!review) return { bugs: 0, security: 0, performance: 0, best_practices: 0, positives: 0, summary: 0 };
    return {
      bugs: review.categories.bugs.length,
      security: review.categories.security.length,
      performance: review.categories.performance.length,
      best_practices: review.categories.best_practices.length,
      positives: review.categories.positives.length,
      summary: 0,
    };
  };

  const counts = getCounts();

  const badgeColors: Record<string, string> = {
    bugs: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    security: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    performance: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400",
    best_practices: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
    positives: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    summary: "",
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-4">
        <MessageSquareText className="w-5 h-5 text-zinc-400" />
        <h2 className="text-xl font-semibold tracking-tight">AI Engineering Feedback</h2>
      </div>

      {/* Idle State */}
      {status === "idle" && (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-zinc-500 gap-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-10 min-h-[300px]">
          <Search className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Ready for Review
          </h3>
          <p className="max-w-xs text-sm">
            Paste your code or drop a file in the editor and click &apos;Analyze Code&apos; to receive
            detailed, categorized feedback.
          </p>
        </div>
      )}

      {/* Loading / Streaming State */}
      {status === "loading" && (
        <div className="flex-grow min-h-[300px]">
          {streamingText ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-sky-600 dark:text-sky-400 mb-4">
                <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                Receiving AI analysis...
              </div>
              <pre className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 rounded-xl p-4 overflow-auto max-h-[500px] whitespace-pre-wrap break-words">
                {streamingText}
              </pre>
            </div>
          ) : (
            <div className="space-y-4 animate-pulse">
              <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-3/4"></div>
              <div className="h-5 bg-zinc-100 dark:bg-zinc-800 rounded-md w-full"></div>
              <div className="h-5 bg-zinc-100 dark:bg-zinc-800 rounded-md w-5/6"></div>
              <div className="h-40 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-full mt-6"></div>
              <div className="h-5 bg-zinc-100 dark:bg-zinc-800 rounded-md w-4/5"></div>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {status === "error" && (
        <div className="flex-grow flex flex-col items-center justify-center text-center gap-4 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-dashed border-red-200 dark:border-red-800 p-10 min-h-[300px]">
          <ShieldAlert className="w-12 h-12 text-red-400" />
          <h3 className="text-lg font-medium text-red-700 dark:text-red-400">Analysis Failed</h3>
          <p className="max-w-sm text-sm text-red-600 dark:text-red-400">
            {errorMessage || "Failed to get a response from the AI backend. Please ensure the server is running on port 8000."}
          </p>
        </div>
      )}

      {/* Success — Tabbed Review */}
      {status === "success" && review && (
        <div className="flex-grow flex flex-col min-h-0">
          {/* Tab Bar */}
          <div className="flex gap-1 overflow-x-auto pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800 scrollbar-hide">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  <CountBadge
                    count={counts[tab.id]}
                    color={isActive ? "bg-white/20 text-white dark:bg-zinc-900/30 dark:text-zinc-900" : badgeColors[tab.id]}
                  />
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-grow overflow-y-auto pr-1 space-y-3">
            {/* Summary Tab */}
            {activeTab === "summary" && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800/50 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-700">
                  <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {review.summary}
                  </p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Bugs", count: counts.bugs, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/10" },
                    { label: "Security", count: counts.security, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/10" },
                    { label: "Perf", count: counts.performance, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-900/10" },
                    { label: "Fixes", count: review.suggestions.length, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/10" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={`${stat.bg} rounded-xl p-3 text-center border border-zinc-100 dark:border-zinc-800`}
                    >
                      <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Suggestions in summary */}
                {review.suggestions.length > 0 && (
                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Suggested Fixes
                    </h3>
                    {review.suggestions.map((s, i) => (
                      <SuggestionCard key={i} suggestion={s} onApplyFix={onApplyFix} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Category Tabs */}
            {(activeTab === "bugs" ||
              activeTab === "security" ||
              activeTab === "performance" ||
              activeTab === "best_practices") && (
              <>
                {review.categories[activeTab].length === 0 ? (
                  <div className="text-center py-12 text-zinc-400">
                    <ThumbsUp className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                    <p className="text-sm font-medium">No issues found in this category!</p>
                  </div>
                ) : (
                  review.categories[activeTab].map((issue, i) => (
                    <IssueCard key={i} issue={issue} index={i} />
                  ))
                )}
              </>
            )}

            {/* Positives Tab */}
            {activeTab === "positives" && (
              <>
                {review.categories.positives.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400">
                    <p className="text-sm font-medium">No positives highlighted.</p>
                  </div>
                ) : (
                  review.categories.positives.map((p, i) => (
                    <PositiveCard key={i} positive={p} />
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}