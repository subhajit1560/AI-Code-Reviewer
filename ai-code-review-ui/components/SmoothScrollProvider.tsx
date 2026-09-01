"use client";

import { ReactLenis } from 'lenis/react';
import { useReducedMotion } from 'framer-motion';

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  // Disable smooth scroll if accessibility settings request reduced motion
  if (shouldReduceMotion) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
