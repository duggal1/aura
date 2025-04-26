"use client";

import React, { useState, useEffect, ReactNode, useRef } from 'react';
import { gsap } from 'gsap';
import { Sparkles, Zap, ChevronRight } from 'lucide-react';
import ChatInterface from '@/components/ChatInterface';
import { AuroraText } from '@/components/magicui/aurora-text';

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
    if (!cardRef.current) return;
    
    const card = cardRef.current;
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const xPercent = (x / rect.width - 0.5) * 3;
      const yPercent = (y / rect.height - 0.5) * 3;
      
      gsap.to(card, {
        rotateX: -yPercent,
        rotateY: xPercent,
        duration: 0.4,
        ease: "power2.out"
      });
    };
    
    const handleMouseLeave = () => {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.6,
        ease: "elastic.out(1, 0.5)"
      });
    };
    
    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);
  
  return (
    <div
      ref={cardRef}
      className={cn(
        "backdrop-blur-lg bg-white/10 dark:bg-gray-900/20 border border-white/20 dark:border-gray-800/30 rounded-3xl shadow-xl",
        "transition-all duration-500 ease-out hover:bg-white/20 dark:hover:bg-gray-800/20 hover:shadow-2xl",
        "transform-gpu perspective-1000",
        className
      )}
      style={{ willChange: 'transform' }}
    >
      {children}
    </div>
  );
};

// Enhanced gradient text with smoother animation
const EnhancedGradientText: React.FC<EnhancedGradientTextProps> = ({ children, className }) => {
  const textRef = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    if (!textRef.current) return;
    
    gsap.to(textRef.current, {
      backgroundPosition: '100% 0%',
      duration: 15,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true
    });
  }, []);
  
  return (
    <span
      ref={textRef}
      className={cn(
        "bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-500 via-violet-600 to-indigo-500",
        className
      )}
      style={{ 
        backgroundSize: '300% 100%',
        backgroundPosition: '0% 0%'
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
    setMounted(true);
    
    // Ensure smooth scrolling
    if (typeof window !== 'undefined' && document.body) {
      document.body.style.scrollBehavior = 'smooth';
      return () => {
        document.body.style.scrollBehavior = '';
      };
    }
  }, []);

  // GSAP Animations Effect
  useEffect(() => {
    if (typeof window !== 'undefined' && mounted) {
      const ultraSmoothEase = "expo.out";
      
      const tl = gsap.timeline({ 
        defaults: { 
          ease: ultraSmoothEase,
          duration: 0.9
        } 
      });

      // Elements for animation
      const badgeEl = badgeRef.current;
      const headingEl = headingRef.current;
      const paragraphEl = paragraphRef.current;
      const tagEls = tagsRef.current ? gsap.utils.toArray(tagsRef.current.children) : [];
      const chatContainerEl = chatContainerRef.current;
      const featureCardEls = featuresRef.current ? gsap.utils.toArray(featuresRef.current.children) : [];
      const footerEl = footerRef.current;

      // Initial state - subtle offsets
      gsap.set([
        badgeEl,
        headingEl,
        paragraphEl,
        tagEls,
        chatContainerEl,
        featureCardEls,
        footerEl
      ], {
        opacity: 0,
        y: 25,
        scale: 0.99
      });

      // Refined animation sequence
      tl.to(badgeEl, { opacity: 1, y: 0, scale: 1 }, 0.1)
        .to(headingEl, { opacity: 1, y: 0, scale: 1 }, 0.3)
        .to(paragraphEl, { opacity: 1, y: 0, scale: 1 }, 0.4)
        .to(tagEls, { 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          stagger: 0.07
        }, 0.5)
        .to(chatContainerEl, { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          duration: 1.1
        }, 0.6)
        .to(featureCardEls, { 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          stagger: 0.1,
          onComplete: () => {
            // Add subtle floating animations for feature cards
            gsap.to(featureCardEls, {
              y: -3,
              duration: 1.8,
              ease: "sine.inOut",
              stagger: 0.2,
              repeat: -1,
              yoyo: true,
              yoyoEase: "sine.inOut"
            });
          }
        }, 0.7)
        .to(footerEl, { opacity: 1, y: 0, scale: 1 }, 0.9);
    }
  }, [mounted]);

  // Optional: Render null or a loader until mounted
   if (!mounted) {
     // Basic loader to prevent flash of unstyled content
     return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">Loading Aura...</div>;
   }

  return (
    <main ref={mainRef} className="relative min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-slate-50 via-violet-50/5 to-indigo-50/10 dark:from-gray-950 dark:via-violet-950/10 dark:to-indigo-950/10 font-sans">
       {/* Background elements - Kept existing CSS animations */}
      <div className="fixed inset-0 w-full h-full pointer-events-none -z-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-fuchsia-400/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-violet-400/10 rounded-full blur-3xl animate-pulse-slow animation-delay-200" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl animate-pulse-slow animation-delay-400" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(167,139,250,0.05),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.05),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(128,128,128,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      </div>

      {/* Main content container */}
      <div className="relative z-10 container mx-auto px-4 py-12 md:py-16 lg:py-20 min-h-screen flex flex-col items-center"> {/* Added responsive padding */}

        {/* Badge - Animated by GSAP */}
        <div ref={badgeRef} className="group relative mb-6 flex items-center justify-center rounded-full px-5 py-2 shadow-[inset_0_-8px_10px_#8fdfff1f]">
          <span
            className="absolute inset-0 block h-full w-full animate-gradient rounded-full bg-gradient-to-r from-fuchsia-500/20 via-violet-500/20 to-indigo-500/20 bg-300%"
            style={{
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "destination-out",
              maskComposite: "subtract",
              backgroundSize: '300% 100%' // Ensure background size is set for animation
            }}
            aria-hidden="true"
          />
          <Sparkles className="size-4 text-fuchsia-500" aria-hidden="true" />
          <hr className="mx-2 h-4 w-px shrink-0 bg-gray-300 dark:bg-gray-700" aria-hidden="true" />
          <EnhancedGradientText className="text-sm font-semibold tracking-wide">
            AURA 2.0
          </EnhancedGradientText>
          <ChevronRight
            className="ml-1 size-4 stroke-gray-400 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </div>

        {/* Header section - Animated by GSAP */}
        <div className="w-full max-w-4xl mb-12 text-center space-y-6">
          <h1 ref={headingRef} className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 dark:text-gray-100"> {/* Responsive font size */}
         
             <AuroraText>Aura Chat</AuroraText>
          </h1>

          <p ref={paragraphRef} className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-light"> {/* Responsive font size */}
            Experience the next generation of emotional intelligence in conversations,
            powered by advanced neural architecture.
          </p>

          <div ref={tagsRef} className="flex flex-wrap justify-center gap-2">
            {/* Tags remain the same, animated as a group */}
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

        {/* Chat interface container - Animated by GSAP */}
        <div ref={chatContainerRef} className="w-full max-w-3xl mx-auto">
          <GlassCard className="p-1 md:p-2">
             <div className="bg-white/70 dark:bg-gray-900/70 rounded-2xl h-[500px] overflow-hidden shadow-inner"> {/* Adjusted opacity and added inner shadow */}
           
               <ChatInterface />
             </div>
          </GlassCard>
        </div>

        {/* Features section - Cards animated by GSAP */}
        <div ref={featuresRef} className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto w-full">
          {/* Feature Card 1 */}
          <GlassCard className="p-6 text-center group">
            {/* Icon container with smoother hover transition */}
            <div className="mb-4 size-12 mx-auto rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-300 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[-6deg]"> {/* Added ease-out and slight rotation */}
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Contextual Memory</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Remembers conversation history for natural dialogue</p>
          </GlassCard>

          {/* Feature Card 2 */}
          <GlassCard className="p-6 text-center group">
            <div className="mb-4 size-12 mx-auto rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-300 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[6deg]"> {/* Added ease-out and slight rotation */}
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Emotion Detection</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Analyzes and responds to emotional context</p>
          </GlassCard>

          {/* Feature Card 3 */}
          <GlassCard className="p-6 text-center group">
            <div className="mb-4 size-12 mx-auto rounded-xl bg-fuchsia-100 dark:bg-fuchsia-900/30 flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-300 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[-6deg]"> {/* Added ease-out and slight rotation */}
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Personalization</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Adapts responses to your communication style</p>
          </GlassCard>
        </div>

        {/* Footer section - Animated by GSAP */}
        <footer ref={footerRef} className="mt-auto pt-20 pb-10 text-center"> {/* Increased vertical padding */}
          <div className="flex items-center justify-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
            <span>Powered by</span>
            <EnhancedGradientText className="font-medium">
              advanced emotional intelligence
            </EnhancedGradientText>
          </div>
          <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            © 2025 Aura AI • Version 2.4.1 {/* Updated example version */}
          </div>
        </footer>
      </div>

    </main>
  )
}
