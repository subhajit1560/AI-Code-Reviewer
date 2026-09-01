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
  Check,
} from "lucide-react";
import { motion } from "framer-motion";
import LoadingOverlay from "./LoadingOverlay";
import FadeInView from "./FadeInView";

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
  onRemoveSuggestion?: (suggestion: ReviewSuggestion) => void;
  isApplyingFix?: boolean;
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
    error: "bg-[var(--blush-rose)] text-[var(--dark-amethyst)] border-transparent",
    warning: "bg-[var(--soft-apricot)] text-[var(--dark-amethyst)] border-transparent",
    info: "bg-[var(--olive-leaf)] text-white border-transparent",
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

  const borderColors: Record<string, string> = {
    error: "border-l-[var(--blush-rose)]",
    warning: "border-l-[var(--soft-apricot)]",
    info: "border-l-[var(--olive-leaf)]",
  };

  return (
    <FadeInView direction="up">
      <div className={`group glass-card border-l-4 ${borderColors[issue.severity] || "border-l-[var(--olive-leaf)]"} overflow-hidden transition-all hover:bg-white/5 text-[var(--frozen-water)]`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <SeverityBadge severity={issue.severity} />
            <span className="font-medium text-sm truncate">{issue.title}</span>
            {issue.line && (
              <span className="text-xs opacity-50 font-mono shrink-0">
                L{issue.line}
              </span>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 opacity-50 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
          )}
        </button>
        {expanded && (
          <div className="px-4 pb-4 pt-3 border-t border-white/10">
            <div className="bg-black/50 rounded-lg p-3 text-sm opacity-95 leading-relaxed shadow-inner">
              {issue.description}
            </div>
          </div>
        )}
      </div>
    </FadeInView>
  );
}

// Positive card (simpler — no severity)
function PositiveCard({ positive }: { positive: ReviewPositive }) {
  return (
    <div className="glass-card border-l-4 border-l-[var(--olive-leaf)] px-4 py-3 text-[var(--frozen-water)]">
      <div className="flex items-center gap-2 mb-2">
        <ThumbsUp className="w-4 h-4 text-[var(--olive-leaf)]" />
        <span className="font-medium text-sm">
          {positive.title}
        </span>
      </div>
      <div className="bg-black/50 rounded-lg p-3 text-sm opacity-95 leading-relaxed shadow-inner">
        {positive.description}
      </div>
    </div>
  );
}

// Suggestion card with Apply Fix button
function SuggestionCard({
  suggestion,
  onApplyFix,
  onRemove,
}: {
  suggestion: ReviewSuggestion;
  onApplyFix?: (s: ReviewSuggestion) => void | Promise<void>;
  onRemove?: (s: ReviewSuggestion) => void;
}) {
  const [isFixed, setIsFixed] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleApply = async () => {
    if (!onApplyFix) return;
    await onApplyFix(suggestion);
    setIsFixed(true);
    
    setTimeout(() => {
      // Check prefers-reduced-motion
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        if (onRemove) onRemove(suggestion);
      } else {
        setIsExiting(true);
        setTimeout(() => {
          if (onRemove) onRemove(suggestion);
        }, 300); // 300ms for exit transition
      }
    }, 1500); // wait 1.5s showing "Fixed"
  };

  const borderColors: Record<string, string> = {
    error: "border-l-[var(--blush-rose)]",
    warning: "border-l-[var(--soft-apricot)]",
    info: "border-l-[var(--olive-leaf)]",
  };

  return (
    <FadeInView direction="up">
      <div className={`grid transition-all duration-300 ease-in motion-reduce:transition-none ${isExiting ? 'grid-rows-[0fr] opacity-0 !mt-0' : 'grid-rows-[1fr] opacity-100'}`}>
      <div className="overflow-hidden">
        <div className={`glass-card border-l-4 ${borderColors[suggestion.severity] || "border-l-[var(--olive-leaf)]"} overflow-hidden text-[var(--frozen-water)]`}>
          <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <SeverityBadge severity={suggestion.severity} />
          <span className="text-sm font-medium">{suggestion.message}</span>
          <span className="text-xs opacity-50 font-mono">L{suggestion.line}</span>
        </div>
        {onApplyFix && (
          <motion.button
            whileHover={isFixed ? {} : { scale: 1.05 }}
            whileTap={isFixed ? {} : { scale: 0.95 }}
            onClick={handleApply}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 transform-gpu ${
              isFixed
                ? "bg-white text-[var(--olive-leaf)] border border-white/20 shadow-sm"
                : "glass-button-success hover:bg-[#345512] text-white"
            }`}
            style={{ width: "88px", height: "32px" }}
          >
            {isFixed ? (
              <>
                <Check className="w-3.5 h-3.5 animate-check-pop text-[var(--olive-leaf)]" />
                <span className="animate-label-fade">Fixed</span>
              </>
            ) : (
              <span>Apply Fix</span>
            )}
          </motion.button>
        )}
      </div>
      {(suggestion.original || suggestion.replacement) && (
        <div className="border-t border-white/20 bg-[#1e1e1e] text-[#d4d4d4] px-4 py-3 font-mono text-xs space-y-2">
          {suggestion.original && (
            <div className="bg-[#4b1818]/50 px-2 py-1 rounded">
              <span className="text-[#f14c4c] font-semibold select-none">- </span>
              <span>{suggestion.original}</span>
            </div>
          )}
          {suggestion.replacement && (
            <div className="bg-[#1b432e]/50 px-2 py-1 rounded mt-1">
              <span className="text-[#3fb950] font-semibold select-none">+ </span>
              <span>{suggestion.replacement}</span>
            </div>
          )}
        </div>
      )}
        </div>
      </div>
      </div>
    </FadeInView>
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
  onRemoveSuggestion,
  isApplyingFix = false,
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
    bugs: "bg-[var(--blush-rose)] text-[var(--dark-amethyst)] border-transparent",
    security: "bg-[var(--blush-rose)] text-[var(--dark-amethyst)] border-transparent",
    performance: "bg-[var(--soft-apricot)] text-[var(--dark-amethyst)] border-transparent",
    best_practices: "bg-[var(--olive-leaf)] text-white border-transparent",
    positives: "bg-[var(--olive-leaf)] text-white border-transparent",
    summary: "",
  };

  return (
    <>
      <div className={`flex flex-col h-full w-full transition-opacity duration-300 ${isApplyingFix ? "pointer-events-none opacity-50" : ""}`}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-4">
        <MessageSquareText className="w-5 h-5 text-[var(--frozen-water)] opacity-80" />
        <h2 className="text-xl font-semibold tracking-tight text-[var(--frozen-water)]">AI Engineering Feedback</h2>
      </div>

      {/* Idle State */}
      {status === "idle" && (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-[var(--frozen-water)]/80 gap-4 bg-white/5 border border-dashed border-white/20 rounded-2xl p-10 min-h-[300px]">
          <Search className="w-12 h-12 text-[var(--frozen-water)]/40" />
          <h3 className="text-lg font-medium text-[var(--frozen-water)]">
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
              <div className="flex items-center gap-2 text-sm text-[var(--frozen-water)] font-medium mb-4">
                <div className="w-4 h-4 border-2 border-white/30 border-t-[var(--blush-rose)] rounded-full animate-spin" />
                Receiving AI analysis...
              </div>
              <pre className="text-xs font-mono text-[var(--frozen-water)]/90 bg-[#1e1e1e]/80 rounded-xl p-4 overflow-auto max-h-[500px] whitespace-pre-wrap break-words border border-white/10 shadow-inner">
                {streamingText}
              </pre>
            </div>
          ) : (
            <div className="space-y-4 animate-pulse opacity-60">
              <div className="h-8 bg-white/10 rounded-lg w-3/4"></div>
              <div className="h-5 bg-white/5 rounded-md w-full"></div>
              <div className="h-5 bg-white/5 rounded-md w-5/6"></div>
              <div className="h-40 bg-white/5 rounded-xl w-full mt-6 border border-white/10"></div>
              <div className="h-5 bg-white/5 rounded-md w-4/5"></div>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {status === "error" && (
        <div className="flex-grow flex flex-col items-center justify-center text-center gap-4 bg-[var(--blush-rose)]/10 rounded-2xl border border-dashed border-[var(--blush-rose)]/50 p-10 min-h-[300px]">
          <ShieldAlert className="w-12 h-12 text-[var(--blush-rose)]" />
          <h3 className="text-lg font-medium text-[var(--blush-rose)]">Analysis Failed</h3>
          <p className="max-w-sm text-sm text-[var(--blush-rose)]/90">
            {errorMessage || "Failed to get a response from the AI backend. Please ensure the server is running on port 8000."}
          </p>
        </div>
      )}

      {/* Success — Tabbed Review */}
      {status === "success" && review && (
        <div className="flex-grow flex flex-col min-h-0">
          {/* Tab Bar */}
          <div className="flex gap-1 overflow-x-auto pb-3 mb-4 border-b border-white/10 scrollbar-hide">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                    isActive
                      ? "bg-white/10 text-white border-[var(--blush-rose)] shadow-sm"
                      : "text-white/60 border-transparent hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  <CountBadge
                    count={counts[tab.id]}
                    color={isActive ? "bg-white/20 text-white" : badgeColors[tab.id]}
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
                <div className="glass-panel p-5 border border-white/10">
                  <p className="text-sm leading-relaxed text-[var(--frozen-water)] font-medium">
                    {review.summary}
                  </p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Bugs", count: counts.bugs, color: "text-white", bg: "glass-card" },
                    { label: "Security", count: counts.security, color: "text-white", bg: "glass-card" },
                    { label: "Perf", count: counts.performance, color: "text-[var(--frozen-water)]", bg: "glass-card" },
                    { label: "Fixes", count: review.suggestions.length, color: "text-white", bg: "glass-card" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={`${stat.bg} p-3 text-center border border-white/10 shadow-sm`}
                    >
                      <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
                      <div className={`text-xs mt-0.5 opacity-90 ${stat.color}`}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Suggestions in summary */}
                {review.suggestions.length > 0 ? (
                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-semibold text-[var(--frozen-water)]">
                      Suggested Fixes
                    </h3>
                    {review.suggestions.map((s, i) => (
                      <SuggestionCard 
                        key={i} 
                        suggestion={s} 
                        onApplyFix={onApplyFix} 
                        onRemove={onRemoveSuggestion} 
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 p-8 rounded-2xl border border-dashed border-[var(--olive-leaf)]/40 bg-[var(--olive-leaf)]/10 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-300 fill-mode-forwards">
                    <div className="bg-[var(--olive-leaf)]/20 p-3 rounded-full mb-3">
                      <Check className="w-6 h-6 text-[var(--olive-leaf)]" />
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--olive-leaf)]">
                      All suggestions applied
                    </h3>
                    <p className="text-xs text-[var(--olive-leaf)]/80 mt-1">
                      Your code looks good!
                    </p>
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
                  <div className="text-center py-12 text-[var(--dark-amethyst)]/50">
                    <ThumbsUp className="w-8 h-8 mx-auto mb-2 text-[var(--olive-leaf)]" />
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
                  <div className="text-center py-12 text-[var(--dark-amethyst)]/50">
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
      
      </div>

      {/* Loading Overlay for Apply Fix */}
      <LoadingOverlay 
        variant="panel" 
        message="" 
        isVisible={isApplyingFix} 
      />
    </>
  );
}