import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aonetarget.education',
  appName: 'AONE Target',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,       // Hide native splash immediately
      launchAutoHide: true,
      backgroundColor: '#1A237E',  // Match your app's primary color
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
