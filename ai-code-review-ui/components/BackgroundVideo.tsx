"use client";

import { useEffect, useRef, useState } from "react";

export default function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    
    setIsMobile(mobileQuery.matches);
    
    const handleMobileChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };
    
    mobileQuery.addEventListener('change', handleMobileChange);
    
    if (mediaQuery.matches) {
      setShouldAutoPlay(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }

    // Page visibility API to pause video when tab is inactive
    const handleVisibilityChange = () => {
      if (!videoRef.current) return;
      if (document.hidden) {
        videoRef.current.pause();
      } else if (shouldAutoPlay && !mediaQuery.matches && !isMobile) {
        // Only resume if we were supposed to autoPlay in the first place
        videoRef.current.play().catch(console.error);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mobileQuery.removeEventListener('change', handleMobileChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [shouldAutoPlay, isMobile]);

  if (!hasMounted) return null;

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none w-full h-full bg-[var(--dark-amethyst)]">
      {/* Mobile Fallback Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--dark-amethyst)] via-[#1f0d47] to-[var(--blush-rose)] opacity-40 md:hidden" />
      
      {/* Desktop Video */}
      <video
        ref={videoRef}
        autoPlay={shouldAutoPlay}
        loop
        muted
        playsInline
        preload="auto"
        className="hidden md:block absolute inset-0 w-full h-full object-cover"
      >
        <source src="/background.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[#110330]/55" />
    </div>
  );
}
