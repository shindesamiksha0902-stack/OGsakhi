'use client';

import React, { useState } from 'react';
import { Sparkles, ArrowRight, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function QuickAskAi() {
  const [question, setQuestion] = useState('');
  const router = useRouter();

  const suggestedQuestions = [
    'Why am I feeling tired this week?',
    'What symptoms do I usually get before my period?',
    'Is my cycle regular?',
    'Why do I usually get headaches around this time?',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    router.push(`/assistant?q=${encodeURIComponent(question.trim())}`);
  };

  const handleSelectSuggested = (q: string) => {
    router.push(`/assistant?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="rounded-3xl bg-gradient-to-r from-sakhi-500/10 via-lavender-500/10 to-peach-500/10 p-5 border border-rose-200/50 space-y-3.5">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-sakhi-500 to-lavender-500 flex items-center justify-center text-white shadow-xs">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Ask Sakhi AI</h3>
          <p className="text-[11px] text-slate-500">
            Ask about your tracked logs, cycle rhythms, and wellness patterns
          </p>
        </div>
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask something about your cycle or wellbeing..."
          className="w-full pl-4 pr-12 py-3 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sakhi-500 shadow-xs"
        />
        <button
          type="submit"
          disabled={!question.trim()}
          className="absolute right-2 w-8 h-8 rounded-xl bg-sakhi-600 text-white flex items-center justify-center hover:bg-sakhi-700 disabled:opacity-40 transition-all shadow-xs"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Suggested prompt chips */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {suggestedQuestions.map((sq) => (
          <button
            key={sq}
            type="button"
            onClick={() => handleSelectSuggested(sq)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-white/90 hover:bg-white text-slate-600 border border-slate-200/70 hover:border-sakhi-300 transition-all flex items-center gap-1 shadow-2xs"
          >
            <MessageCircle className="w-3 h-3 text-sakhi-500" />
            <span>{sq}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
