import { useEffect, useRef, useState } from 'react';
import { Globe, LogIn, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MENU_ID = 'landing-mobile-navigation';

function isLandingPage() {
  return window.location.pathname === '/' || window.location.pathname === '/en';
}

function isMenuButton(target: EventTarget | null): target is Element {
  if (!(target instanceof Element)) return false;
  const button = target.closest('header button');
  if (!button) return false;
  const label = button.getAttribute('aria-label')?.trim().toLowerCase();
  const hasMenuIcon = Boolean(button.querySelector('svg.lucide-menu'));
  return hasMenuIcon || label === 'meny' || label === 'menu';
}

export function LandingMobileNavigation() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const firstItemRef = useRef<HTMLButtonElement | null>(null);
  const isEnglish = window.location.pathname.startsWith('/en');

  const labels = isEnglish
    ? {
        navigation: 'Mobile navigation',
        features: 'Features',
        flow: 'How it works',
        pricing: 'Pricing',
        faq: 'FAQ',
        demo: 'Book a demo',
        login: 'Log in',
        language: 'Svenska',
        close: 'Close menu',
      }
    : {
        navigation: 'Mobilmeny',
        features: 'Funktioner',
        flow: 'Så fungerar det',
        pricing: 'Pris',
        faq: 'Vanliga frågor',
        demo: 'Boka demo',
        login: 'Logga in',
        language: 'English',
        close: 'Stäng meny',
      };

  useEffect(() => {
    if (!isLandingPage()) return;

    const handleMenuClick = (event: MouseEvent) => {
      if (!isMenuButton(event.target)) return;
      const button = (event.target as Element).closest<HTMLButtonElement>('button');
      if (!button) return;

      // The legacy shell attaches a direct click listener to this button.
      // Capture the event first so only one menu controls the navigation.
      event.preventDefault();
      event.stopPropagation();
      triggerRef.current = button;
      setOpen((current) => !current);
    };

    document.addEventListener('click', handleMenuClick, true);
    return () => document.removeEventListener('click', handleMenuClick, true);
  }, []);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (trigger) {
      trigger.setAttribute('aria-controls', MENU_ID);
      trigger.setAttribute('aria-expanded', String(open));
    }

    if (!open) {
      document.body.style.removeProperty('overflow');
      return;
    }

    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => firstItemRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const handleResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      document.body.style.removeProperty('overflow');
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [open]);

  const close = () => setOpen(false);
  const scrollTo = (id: string) => {
    close();
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  if (!isLandingPage() || !open) return null;

  const items = [
    ['funktioner', labels.features],
    ['flode', labels.flow],
    ['pris', labels.pricing],
    ['faq', labels.faq],
  ] as const;

  return (
    <div className="fixed inset-0 top-16 z-[90] md:hidden" aria-label={labels.navigation}>
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
        aria-label={labels.close}
        onClick={close}
      />

      <div
        id={MENU_ID}
        className="relative mx-3 mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-black text-slate-950">Aurora Transport</p>
          <button
            type="button"
            onClick={() => {
              close();
              triggerRef.current?.focus();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-950"
            aria-label={labels.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="grid gap-1 p-3" aria-label={labels.navigation}>
          {items.map(([id, label], index) => (
            <button
              key={id}
              ref={index === 0 ? firstItemRef : undefined}
              type="button"
              onClick={() => scrollTo(id)}
              className="rounded-xl px-4 py-3 text-left text-base font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#123b88]"
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="grid gap-2 border-t border-slate-100 bg-slate-50 p-3">
          <Button asChild className="h-12 rounded-xl bg-[#123b88] font-black text-white hover:bg-[#0f2f6e]">
            <a href="/boka-demo" onClick={close}>{labels.demo}</a>
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" className="h-11 rounded-xl bg-white font-bold">
              <a href="/login" onClick={close}><LogIn className="mr-2 h-4 w-4" />{labels.login}</a>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl bg-white font-bold">
              <a href={isEnglish ? '/' : '/en'} onClick={close}><Globe className="mr-2 h-4 w-4" />{labels.language}</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
