'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Droplet,
  Calendar as CalendarIcon,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
} from 'date-fns';
import { DailyLogData, CycleRecord, CycleStats } from '@/types';
import { toISODate, formatFriendlyDate } from '@/lib/date-utils';
import { DailyLogDrawer } from '@/components/logging/DailyLogDrawer';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [logs, setLogs] = useState<DailyLogData[]>([]);
  const [cycles, setCycles] = useState<CycleRecord[]>([]);
  const [stats, setStats] = useState<CycleStats | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(toISODate(new Date()));
  const [isLogOpen, setIsLogOpen] = useState(false);

  const fetchCalendarData = async () => {
    try {
      const [logsRes, cyclesRes] = await Promise.all([
        fetch('/api/logs'),
        fetch('/api/cycles'),
      ]);
      const logsJson = await logsRes.json();
      const cyclesJson = await cyclesRes.json();

      if (logsJson.success) setLogs(logsJson.data);
      if (cyclesJson.success) {
        setCycles(cyclesJson.data.cycles);
        setStats(cyclesJson.data.stats);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // Calendar matrix computation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getLogForDay = (date: Date) => {
    const iso = toISODate(date);
    return logs.find((l) => l.date === iso);
  };

  const isPredictedPeriodDay = (date: Date) => {
    if (!stats) return false;
    if (stats.estimatedNextPeriodDate) {
      const estDate = parseISO(stats.estimatedNextPeriodDate);
      const diff = Math.floor(
        (date.getTime() - estDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diff >= 0 && diff < stats.averagePeriodLength) return true;
    }
    if (stats.forecasts) {
      for (const f of stats.forecasts) {
        const start = parseISO(f.startDate);
        const end = parseISO(f.endDate);
        if (date >= start && date <= end) return true;
      }
    }
    return false;
  };

  const isFertileDay = (date: Date) => {
    if (!stats) return false;
    if (stats.fertileWindow) {
      const start = parseISO(stats.fertileWindow.start);
      const end = parseISO(stats.fertileWindow.end);
      if (date >= start && date <= end) return true;
    }
    if (stats.forecasts) {
      for (const f of stats.forecasts) {
        const start = parseISO(f.fertileWindow.start);
        const end = parseISO(f.fertileWindow.end);
        if (date >= start && date <= end) return true;
      }
    }
    return false;
  };

  const isOvulationDay = (date: Date) => {
    if (!stats) return false;
    const iso = toISODate(date);
    if (stats.ovulationDate === iso) return true;
    if (stats.forecasts?.some((f) => f.ovulationDate === iso)) return true;
    return false;
  };

  const handleDayClick = (date: Date) => {
    const iso = toISODate(date);
    setSelectedDate(iso);
    setIsLogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Menstrual & Wellness Calendar</h1>
          <p className="text-xs text-slate-500">
            Tap any day to view or record physical symptoms, mood, and flow
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={prevMonth}
            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-slate-800 min-w-[130px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-6 shadow-card space-y-4">
        {/* Days of week header */}
        <div className="grid grid-cols-7 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-[11px] font-bold text-slate-400 py-1 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {calendarDays.map((day) => {
            const isCurMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            const dayLog = getLogForDay(day);
            const isPeriod = dayLog?.isPeriodDay;
            const isPredicted = isPredictedPeriodDay(day);
            const isOvulation = isOvulationDay(day);
            const isFertile = isFertileDay(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`relative min-h-[62px] sm:min-h-[74px] p-1.5 rounded-2xl flex flex-col items-center justify-between text-left transition-all ${
                  !isCurMonth
                    ? 'opacity-30 bg-slate-50/50'
                    : isPeriod
                    ? 'bg-rose-50/80 border border-sakhi-300 text-sakhi-900 shadow-2xs hover:bg-rose-100/80'
                    : isPredicted
                    ? 'bg-rose-50/30 border border-dashed border-rose-300 text-rose-800 hover:bg-rose-50/60'
                    : isOvulation
                    ? 'bg-amber-50/60 border border-amber-300 text-amber-900 shadow-2xs hover:bg-amber-100/60'
                    : isFertile
                    ? 'bg-teal-50/40 border border-teal-200 text-teal-900 hover:bg-teal-50/80'
                    : 'bg-slate-50/60 hover:bg-slate-100/70 border border-slate-100 text-slate-700'
                } ${isToday ? 'ring-2 ring-sakhi-500 ring-offset-2' : ''}`}
              >
                {/* Day number & indicators */}
                <div className="w-full flex items-center justify-between px-1">
                  <span
                    className={`text-xs font-bold ${
                      isToday
                        ? 'text-sakhi-600'
                        : isPeriod
                        ? 'text-sakhi-700'
                        : isOvulation
                        ? 'text-amber-700'
                        : isCurMonth
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {isPeriod ? (
                    <Droplet className="w-3 h-3 text-sakhi-600 fill-sakhi-600" />
                  ) : isOvulation ? (
                    <Sparkles className="w-3 h-3 text-amber-500 fill-amber-200" />
                  ) : null}
                </div>

                {/* Logged Indicators */}
                <div className="w-full flex items-center justify-center gap-1 my-0.5">
                  {dayLog?.moodPrimary && (
                    <span className="text-xs scale-90">
                      {dayLog.moodPrimary === 'Happy'
                        ? '😊'
                        : dayLog.moodPrimary === 'Calm'
                        ? '😌'
                        : dayLog.moodPrimary === 'Irritated'
                        ? '😤'
                        : dayLog.moodPrimary === 'Sad'
                        ? '😢'
                        : '😐'}
                    </span>
                  )}
                  {dayLog?.symptoms && dayLog.symptoms.length > 0 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  )}
                  {isFertile && !isPeriod && !isOvulation && (
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  )}
                </div>

                {/* Bottom label */}
                <div className="w-full text-center">
                  {isPeriod ? (
                    <span className="text-[9px] font-bold text-sakhi-600 uppercase tracking-tighter">
                      Period
                    </span>
                  ) : isOvulation ? (
                    <span className="text-[9px] font-bold text-amber-600 tracking-tighter">
                      Ovulation
                    </span>
                  ) : isPredicted ? (
                    <span className="text-[9px] font-semibold text-rose-400 tracking-tighter">
                      Est.
                    </span>
                  ) : isFertile ? (
                    <span className="text-[9px] font-medium text-teal-600 tracking-tighter">
                      Fertile
                    </span>
                  ) : dayLog ? (
                    <span className="text-[9px] text-slate-400">Logged</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {/* Clean Calendar Legend */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <span>Period Flow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-dashed border-rose-400 bg-rose-50" />
            <span>Predicted Period</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <span>Ovulation Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-teal-400" />
            <span>Fertile Window</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full ring-2 ring-sakhi-500" />
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Day Check-in Drawer */}
      <DailyLogDrawer
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        date={selectedDate}
        onSaved={fetchCalendarData}
      />
    </div>
  );
}
