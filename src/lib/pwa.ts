/**
 * Detects if the app is running in standalone mode (installed as PWA)
 */
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = (window.navigator as any).standalone === true;
  
  return isStandalone || isIOSStandalone;
}

/**
 * Detects if the device is mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    window.navigator.userAgent
  );
}

/**
 * Detects if the browser supports PWA installation
 */
export function canInstallPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if beforeinstallprompt event is supported
  return 'onbeforeinstallprompt' in window;
}

/**
 * Gets the display mode of the app
 */
export function getDisplayMode(): 'standalone' | 'browser' | 'minimal-ui' | 'fullscreen' {
  if (typeof window === 'undefined') return 'browser';
  
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return 'standalone';
  }
  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return 'minimal-ui';
  }
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return 'fullscreen';
  }
  return 'browser';
}
