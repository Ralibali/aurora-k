import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'se.auroramedia.auroratransport',
  appName: 'Aurora Transport',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
    },
    StatusBar: {
      style: 'DARK' as any,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
