import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Network } from '@capacitor/network';
import { Browser } from '@capacitor/browser';

/**
 * Android and Native Bridge integration for UNERA.
 * Safely initializes device features when running inside the Android APK/AAB,
 * while being a completely safe no-op on desktop and mobile web browsers.
 */
export function initAndroidBridge(): void {
  // Ensure we are running inside native environment (e.g. Capacitor Android APK)
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  console.log('📱 Initializing UNERA Android Native Bridge');

  // Mark native environment globally
  if (typeof window !== 'undefined') {
    (window as any).UNERA_IS_NATIVE_APP = true;
  }

  // 1. Configure Status Bar
  try {
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#050B18' }).catch(() => {});
  } catch (err) {
    console.debug('StatusBar configuration not available:', err);
  }

  // 2. Hide Splash Screen after UI is ready
  try {
    setTimeout(() => {
      SplashScreen.hide().catch(() => {});
    }, 500);
  } catch (err) {
    console.debug('SplashScreen hide error:', err);
  }

  // 3. Android Back Button Handling
  try {
    App.addListener('backButton', ({ canGoBack }) => {
      // Check if any open modal exists that can be closed
      const activeCloseButton = document.querySelector<HTMLElement>('[data-modal-close], button[aria-label="Close"], button.modal-close');
      if (activeCloseButton) {
        activeCloseButton.click();
        return;
      }

      // Check if browser navigation history exists
      if (canGoBack || (typeof window !== 'undefined' && window.history.length > 1)) {
        window.history.back();
      } else {
        // No further history: exit application cleanly
        App.exitApp();
      }
    });
  } catch (err) {
    console.debug('Back button listener setup failed:', err);
  }

  // 4. Network Offline / Online handling
  try {
    Network.addListener('networkStatusChange', (status) => {
      const existingOfflineNotice = document.getElementById('unera-offline-toast');
      if (!status.connected) {
        if (!existingOfflineNotice) {
          const toast = document.createElement('div');
          toast.id = 'unera-offline-toast';
          toast.className = 'fixed bottom-4 left-4 right-4 z-50 bg-[#0F172A] border border-red-500/50 text-[#F8FAFC] px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between transition-all';
          toast.innerHTML = `
            <div class="flex items-center gap-3">
              <span class="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
              <span class="text-sm font-medium">No internet connection. Please check your network and try again.</span>
            </div>
            <button onclick="this.parentElement.remove()" class="text-xs text-gray-400 hover:text-white px-2 py-1">✕</button>
          `;
          document.body.appendChild(toast);
        }
      } else {
        if (existingOfflineNotice) {
          existingOfflineNotice.remove();
        }
      }
    });
  } catch (err) {
    console.debug('Network status listener error:', err);
  }

  // 5. External Link Handling
  try {
    document.addEventListener('click', (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target || !target.href) return;

      const href = target.href;
      // If external link (not internal origin or unera.social)
      if (href.startsWith('http') && !href.includes(window.location.host) && !href.includes('unera.social')) {
        e.preventDefault();
        Browser.open({ url: href }).catch(() => {
          window.open(href, '_system');
        });
      }
    }, true);
  } catch (err) {
    console.debug('External link handler error:', err);
  }
}
