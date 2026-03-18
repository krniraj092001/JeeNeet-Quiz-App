import React, { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const InstallBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    
    setIsStandalone(isStandaloneMode);

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show banner after 5 seconds if not dismissed
      const isDismissed = localStorage.getItem('pwa_banner_dismissed');
      if (!isDismissed && !isStandaloneMode) {
        setTimeout(() => setIsVisible(true), 5000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show banner after 5 seconds if not dismissed
    if (ios && !isStandaloneMode) {
      const isDismissed = localStorage.getItem('pwa_banner_dismissed');
      if (!isDismissed) {
        setTimeout(() => setIsVisible(true), 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isStandalone]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (isStandalone || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:hidden"
      >
        <div className="bg-indigo-600 text-white rounded-2xl shadow-2xl p-4 flex flex-col gap-4 border border-white/20 backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-sm">Install RankBoost with NITian</p>
                <p className="text-xs text-indigo-100">Works offline & faster access!</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            {isIOS ? (
              <div className="bg-white/10 p-3 rounded-xl space-y-2">
                <p className="text-xs font-semibold flex items-center gap-2">
                  <span className="bg-white text-indigo-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
                  Tap the Share button <Share className="w-3 h-3 inline" />
                </p>
                <p className="text-xs font-semibold flex items-center gap-2">
                  <span className="bg-white text-indigo-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span>
                  Select "Add to Home Screen"
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleInstall}
                  className="w-full bg-white text-indigo-600 py-3 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Install Now
                </button>
                <div className="bg-white/10 p-3 rounded-xl">
                  <p className="text-[10px] text-center text-indigo-100 italic">
                    If the button doesn't work, tap the three dots <span className="font-bold">⋮</span> and select <span className="font-bold">"Install App"</span> or <span className="font-bold">"Add to Home Screen"</span>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InstallBanner;
