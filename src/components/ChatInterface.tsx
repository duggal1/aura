"use client";

import { useTheme } from "next-themes";
import React, { useState, useRef, useEffect, useCallback, FormEvent } from 'react';

// --- Types (matching backend schemas) ---
interface EmotionDistribution {
  root: Record<string, number>;
}

interface EmotionAnalysisResult {
  distribution: EmotionDistribution;
  primary_emotion: string;
  primary_score: number;
  intensity: number;
  secondary_emotions: Array<{ label: string; score: number }>;
  model_used: string;
}

interface ChatResponseData {
  ai_response: string;
  user_emotion_analysis: EmotionAnalysisResult;
  response_id: string;
  model_used: string;
  from_cache: boolean;
}

interface Message {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: number;
  emotionAnalysis?: EmotionAnalysisResult | null;
}

// --- Constants ---
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// --- Theme Context (Still present but unused directly in this component) ---




// --- Helper Components ---

// ThemeSwitcher (Unchanged)
const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full transition-all duration-300 hover:bg-white/50 dark:hover:bg-zinc-800 backdrop-blur-md"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
};

// LoadingSpinner (Unchanged)
const LoadingSpinner: React.FC<{ size?: string }> = ({ size = 'h-5 w-5' }) => (
  <div className={`${size} relative`}>
    <div className="absolute inset-0 rounded-full border border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
  </div>
);

// EmotionDisplay Component (Unchanged)
const EmotionDisplay: React.FC<{ analysis: EmotionAnalysisResult | null | undefined }> = ({ analysis }) => {
  if (!analysis?.distribution?.root) {
      console.warn("EmotionDisplay: No analysis or distribution root found.");
      return null;
  }

  // Color mapping for different emotions
  const colorMap: Record<string, string> = {
    happy: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    sad: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    angry: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    fearful: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
    surprised: 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20',
    disgusted: 'bg-lime-600/10 text-lime-600 border-lime-600/20',
    neutral: 'bg-gray-400/10 text-gray-500 border-gray-400/20',
    love: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    optimism: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    pessimism: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    sarcastic: 'bg-yellow-600/10 text-yellow-600 border-yellow-600/20',
  };

  const distribution = analysis.distribution.root;
  // Convert to array and sort by score descending
  const sortedEmotions = Object.entries(distribution)
    .map(([label, score]) => ({ label, score }))
    .sort((a, b) => b.score - a.score);

  if (sortedEmotions.length === 0) {
      console.warn("EmotionDisplay: Distribution provided but resulted in zero sorted emotions.");
      return null;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-2" aria-label="Detected Emotions">
      {sortedEmotions.map(({ label, score }) => {
        const badgeClass = colorMap[label] || colorMap['neutral']; // Fallback to neutral
        return (
          <span
            key={label}
            className={`px-2 py-0.5 rounded-full text-xs border ${badgeClass} font-normal tracking-wide opacity-90 whitespace-nowrap backdrop-blur-sm`}
            title={`Score: ${score.toFixed(4)}`} // Show score on hover
          >
            {label}: {(score * 100).toFixed(1)}%
          </span>
        );
      })}
    </div>
  );
};

// --- Main Chat Component ---
export default function ChatInterface() {

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom - updated to be smoother and contained
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "nearest"
      });
    }
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle message submission (Logic unchanged)
  const handleSubmit = useCallback(async (event?: FormEvent) => {
    event?.preventDefault();
    const text = inputValue.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });

      const responseBody = await response.json();

      if (!response.ok) {
        const errorDetail = responseBody?.detail || `Request failed with status ${response.status}`;
        throw new Error(errorDetail);
      }

      const data = responseBody as ChatResponseData;

      // Basic validation
      if (!data.ai_response || !data.user_emotion_analysis || !data.user_emotion_analysis.distribution?.root) {
         console.error("Incomplete data structure received:", data);
         throw new Error("Received incomplete or malformed data structure from backend.");
      }

      const aiMessage: Message = {
        id: data.response_id || `ai-${Date.now()}`,
        sender: 'ai',
        text: data.ai_response,
        timestamp: Date.now(),
        emotionAnalysis: data.user_emotion_analysis,
      };
      setMessages((prev) => [...prev, aiMessage]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("API Interaction Error:", err);
      const errorMessage = err.message || "Failed to connect to the AI service.";
      setError(errorMessage);

      const systemErrorMessage: Message = {
        id: `error-${Date.now()}`,
        sender: 'system',
        text: `Error: ${errorMessage}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, systemErrorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [inputValue, isLoading]);

  // Handle Enter key press in input (Unchanged)
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  // --- Render Logic ---
  return (
    <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-black transition-colors duration-300 font-sans">
      {/* Header - stick to top */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 dark:bg-black/80 border-b border-gray-100 dark:border-zinc-800">
        {/* Inner header content */}
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left side: Logo/Title */}
          <div className="flex items-center space-x-3">
            <div className="relative h-3 w-3">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 animate-pulse"></div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 blur-sm opacity-50"></div>
            </div>
            <h1 className="text-2xl font-extralight tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-500">aura</h1>
          </div>
          {/* Right side: Tagline & ThemeSwitcher */}
          <div className="flex items-center space-x-4">
            <p className="text-xs font-light text-zinc-400 dark:text-zinc-500 tracking-wider hidden sm:block">emotional intelligence</p>
            {/* ThemeSwitcher component remains here */}
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      {/* Message List Area - Fixed height with internal scrolling */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800 px-4 md:px-6">
        <div className="space-y-5 py-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex animate-fadeIn ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* Individual message bubble styling */}
              <div
                className={`max-w-[85%] md:max-w-[80%] p-4 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-zinc-800 dark:to-zinc-900 border border-gray-100 dark:border-zinc-800/50'
                    : msg.sender === 'ai'
                    ? 'bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 text-red-600 dark:text-red-400 text-center py-2'
                }`}
              >
                <p className="whitespace-pre-wrap break-words text-sm font-light leading-relaxed text-gray-800 dark:text-gray-200">
                  {msg.text}
                </p>
                {/* EmotionDisplay Component */}
                {msg.sender === 'ai' && msg.emotionAnalysis && <EmotionDisplay analysis={msg.emotionAnalysis} />}

                {/* Timestamp */}
                <span className="text-[10px] opacity-50 dark:opacity-40 block mt-2 text-right font-light text-gray-500 dark:text-gray-400">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          {/* Scroll anchor */}
          <div ref={messagesEndRef} className="h-0" />
        </div>
      </div>

      {/* Error Display Area */}
      {error && !isLoading && (
        <div className="px-4 pb-2 text-center">
          <span className="inline-block px-4 py-2 rounded-full text-red-500 dark:text-red-400 text-xs font-light bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30">
            {error}
          </span>
        </div>
      )}

      {/* Input Area Form - stick to bottom */}
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 z-10 backdrop-blur-md bg-white/90 dark:bg-black/90 border-t border-gray-100 dark:border-zinc-800 px-4 py-4"
      >
        {/* Input container: Takes full width */}
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Aura..."
            className="flex-grow py-3 px-5 bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 rounded-xl border border-gray-200 dark:border-zinc-800 outline-none focus:ring-2 focus:ring-violet-500/20 transition-all duration-300 font-light shadow-sm disabled:opacity-60"
            disabled={isLoading}
            aria-label="Chat input"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md disabled:shadow-none hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
            aria-label="Send message"
          >
            {isLoading ? (
              <LoadingSpinner size="h-5 w-5" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M3.105 3.105a.75.75 0 01.814-.398l12.585 3.495a.75.75 0 010 1.39L3.92 11.29a.75.75 0 01-.814-.398V7.53a.75.75 0 011.085-.67L10 8.5M3.105 16.895a.75.75 0 01.814.398l12.585-3.495a.75.75 0 010-1.39L3.92 8.71a.75.75 0 01-.814.398v4.47a.75.75 0 011.085.67L10 11.5" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
