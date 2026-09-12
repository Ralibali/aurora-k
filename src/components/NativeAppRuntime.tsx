import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { useLocation, useNavigate } from 'react-router-dom';

export function NativeAppRuntime() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    let disposed = false;
    let listener: PluginListenerHandle | undefined;
    void App.addListener('backButton', () => {
      if (pathname === '/login' || pathname === '/driver' || pathname === '/driver/assignments') {
        void App.minimizeApp();
      } else if (pathname.startsWith('/driver/assignments/')) {
        navigate('/driver/assignments');
      } else {
        navigate(pathname.startsWith('/driver/') ? '/driver/assignments' : '/login');
      }
    }).then(handle => {
      if (disposed) void handle.remove();
      else listener = handle;
    });
    return () => { disposed = true; void listener?.remove(); };
  }, [navigate, pathname]);
  return null;
}
