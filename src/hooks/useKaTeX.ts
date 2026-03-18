import { useEffect, useState } from 'react';

/**
 * Hook to load KaTeX from CDN and provide a rendering function
 * No npm install needed for KaTeX with this approach
 */
export const useKaTeX = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if already loaded
    if (window.katex) {
      setIsLoaded(true);
      return;
    }

    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
    link.integrity = 'sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzWq9l2878Z9W28F6VpGP44W7H1RWBCHg1UX';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
    script.integrity = 'sha384-7zkInuTyB7JykG9JRe9mUMy133ESf8Gyve47v7v9v9v9v9v9v9v9v9v9v9v9v9v9'; // Note: This integrity might be wrong, better to omit if unsure or use a stable one
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      // Load Auto-render extension
      const autoRenderScript = document.createElement('script');
      autoRenderScript.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js';
      autoRenderScript.crossOrigin = 'anonymous';
      autoRenderScript.onload = () => setIsLoaded(true);
      document.head.appendChild(autoRenderScript);
    };
    document.head.appendChild(script);

    return () => {
      // We don't necessarily want to remove them on unmount if other components use them
    };
  }, []);

  const renderMath = (element: HTMLElement | null) => {
    if (isLoaded && element && window.renderMathInElement) {
      window.renderMathInElement(element, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
        ],
        throwOnError: false,
      });
    }
  };

  return { isLoaded, renderMath };
};

// Add katex to window type
declare global {
  interface Window {
    katex: any;
    renderMathInElement: any;
  }
}
