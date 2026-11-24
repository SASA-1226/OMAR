import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

try {
  const savedTheme = localStorage.getItem('sasa_omor_theme');
  if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', '#F6F7F9');
  } else {
    document.documentElement.classList.add('dark');
  }
} catch {
  // ignore localStorage access error
}

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<App />);
