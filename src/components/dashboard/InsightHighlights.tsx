'use client';

import React from 'react';
import { DetectedPatternItem, DeviationSeverity } from '@/types';
import { Sparkles, AlertCircle, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface InsightHighlightsProps {
  patterns: DetectedPatternItem[];
  overallSeverity: DeviationSeverity;
}

export function InsightHighlights({ patterns, overallSeverity }: InsightHighlightsProps) {
  const getSeverityBadge = (sev: DeviationSeverity) => {
    switch (sev) {
      case 'CONSIDER_CHECKING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Consider Checking
          </span>
        );
      case 'NOTICE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Notice
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            Normal Pattern
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sakhi-600" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Your Insights & Patterns
          </h2>
        </div>
        <Link
          href="/insights"
          className="text-xs font-semibold text-sakhi-600 hover:text-sakhi-700 flex items-center gap-0.5"
        >
          <span>View all trends</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {patterns.length === 0 ? (
        <div className="p-4 rounded-2xl bg-white border border-slate-100 text-center text-xs text-slate-500">
          Continue logging daily to reveal personalized cycle trends and baselines.
        </div>
      ) : (
        <div className="grid gap-2.5">
          {patterns.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all ${
                item.severity === 'CONSIDER_CHECKING'
                  ? 'bg-rose-50/50 border-rose-200'
                  : item.severity === 'NOTICE'
                  ? 'bg-amber-50/40 border-amber-200'
                  : 'bg-white border-slate-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-slate-800">{item.title}</span>
                {getSeverityBadge(item.severity)}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{item.observation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
