// frontend/components/StatusIndicator.tsx
import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "idle" | "loading" | "success" | "error";
}

const statusMap = {
  idle: { color: "bg-zinc-300", text: "AI Offline" },
  loading: { color: "bg-sky-500 animate-pulse", text: "Gemini is thinking..." },
  success: { color: "bg-emerald-500", text: "Analysis Complete" },
  error: { color: "bg-red-500", text: "Analysis Failed" },
};

export default function StatusIndicator({ status }: StatusIndicatorProps) {
  const { color, text } = statusMap[status];

  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400">
      <span className={cn("w-2.5 h-2.5 rounded-full", color)} />
      {text}
    </div>
  );
}