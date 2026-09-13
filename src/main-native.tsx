import { createRoot } from 'react-dom/client';
import NativeApp from './NativeApp';
import { initializeAppConnectivity } from './lib/app-connectivity';
import './index.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';

document.documentElement.classList.add('driver-native');
const stopConnectivity = initializeAppConnectivity();
if (import.meta.hot) import.meta.hot.dispose(stopConnectivity);
createRoot(document.getElementById('root')!).render(<NativeApp />);
