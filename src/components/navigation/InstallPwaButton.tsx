'use client';

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Check, X, Share } from 'lucide-react';

export function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    // Check if already running as installed app
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
      return;
    }

    // Check for iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('SW registration note:', err);
      });
    }

    // Listen for Chrome/Edge install prompt
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosModal(true);
    } else {
      // General instructions
      alert('To install OGsakhi:\n• On Chrome/Edge: Click the install icon (⊕) in your browser address bar.\n• On Phone: Tap browser menu (⋮) → "Add to Home Screen".');
    }
  };

  if (isStandalone) {
    return null; // Already installed and running as native app
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all shadow-2xs"
        title="Install OGsakhi to Home Screen / Desktop"
        aria-label="Install App"
      >
        <Smartphone className="w-4 h-4" />
      </button>

      {/* iOS Safari Instruction Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-rose-100 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center mx-auto shadow-md">
              <Download className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">Install OGsakhi on iPhone</h3>
              <p className="text-xs text-slate-500">
                Install as a full-screen app in just 2 taps:
              </p>
            </div>

            <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-100/80 text-xs text-slate-700 text-left space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                <span>Tap the <strong className="text-slate-900">Share button</strong> (square with arrow <Share className="w-3 h-3 inline text-slate-600 mb-0.5" />) in Safari bar.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                <span>Scroll down and tap <strong className="text-slate-900">"Add to Home Screen"</strong>.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
                <span>Tap <strong className="text-slate-900">Add</strong>. OGsakhi will appear as a standalone app!</span>
              </div>
            </div>

            <button
              onClick={() => setShowIosModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
