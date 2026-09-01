"use client";

import { motion, useReducedMotion } from 'framer-motion';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex-grow flex flex-col"
    >
      {children}
    </motion.div>
  );
}
