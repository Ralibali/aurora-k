import { useLayoutEffect } from 'react';

export function useJsonLd(id: string, data: unknown) {
  useLayoutEffect(() => {
    let script = document.head.querySelector<HTMLScriptElement>(
      `script[type="application/ld+json"][data-jsonld-id="${id}"]`
    );

    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-jsonld-id', id);
      document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(data);

    return () => {
      script?.remove();
    };
  }, [id, JSON.stringify(data)]);
}
