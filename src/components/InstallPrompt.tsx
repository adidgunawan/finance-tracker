"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { useIsMobile } from "@/hooks/use-mobile";

const STORAGE_KEY = "pwa-install-prompt-dismissed";
const VISIT_COUNT_KEY = "pwa-visit-count";

export function InstallPrompt() {
  const { isInstallable, promptInstall } = useInstallPrompt();
  const isMobile = useIsMobile();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Only show on mobile devices
    if (!isMobile || !isInstallable) {
      return;
    }

    // Check if user dismissed the prompt
    const isDismissed = localStorage.getItem(STORAGE_KEY) === "true";
    if (isDismissed) {
      return;
    }

    // Track visit count
    const visitCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || "0", 10);
    localStorage.setItem(VISIT_COUNT_KEY, String(visitCount + 1));

    // Show after 2 visits or 30 seconds
    if (visitCount >= 1) {
      // Show immediately on second visit
      const timer = setTimeout(() => {
        setIsVisible(true);
        setTimeout(() => setIsAnimating(true), 50);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Show after 30 seconds on first visit
      const timer = setTimeout(() => {
        setIsVisible(true);
        setTimeout(() => setIsAnimating(true), 50);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [isMobile, isInstallable]);

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      localStorage.setItem(STORAGE_KEY, "true");
    }, 300);
  };

  if (!isVisible || !isMobile) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 z-50 transition-all duration-300 ${
        isAnimating ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-2xl p-4 backdrop-blur-lg border border-white/20">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="bg-white/20 rounded-full p-2 backdrop-blur-sm">
            <Download className="h-5 w-5 text-white" />
          </div>

          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm mb-1">
              Install Finance Tracker
            </h3>
            <p className="text-white/90 text-xs mb-3 leading-relaxed">
              Add to your home screen for quick access and a native app experience.
            </p>

            <button
              onClick={handleInstall}
              className="bg-white text-purple-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors shadow-sm w-full"
            >
              Install Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
