"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BotMessageSquare } from "lucide-react";

interface InitialLoaderProps {
  isLoading: boolean;
  onLoadingComplete: () => void;
}

export default function InitialLoader({ isLoading, onLoadingComplete }: InitialLoaderProps) {
  // Enforce exactly 2.5 seconds minimum display time before triggering unmount
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        onLoadingComplete();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, onLoadingComplete]);

  const text = "The reviewer is pouring their first cup of coffee...";
  const words = text.split(" ");

  // Container variants to orchestrate the staggering of children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08, // Stagger words by 80ms
        delayChildren: 0.2, // Small initial delay before staggering starts
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.5,
        ease: "easeInOut" as const
      }
    }
  };

  // 3D falling variant for each word
  const wordVariants = {
    hidden: {
      opacity: 0,
      y: -80, // Starts above
      z: -300, // Backwards in 3D space
      rotateX: 60, // Tilted forward
    },
    visible: {
      opacity: 1,
      y: 0,
      z: 0,
      rotateX: 0,
      transition: {
        type: "spring" as const,
        damping: 12,
        stiffness: 150,
      },
    },
  };

  // Logo drops in first
  const logoVariants = {
    hidden: { opacity: 0, scale: 0.5, y: -50 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: "spring" as const, damping: 15, stiffness: 200 }
    }
  };

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="initial-loader"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--dark-amethyst)]"
          style={{ perspective: 1000 }} // Enable 3D perspective space
        >
          {/* Subtle background glow effect */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[var(--blush-rose)] opacity-10 blur-[120px] rounded-full pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[var(--olive-leaf)] opacity-10 blur-[100px] rounded-full pointer-events-none transform -translate-x-1/3 translate-y-1/3" />

          {/* Main Content */}
          <div className="relative z-10 flex flex-col items-center">
            
            {/* Logo */}
            <motion.div variants={logoVariants} className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-[var(--soft-apricot)] rounded-2xl shadow-xl shadow-[var(--soft-apricot)]/10">
                 <BotMessageSquare className="w-10 h-10 text-[var(--dark-amethyst)]" />
              </div>
              <h1 
                className="text-4xl sm:text-5xl font-bold tracking-wide text-[var(--frozen-water)]" 
                style={{ fontFamily: 'var(--font-fraunces), serif' }}
              >
                AI Code <span className="font-light italic text-[var(--soft-apricot)]">Reviewer</span>
              </h1>
            </motion.div>

            {/* Loading Indicator Bar */}
            <motion.div 
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
              className="w-48 h-0.5 bg-white/10 rounded-full overflow-hidden mb-8 relative"
            >
              <div className="absolute top-0 left-0 h-full bg-[var(--blush-rose)] animate-loading-bar rounded-full" />
            </motion.div>

            {/* Animated 3D Staggered Text */}
            <motion.div 
              className="flex flex-wrap justify-center gap-[0.4rem] font-mono text-sm sm:text-base text-[var(--frozen-water)]/90 max-w-sm text-center"
              style={{ transformStyle: "preserve-3d" }}
            >
              {words.map((word, index) => (
                <motion.span
                  key={index}
                  variants={wordVariants}
                  className="inline-block origin-top"
                >
                  {word}
                </motion.span>
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
