"use client";

import React, { useState, useEffect, ReactNode, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger'; // Ensure ScrollTrigger is imported
import { Sparkles, Zap, ChevronRight } from 'lucide-react';
import ChatInterface from '@/components/ChatInterface'; // Restored original import
import { AuroraText } from '@/components/magicui/aurora-text'; // Restored original import


// Utility for class name concatenation
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

// Component Type Definitions
interface EnhancedGradientTextProps {
  children: ReactNode;
  className?: string;
}

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

// Glassmorphism card component with subtle hover animation
const GlassCard: React.FC<GlassCardProps> = ({ children, className }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure GSAP and the element are available
    if (!gsap || !cardRef.current) return;

    const card = cardRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const xPercent = (x / rect.width - 0.5) * 2.5; // Reduced intensity
      const yPercent = (y / rect.height - 0.5) * 2.5; // Reduced intensity

      gsap.to(card, {
        rotateX: -yPercent,
        rotateY: xPercent,
        duration: 0.6, // Smoother duration
        ease: "power3.out" // Smoother ease
      });
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.8, // Smoother return duration
        ease: "elastic.out(1, 0.7)" // Adjusted elastic ease
      });
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);

    // Cleanup function
    return () => {
      // Check if card.current exists before removing listeners
      if (card) {
          card.removeEventListener('mousemove', handleMouseMove);
          card.removeEventListener('mouseleave', handleMouseLeave);
          // Kill any ongoing animations on unmount to prevent memory leaks
          gsap.killTweensOf(card);
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <div
      ref={cardRef}
      className={cn(
        "backdrop-blur-xl bg-white/15 dark:bg-gray-900/25 border border-white/20 dark:border-gray-800/40 rounded-3xl shadow-xl", // Style adjustments
        "transition-all duration-500 ease-out hover:bg-white/25 dark:hover:bg-gray-800/30 hover:shadow-2xl", // Hover transition
        "transform-gpu perspective-1000", // Hardware acceleration and perspective
        className
      )}
      style={{ willChange: 'transform' }} // Performance hint
    >
      {children}
    </div>
  );
};

// Enhanced gradient text with smoother animation
const EnhancedGradientText: React.FC<EnhancedGradientTextProps> = ({ children, className }) => {
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Ensure GSAP and the element are available
    if (!gsap || !textRef.current) return;

    gsap.to(textRef.current, {
      backgroundPosition: '200% 0%', // Loop adjustment
      duration: 18, // Slower duration
      ease: "none", // Linear for continuous effect
      repeat: -1, // Infinite repeat
      yoyo: true // Move back and forth
    });

    // Cleanup function
    return () => {
        // Kill animation on unmount
        if (textRef.current) {
            gsap.killTweensOf(textRef.current);
        }
    };
  }, []); // Empty dependency array

  return (
    <span
      ref={textRef}
      className={cn(
        "bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-500 via-violet-600 to-indigo-500",
        className
      )}
      style={{
        backgroundSize: '300% 100%',
        backgroundPosition: '0% 0%',
        willChange: 'background-position' // Performance hint
      }}
    >
      {children}
    </span>
  );
};

export default function HomePage() {
  // Refs for GSAP animations
  const mainRef = useRef<HTMLElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Set mounted state after component mounts
    setMounted(true);

    // Optional: Set smooth scrolling on the HTML element
    if (typeof window !== 'undefined' && document.documentElement) {
      document.documentElement.style.scrollBehavior = 'smooth';
      // Cleanup scroll behavior on unmount
      return () => {
        if (document.documentElement) {
            document.documentElement.style.scrollBehavior = '';
        }
      };
    }
  }, []); // Runs only once on mount

  // GSAP Animations Effect
  useEffect(() => {
    // Ensure GSAP, ScrollTrigger, and window are available, and component is mounted
    if (gsap && ScrollTrigger && mounted && typeof window !== 'undefined') {

      // *** FIX: Register ScrollTrigger plugin ***
      gsap.registerPlugin(ScrollTrigger);

      // Enhanced smooth settings
      gsap.defaults({
        ease: "power4.out",
        duration: 1.5,
        transformPerspective: 1000,
        transformOrigin: "center center"
      });

      // Safe element references with type checking
      const elements = {
        chat: chatContainerRef.current,
        header: [badgeRef.current, headingRef.current].filter(Boolean),
        content: [
          paragraphRef.current,
          ...(tagsRef.current?.children ? Array.from(tagsRef.current.children) : [])
        ].filter(Boolean),
        features: featuresRef.current?.children ? Array.from(featuresRef.current.children) : [],
        footer: footerRef.current
      };

      // Type-safe initial states
      const elementsToAnimate = [
        elements.chat,
        ...elements.header,
        ...elements.content,
        ...elements.features,
        elements.footer
      ].filter(Boolean) as Element[]; // Assert as Element[] for GSAP

      // Reset initial states
      gsap.set(elementsToAnimate, {
        opacity: 0,
        y: 30,
        scale: 0.95,
        force3D: true,
        clearProps: "transform" // Clear only transform initially
      });

      // Create smooth timeline
      const tl = gsap.timeline({
        smoothChildTiming: true,
        defaults: {
          ease: "power4.out",
          duration: 1.2
        }
      });

      // Type-safe animations
      if (elements.chat) {
        tl.add('start')
          .to(elements.chat, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1.8,
            ease: "expo.out",
            clearProps: "all" // Clear all props after animation
          });
      }
      if (elements.header.length > 0) {
        tl.to(elements.header as Element[], { // Assert type for GSAP
          opacity: 1,
          y: 0,
          scale: 1,
          stagger: 0.15,
          duration: 1.4,
          clearProps: "all"
        }, '-=1.4');
      }
      if (elements.content.length > 0) {
        tl.to(elements.content as Element[], { // Assert type for GSAP
          opacity: 1,
          y: 0,
          scale: 1,
          stagger: 0.08,
          duration: 1.2,
          clearProps: "all"
        }, '-=1.2');
      }

      // Floating animation for features (applied after initial reveal)
      let floatingTween: gsap.core.Tween | null = null;
      if (elements.features.length > 0) {
        tl.to(elements.features as Element[], { // Assert type for GSAP
          opacity: 1,
          y: 0,
          scale: 1,
          stagger: {
            each: 0.15,
            ease: "power4.inOut",
          },
          clearProps: "all",
          onComplete: () => {
            // Start floating animation only after the initial reveal is complete
            if (elements.features.length > 0) {
              floatingTween = gsap.to(elements.features as Element[], { // Assert type for GSAP
                y: -8,
                duration: 2.5,
                ease: "sine.inOut",
                stagger: {
                  each: 0.3,
                  repeat: -1,
                  yoyo: true,
                  ease: "none" // Use linear ease for smooth looping yoyo
                }
              });
            }
          }
        }, '-=0.8');
      }

      if (elements.footer) {
        tl.to(elements.footer, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1,
          clearProps: "all"
        }, '-=0.6');
      }

      // Type-safe scroll animations for features using ScrollTrigger.batch
      let batchTween: gsap.core.Tween | null = null;
      if (elements.features.length > 0) {
        // Ensure elements are treated as an array of Elements for batch
        const featureElements = elements.features as Element[];
        ScrollTrigger.batch(featureElements, {
          // Reset opacity/transform before entering viewport if needed
          onEnter: batch => {
            batchTween = gsap.to(batch, {
              opacity: 1,
              y: 0,
              scale: 1,
              stagger: 0.15,
              duration: 0.8, // Slightly faster for scroll trigger
              ease: "power3.out",
              overwrite: true // Overwrite previous tweens like the initial fade-in
            });
          },
          // Optional: Fade out when leaving viewport
          onLeaveBack: batch => gsap.to(batch, { opacity: 0, y: 20, scale: 0.95, stagger: 0.1, duration: 0.5, ease: "power2.in", overwrite: true }),
          start: "top bottom-=100px", // Trigger when top of element is 100px from bottom of viewport
          end: "bottom top+=100px", // End when bottom of element is 100px above top of viewport
         
        });
      }

      // Cleanup function
      return () => {
        // Kill all GSAP tweens and ScrollTriggers associated with this component
        tl.kill();
        if (floatingTween) floatingTween.kill();
        if (batchTween) batchTween.kill();
        // Kill tweens specifically targeting the elements
        gsap.killTweensOf(elementsToAnimate);
        // Kill all ScrollTrigger instances created by this component
        ScrollTrigger.getAll().forEach(st => {
          // Check if the trigger element is one of the features before killing
          // This is a safety measure if multiple components use ScrollTrigger
          if (elements.features.includes(st.trigger as Element)) {
            st.kill();
          }
        });
      };
    }
  }, [mounted]); // Rerun effect if mounted state changes

  // Enhanced loading state with smooth transition
  if (!mounted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-950 to-gray-900">
        <div className="text-white space-y-4 text-center transform transition-all duration-1000 ease-out">
          <div className="relative animate-pulse">
            <EnhancedGradientText className="text-3xl font-medium">
              Loading Aura Interface...
            </EnhancedGradientText>
            <div className="absolute -inset-4 bg-white/5 rounded-lg blur-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Render the main component structure
  return (
    // Main container with gradient background and font settings
    <main ref={mainRef} className="relative min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-slate-50 via-violet-50/5 to-indigo-50/10 dark:from-gray-950 dark:via-violet-950/10 dark:to-indigo-950/10 font-sans">
       {/* Background decorative elements */}
       <div className="fixed inset-0 w-full h-full pointer-events-none -z-10">
        {/* Animated blur shapes */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-fuchsia-400/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-violet-400/10 rounded-full blur-3xl animate-pulse-slow animation-delay-200" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl animate-pulse-slow animation-delay-400" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse-slow" />
        {/* Radial gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(167,139,250,0.05),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.05),transparent_50%)]" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(128,128,128,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      </div>

      {/* Main content container with padding */}
      <div className="relative z-10 container mx-auto px-4 py-12 md:py-16 lg:py-20 min-h-screen flex flex-col items-center">

        {/* Animated Badge */}
        <div ref={badgeRef} className="group relative mb-6 flex items-center justify-center rounded-full px-5 py-2 shadow-[inset_0_-8px_10px_#8fdfff1f]">
          {/* Animated gradient border */}
          <span
            className="absolute inset-0 block h-full w-full animate-gradient rounded-full bg-gradient-to-r from-fuchsia-500/20 via-violet-500/20 to-indigo-500/20 bg-300%"
            style={{
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "destination-out",
              maskComposite: "subtract",
              backgroundSize: '300% 100%' // For gradient animation
            }}
            aria-hidden="true"
          />
          <Sparkles className="size-4 text-fuchsia-500" aria-hidden="true" />
          <hr className="mx-2 h-4 w-px shrink-0 bg-gray-300 dark:bg-gray-700" aria-hidden="true" />
          {/* Enhanced Gradient Text for Badge */}
          <EnhancedGradientText className="text-sm font-semibold tracking-wide">
            AURA 2.0
          </EnhancedGradientText>
          <ChevronRight
            className="ml-1 size-4 stroke-gray-400 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </div>

        {/* Animated Header Section */}
        <div className="w-full max-w-4xl mb-12 text-center space-y-6">
          {/* Animated Heading with Aurora Text */}
          <h1 ref={headingRef} className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
             {/* Using the imported AuroraText component */}
             <AuroraText>Aura Chat</AuroraText>
          </h1>

          {/* Animated Paragraph */}
          <p ref={paragraphRef} className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-light">
            Experience the next generation of emotional intelligence in conversations,
            powered by advanced neural architecture.
          </p>

          {/* Animated Tags Container */}
          <div ref={tagsRef} className="flex flex-wrap justify-center gap-2">
            {/* Individual tags (animated as part of tagsRef) */}
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 transition-transform duration-200 hover:scale-105">
              <Zap className="mr-1 size-3" aria-hidden="true" /> Real-time
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 transition-transform duration-200 hover:scale-105">
              Sentiment Analysis
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 transition-transform duration-200 hover:scale-105">
              Contextual
            </span>
          </div>
        </div>

        {/* Animated Chat Interface Container */}
        <div ref={chatContainerRef} className="w-full max-w-3xl mx-auto">
          {/* Glass Card containing the chat interface */}
          <GlassCard className="p-1 md:p-2">
             {/* Inner container for chat styling */}
             <div className="bg-white/70 dark:bg-gray-900/70 rounded-2xl h-[500px] overflow-hidden shadow-inner">
               {/* Using the imported ChatInterface component */}
               <ChatInterface />
             </div>
          </GlassCard>
        </div>

        {/* Animated Features Section */}
        <div ref={featuresRef} className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto w-full">
          {/* Feature Card 1 (animated as part of featuresRef) */}
          <GlassCard className="p-6 text-center group">
            <div className="mb-4 size-12 mx-auto rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-300 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[-6deg]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Contextual Memory</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Remembers conversation history for natural dialogue</p>
          </GlassCard>

          {/* Feature Card 2 */}
          <GlassCard className="p-6 text-center group">
            <div className="mb-4 size-12 mx-auto rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-300 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[6deg]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Emotion Detection</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Analyzes and responds to emotional context</p>
          </GlassCard>

          {/* Feature Card 3 */}
          <GlassCard className="p-6 text-center group">
            <div className="mb-4 size-12 mx-auto rounded-xl bg-fuchsia-100 dark:bg-fuchsia-900/30 flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-300 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[-6deg]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Personalization</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Adapts responses to your communication style</p>
          </GlassCard>
        </div>

        {/* Animated Footer Section */}
        <footer ref={footerRef} className="mt-auto pt-20 pb-10 text-center">
          <div className="flex items-center justify-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
            <span>Powered by</span>
            {/* Enhanced Gradient Text in Footer */}
            <EnhancedGradientText className="font-medium">
              advanced emotional intelligence
            </EnhancedGradientText>
          </div>
          <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            © 2025 Aura AI • Version 2.4.1 {/* Example version */}
          </div>
        </footer>
      </div>

    </main>
  )
}
