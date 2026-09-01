import { BotMessageSquare } from "lucide-react";

export interface LoadingOverlayProps {
  message: string;
  variant?: "fullscreen" | "panel";
  isVisible: boolean;
  className?: string;
}

export default function LoadingOverlay({
  message,
  variant = "panel",
  isVisible,
  className = "",
}: LoadingOverlayProps) {
  if (variant === "fullscreen") {
    const words = message.split(" ");
    
    return (
      <div 
        className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--dark-amethyst)] transition-opacity duration-500 ease-in-out ${!isVisible ? "opacity-0 pointer-events-none" : "opacity-100"} ${className}`}
      >
        {/* Background Radial Gradient */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[var(--blush-rose)] opacity-10 blur-[120px] rounded-full pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[var(--olive-leaf)] opacity-10 blur-[100px] rounded-full pointer-events-none transform -translate-x-1/3 translate-y-1/3" />

        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-[var(--soft-apricot)] rounded-2xl shadow-xl shadow-[var(--soft-apricot)]/10">
               <BotMessageSquare className="w-10 h-10 text-[var(--dark-amethyst)]" />
            </div>
            <h1 
              className="text-4xl sm:text-5xl font-bold tracking-wide text-[var(--frozen-water)]" 
              style={{ fontFamily: 'var(--font-fraunces), serif' }}
            >
              AI Code <span className="font-light italic text-[var(--soft-apricot)]">Reviewer</span>
            </h1>
          </div>

          {/* Loading Indicator */}
          <div className="w-48 h-0.5 bg-white/10 rounded-full overflow-hidden mb-8 relative">
            <div className="absolute top-0 left-0 h-full bg-[var(--blush-rose)] animate-loading-bar rounded-full" />
          </div>

          {/* Animated Text */}
          <div className="flex flex-wrap justify-center gap-[0.35rem] font-mono text-sm sm:text-base text-[var(--frozen-water)]/90 max-w-sm text-center">
            {words.map((word, i) => (
              <span 
                key={i} 
                className="inline-block animate-word-reveal motion-reduce:animate-none opacity-0 motion-reduce:opacity-100 motion-reduce:transform-none"
                style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Panel variant (blur overlay over specific panel)
  return (
    <div 
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#110330]/40 backdrop-blur-[6px] transition-opacity duration-300 pointer-events-none ${isVisible ? "opacity-100" : "opacity-0"} ${className}`}
    >
      {/* We only render the badge if there's a message, else it's just a blur overlay (e.g. for ReviewDisplay) */}
      {message && (
        <div className="flex items-center gap-3 bg-[#110330]/80 px-6 py-4 rounded-2xl shadow-xl border border-white/10">
           <div className="w-5 h-5 border-2 border-white/30 border-t-[var(--soft-apricot)] rounded-full animate-spin motion-reduce:animate-none" />
           <span className="text-[var(--frozen-water)] font-medium tracking-wide animate-pulse motion-reduce:animate-none">
             {message}
           </span>
        </div>
      )}
    </div>
  );
}
