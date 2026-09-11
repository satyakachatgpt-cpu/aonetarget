import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * Handles hardware and gesture back button navigation on Android devices in Capacitor.
 * 
 * Hierarchy:
 * 1. Open Auth Popup / Modals / Sidebars -> Close active overlay first.
 * 2. Active exam screens (/test/) -> Trigger exam warning modal so progress isn't lost.
 * 3. Inner screens (/course/:id, /settings, etc.) -> navigate(-1)
 * 4. Secondary bottom tabs (/explore, /batches, /free-content, /my-courses) -> navigate('/')
 * 5. Home screen ('/') -> Instant exit on single back press (just like native Android apps).
 */
export const BackButtonHandler: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const locationRef = useRef(location);
  locationRef.current = location;

  useEffect(() => {
    // Only attach listener when running inside native Android app
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    let listenerHandle: any = null;

    const setupListener = async () => {
      listenerHandle = await App.addListener('backButton', async () => {
        // 0. Check if Auth Popup is open
        const isAuthPopupOpen = document.querySelector('[data-auth-popup="true"]') !== null;
        if (isAuthPopupOpen) {
          window.dispatchEvent(new CustomEvent('app:close-auth-popup'));
          return;
        }

        // 1. Check if sidebar or any overlay is open
        const isSidebarOpen = document.body.getAttribute('data-sidebar-open') === 'true';
        if (isSidebarOpen) {
          window.dispatchEvent(new CustomEvent('app:close-overlays'));
          return;
        }

        // Check if any Radix modal / dialog is open
        const activeDialog = document.querySelector('[role="dialog"]') as HTMLElement | null;
        if (activeDialog) {
          const closeBtn = activeDialog.querySelector('[data-close-modal="true"], button[aria-label="Close"]') as HTMLElement | null;
          if (closeBtn) {
            closeBtn.click();
            return;
          }
          window.dispatchEvent(new CustomEvent('app:close-overlays'));
          return;
        }

        // Get current cleaned route
        const currentPathname = locationRef.current.pathname;
        const hashPath = window.location.hash ? window.location.hash.replace(/^#/, '').split('?')[0] : '';
        const activePath = hashPath || currentPathname;

        // 2. Active exam / test warning handler
        if (activePath.startsWith('/test/')) {
          const backEvent = new CustomEvent('app:backbutton', { cancelable: true });
          window.dispatchEvent(backEvent);
          return;
        }

        // 3. Check if user is on the Home page -> Instant exit on single back press
        const isHome = activePath === '/' || activePath === '' || activePath === '/#/';

        if (isHome) {
          await App.exitApp();
          return;
        }

        // 4. Secondary main tabs -> Go back to Home
        const secondaryTabs = ['/explore', '/batches', '/free-content', '/my-courses', '/student-dashboard'];
        if (secondaryTabs.includes(activePath)) {
          navigate('/', { replace: true });
          return;
        }

        // 5. Any other inner screen -> Go back in history
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate('/', { replace: true });
        }
      });
    };

    setupListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [navigate]);

  return null;
};

export default BackButtonHandler;
