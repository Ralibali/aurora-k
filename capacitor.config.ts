import type { CapacitorConfig } from '@capacitor/cli';
import { Style } from '@capacitor/status-bar';

const config: CapacitorConfig = {
  appId: 'se.auroramedia.auroratransport',
  appName: 'Aurora Transport',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
    },
    StatusBar: {
      style: Style.Dark,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
