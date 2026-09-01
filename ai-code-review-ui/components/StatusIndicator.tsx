// frontend/components/StatusIndicator.tsx
import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "idle" | "loading" | "success" | "error";
}

const statusMap = {
  idle: { color: "bg-[var(--soft-apricot)]", text: "AI Offline" },
  loading: { color: "bg-[var(--frozen-water)] animate-pulse", text: "Gemini is thinking..." },
  success: { color: "bg-[var(--olive-leaf)]", text: "Analysis Complete" },
  error: { color: "bg-[var(--blush-rose)]", text: "Analysis Failed" },
};

export default function StatusIndicator({ status }: StatusIndicatorProps) {
  const { color, text } = statusMap[status];

  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 text-sm font-medium text-[var(--frozen-water)]">
      <span className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]", color)} />
      {text}
    </div>
  );
}