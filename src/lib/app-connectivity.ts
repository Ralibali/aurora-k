import { App } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { onlineManager } from '@tanstack/react-query';

type Listener = (online: boolean) => void;
const listeners = new Set<Listener>();
const browserOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;
let started = false;
let connected = true;
let generation = 0;
let revision = 0;

// WKWebView can report navigator.onLine=false while HTTPS requests succeed.
// Until native status is available, allow requests to establish their own result.
export function isAppOnline() {
  return started ? connected : Capacitor.isNativePlatform() || browserOnline();
}

export function subscribeAppConnectivity(listener: Listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function publish(online: boolean) {
  if (connected === online) return;
  connected = online;
  for (const listener of listeners) listener(online);
}

export async function refreshAppConnectivity() {
  if (!started) return;
  const currentGeneration = generation;
  const request = ++revision;
  try {
    const online = Capacitor.isNativePlatform() ? (await Network.getStatus()).connected : browserOnline();
    // A newer native event or resume check wins over an older getStatus result.
    if (started && generation === currentGeneration && revision === request) publish(online);
  } catch {
    // Preserve the last native status; never replace it with WebView's false
    // offline hint. Request failures and the durable queue still handle outages.
    console.warn('[connectivity] Could not refresh network status');
  }
}

// Call before React mounts so Query never installs its own WebView event source.
// The returned cleanup also handles native listeners that register asynchronously.
export function initializeAppConnectivity() {
  if (started) return () => {};
  started = true;
  const currentGeneration = ++generation;
  connected = Capacitor.isNativePlatform() || browserOnline();
  const active = () => started && generation === currentGeneration;
  const cleanups: Array<() => void> = [];
  const onStatus = (online: boolean) => {
    if (!active()) return;
    revision++;
    publish(online);
  };
  const keepHandle = (handle: PluginListenerHandle) => {
    const remove = () => { void handle.remove().catch(() => {}); };
    if (active()) cleanups.push(remove);
    else remove();
  };

  onlineManager.setEventListener(setOnline => {
    setOnline(isAppOnline());
    return subscribeAppConnectivity(setOnline);
  });

  if (Capacitor.isNativePlatform()) {
    // Subscribe first, then read initial status, so a transition is not missed.
    void Network.addListener('networkStatusChange', status => onStatus(status.connected))
      .then(keepHandle)
      .catch(() => { console.warn('[connectivity] Could not listen for network changes'); })
      .then(() => { if (active()) void refreshAppConnectivity(); });
    void App.addListener('appStateChange', ({ isActive }) => {
      if (active() && isActive) void refreshAppConnectivity();
    }).then(keepHandle).catch(() => { console.warn('[connectivity] Could not listen for app resume'); });
  } else {
    const online = () => onStatus(true);
    const offline = () => onStatus(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    cleanups.push(() => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    });
  }

  const visible = () => {
    if (active() && document.visibilityState === 'visible') void refreshAppConnectivity();
  };
  document.addEventListener('visibilitychange', visible);
  cleanups.push(() => document.removeEventListener('visibilitychange', visible));

  return () => {
    if (!active()) return;
    started = false;
    generation++;
    revision++;
    for (const cleanup of cleanups) cleanup();
  };
}
