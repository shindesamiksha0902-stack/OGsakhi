'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Send,
  User,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Lightbulb,
  Stethoscope,
  Heart,
  Droplet,
} from 'lucide-react';
import { StructuredAiResponse, DeviationSeverity, CycleStats } from '@/types';
import { MEDICAL_SAFETY_DISCLAIMER } from '@/lib/constants';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text?: string;
  structured?: StructuredAiResponse;
  timestamp: string;
}

function AssistantContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q');

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<CycleStats | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      structured: {
        what_i_noticed:
          'Welcome to your personal wellness space! I have access to your 3 tracked cycles and recent daily check-ins.',
        possible_explanation:
          'I can help you understand how your sleep, physical symptoms, mood, and lifestyle interconnect across different cycle phases.',
        what_you_can_try: [
          'Ask about your cycle regularity or estimated upcoming period.',
          'Inquire about why you feel tired or notice pre-period headaches.',
          'Explore low-risk lifestyle habits to support your current phase.',
        ],
        safety_level: 'NORMAL',
        disclaimer: MEDICAL_SAFETY_DISCLAIMER,
      },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  useEffect(() => {
    fetch('/api/cycles')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStats(data.data.stats);
      });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Handle URL query passed from Dashboard
  useEffect(() => {
    if (queryParam && messages.length === 1) {
      handleSendMessage(queryParam);
    }
  }, [queryParam]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: textToSend.trim() }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          structured: json.data,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(json.error || 'Failed to generate response');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'I encountered a brief connection issue. Please feel free to ask again in a moment.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const promptSuggestions = [
    'Why am I feeling tired this week?',
    'What symptoms do I usually get before my period?',
    'Is my cycle regular?',
    'Why do I usually get headaches around this time?',
    'What can I do to improve my sleep?',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-13rem)] sm:h-[calc(100vh-10rem)] max-w-3xl mx-auto">
      {/* Header Context Pill */}
      <div className="bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sakhi-500 to-lavender-500 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800">OGsakhi Companion</h1>
            <p className="text-[11px] text-slate-400">
              {stats
                ? `Connected to Day ${stats.currentCycleDay} (${stats.currentPhase} Phase)`
                : 'Connected to your wellness telemetry'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 text-[11px] font-medium text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden sm:inline">Responsible AI</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
        {messages.map((m) => {
          if (m.sender === 'user') {
            return (
              <div key={m.id} className="flex justify-end gap-2">
                <div className="max-w-[85%] sm:max-w-[75%] bg-sakhi-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-xs">
                  <p className="text-xs sm:text-sm leading-relaxed">{m.text}</p>
                  <span className="block text-[10px] text-sakhi-200 mt-1 text-right">
                    {m.timestamp}
                  </span>
                </div>
              </div>
            );
          }

          // Structured Assistant Card
          const data = m.structured;
          return (
            <div key={m.id} className="flex justify-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sakhi-500 to-peach-400 text-white flex items-center justify-center shrink-0 mt-1 shadow-xs">
                <Droplet className="w-4 h-4 fill-white/80" />
              </div>

              <div className="max-w-[92%] sm:max-w-[85%] space-y-3">
                {m.text && (
                  <div className="bg-white rounded-2xl rounded-tl-xs p-4 border border-slate-100 shadow-xs text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {m.text}
                  </div>
                )}

                {data && (
                  <div className="bg-white rounded-3xl rounded-tl-xs p-5 border border-slate-100 shadow-card space-y-4">
                    {/* Section 1: What I noticed */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-sakhi-700 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-sakhi-500" />
                        What I Noticed
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed pl-5">
                        {data.what_i_noticed}
                      </p>
                    </div>

                    {/* Section 2: Possible explanation */}
                    <div className="space-y-1 pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                        Possible Explanation
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed pl-5">
                        {data.possible_explanation}
                      </p>
                    </div>

                    {/* Section 3: What you can try */}
                    {data.what_you_can_try && data.what_you_can_try.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-emerald-500" />
                          What You Can Try
                        </span>
                        <ul className="space-y-1.5 pl-5">
                          {data.what_you_can_try.map((item, idx) => (
                            <li
                              key={idx}
                              className="text-xs text-slate-600 flex items-start gap-2"
                            >
                              <span className="text-emerald-500 text-sm leading-none">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Section 4: When to seek care (if present) */}
                    {data.when_to_seek_care && (
                      <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200/70 text-xs space-y-1">
                        <span className="font-bold text-rose-800 flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-rose-600" />
                          When to Consider Professional Advice
                        </span>
                        <p className="text-slate-600 leading-relaxed">
                          {data.when_to_seek_care}
                        </p>
                      </div>
                    )}

                    {/* Timestamp & Non-diagnostic disclaimer */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{m.timestamp}</span>
                      <span className="italic">Non-diagnostic wellness support</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 pl-10 animate-pulse">
            <Sparkles className="w-4 h-4 text-sakhi-400 animate-spin" />
            <span>OGsakhi is analyzing your logs and wellness patterns...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {promptSuggestions.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => handleSendMessage(prompt)}
            className="text-[11px] whitespace-nowrap px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition-colors shrink-0 shadow-2xs"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(input);
        }}
        className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your cycle or wellbeing..."
          className="flex-1 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-xl bg-sakhi-600 hover:bg-sakhi-700 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-xs text-slate-400">
          <Sparkles className="w-5 h-5 text-sakhi-500 animate-spin mr-2" />
          <span>Loading OGsakhi Assistant...</span>
        </div>
      }
    >
      <AssistantContent />
    </Suspense>
  );
}
