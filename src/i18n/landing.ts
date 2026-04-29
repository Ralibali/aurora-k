// Landing page copy in Swedish (default) and English.
// Used by LandingPageV2 to render localized content for / and /en.

export type Lang = 'sv' | 'en';

export interface LandingCopy {
  htmlLang: string;
  meta: {
    title: string;
    description: string;
  };
  nav: {
    features: string;
    flow: string;
    pricing: string;
    faq: string;
    bookDemo: string;
    dashboard: string;
    login: string;
    menu: string;
    breadcrumbHome: string;
  };
  hero: {
    badge: string;
    h1: string;
    sub: string;
    ctaPrimary: string;
    ctaSecondaryIdle: string;
    ctaSecondaryLoading: string;
    trustPoints: string[];
  };
  values: { title: string; text: string }[];
  flow: {
    eyebrow: string;
    h2: string;
    sub: string;
    steps: { label: string; title: string; text: string }[];
  };
  features: {
    eyebrow: string;
    h2: string;
    sub: string;
    groups: { title: string; text: string; items: string[] }[];
  };
  audiences: {
    eyebrow: string;
    h2: string;
    sub: string;
    items: { title: string; text: string }[];
  };
  pricing: {
    eyebrow: string;
    h2: string;
    sub: string;
    setupLabel: string;
    setupPrice: string;
    setupText: string;
    monthlyLabel: string;
    monthlyPrice: string;
    monthlyUnit: string;
    monthlyText: string;
    monthlyBenefits: string[];
    cta: string;
  };
  faq: {
    eyebrow: string;
    h2: string;
    sub: string;
    items: { q: string; a: string }[];
  };
  finalCta: {
    h2: string;
    sub: string;
    primary: string;
    secondaryIdle: string;
    secondaryLoading: string;
  };
  toasts: {
    demoSuccess: (companyName: string) => string;
    demoError: string;
  };
  hreflang: {
    sv: string;
    en: string;
  };
  langSwitch: {
    sv: string;
    en: string;
    aria: string;
  };
}

const SV: LandingCopy = {
  htmlLang: 'sv',
  meta: {
    title: 'Slipp Excel och WhatsApp i transportplaneringen | Aurora Transport',
    description:
      'Aurora Transport samlar uppdrag, förare, tidrapporter och fakturaunderlag i ett enkelt system för svenska transportföretag. Fast pris 449 kr per månad.',
  },
  nav: {
    features: 'Funktioner',
    flow: 'Så fungerar det',
    pricing: 'Pris',
    faq: 'FAQ',
    bookDemo: 'Boka demo',
    dashboard: 'Gå till dashboard',
    login: 'Logga in',
    menu: 'Meny',
    breadcrumbHome: 'Hem',
  },
  hero: {
    badge: 'Byggt i Sverige för åkerier, bud och bemanning',
    h1: 'Slipp Excel, WhatsApp och manuell planering',
    sub: 'Aurora samlar uppdrag, förare, tidrapportering och fakturaunderlag i ett enkelt system för svenska transportföretag.',
    ctaPrimary: 'Boka demo',
    ctaSecondaryIdle: 'Se demo med exempeldata',
    ctaSecondaryLoading: 'Loggar in...',
    trustPoints: [
      'Fast pris: 449 kr per månad',
      'Ingen bindningstid',
      'Support på svenska',
      'Kom igång samma dag',
    ],
  },
  values: [
    {
      title: 'Mindre administration',
      text: 'Skapa uppdrag, tilldela förare och samla tidrapporter utan att hoppa mellan Excel, telefon och chattar.',
    },
    {
      title: 'Färre missar',
      text: 'Alla ser rätt information direkt. Mindre dubbelarbete, färre missförstånd och bättre koll på varje uppdrag.',
    },
    {
      title: 'Snabbare underlag',
      text: 'Gå från utfört jobb till färdigt fakturaunderlag med tydligare tidrapporter och samlad historik.',
    },
  ],
  flow: {
    eyebrow: 'Från order till underlag',
    h2: 'Så fungerar Aurora Transport i praktiken',
    sub: 'Ett tydligt flöde för uppdrag, förare och rapportering — utan extra administration.',
    steps: [
      { label: '01', title: 'Skapa uppdrag', text: 'Lägg in kund, adress, tid och instruktioner på ett ställe.' },
      { label: '02', title: 'Tilldela förare', text: 'Välj rätt person och skicka ut jobbet direkt.' },
      { label: '03', title: 'Föraren ser jobbet', text: 'All information finns i mobilen, utan extra chattar.' },
      { label: '04', title: 'Tidrapportera', text: 'Start, stopp och kommentarer registreras enkelt.' },
      { label: '05', title: 'Underlag klart', text: 'Samla tid och uppdrag till tydligare fakturaunderlag.' },
    ],
  },
  features: {
    eyebrow: 'Funktioner',
    h2: 'Allt du behöver. Inget du inte behöver.',
    sub: 'Ett fokuserat verktyg för transportföretag som vill slippa administration och få bättre kontroll på vardagen.',
    groups: [
      {
        title: 'Uppdrag och planering',
        text: 'Planera dagen, tilldela jobb och följ status i ett tydligt flöde.',
        items: ['Skapa uppdrag snabbt', 'Tilldela förare', 'Status i realtid'],
      },
      {
        title: 'Förare och personal',
        text: 'Ge förare rätt information direkt i mobilen och minska onödiga samtal.',
        items: ['Mobil förarvy', 'Tydliga instruktioner', 'Mindre chattkaos'],
      },
      {
        title: 'Tid och ekonomi',
        text: 'Samla tider, historik och fakturaunderlag utan dubbelarbete.',
        items: ['Tidrapportering', 'Fakturaunderlag', 'Rapporter och överblick'],
      },
    ],
  },
  audiences: {
    eyebrow: 'För vem?',
    h2: 'Byggt för transportbolag som vill jobba snabbare',
    sub: 'Aurora är gjort för bolag som behöver ordning, fart och enkelhet — inte fler komplicerade system.',
    items: [
      { title: 'Åkerier', text: 'För mindre och växande åkerier som vill få bättre kontroll över uppdrag och förare.' },
      { title: 'Budfirmor', text: 'För bolag med snabba jobb, många ändringar och behov av tydlig mobil kommunikation.' },
      { title: 'Transportbemanning', text: 'För verksamheter som behöver hålla koll på personal, pass, tider och uppdrag.' },
    ],
  },
  pricing: {
    eyebrow: 'Pris',
    h2: 'Ett fast pris. Inget krångel.',
    sub: 'För transportföretag som vill komma igång snabbt utan bindningstid eller dolda avgifter.',
    setupLabel: 'Setup',
    setupPrice: '3 500 kr',
    setupText: 'Engångskostnad för uppstart, konfiguration och onboarding.',
    monthlyLabel: 'Löpande',
    monthlyPrice: '449 kr',
    monthlyUnit: 'per månad',
    monthlyText: 'Obegränsat antal förare, admins och uppdrag. Support på svenska ingår.',
    monthlyBenefits: ['Ingen bindningstid', 'Support på svenska', 'Obegränsat antal förare', 'Fakturaunderlag ingår'],
    cta: 'Boka demo',
  },
  faq: {
    eyebrow: 'FAQ',
    h2: 'Vanliga frågor',
    sub: 'Kort, rakt och utan krångel. Precis som systemet.',
    items: [
      { q: 'Vad kostar Aurora Transport?', a: 'Aurora Transport kostar 449 kr per månad. Setup och onboarding kostar 3 500 kr som engångskostnad.' },
      { q: 'Finns det bindningstid?', a: 'Nej. Du kan säga upp när du vill. Målet är att systemet ska vara enkelt att börja med och enkelt att stanna kvar i.' },
      { q: 'Passar Aurora små åkerier?', a: 'Ja. Sidan och systemet är byggt för mindre transportföretag som vill bort från Excel, WhatsApp och manuell administration.' },
      { q: 'Kan förarna använda mobilen?', a: 'Ja. Förarna kan se uppdrag och rapportera information direkt via mobilen.' },
      { q: 'Hur snabbt kan vi komma igång?', a: 'De flesta kan komma igång samma dag efter en kort genomgång och enkel uppsättning.' },
    ],
  },
  finalCta: {
    h2: 'Redo att slippa Excel och WhatsApp?',
    sub: 'Boka en kort demo så visar vi hur Aurora kan passa ditt transportföretag.',
    primary: 'Boka demo',
    secondaryIdle: 'Se demo med exempeldata',
    secondaryLoading: 'Loggar in...',
  },
  toasts: {
    demoSuccess: (companyName) => `Inloggad som ${companyName} — omdirigerar...`,
    demoError: 'Demo-inloggning misslyckades',
  },
  hreflang: {
    sv: 'https://auroratransport.se/',
    en: 'https://auroratransport.se/en',
  },
  langSwitch: {
    sv: 'SV',
    en: 'EN',
    aria: 'Byt språk',
  },
};

const EN: LandingCopy = {
  htmlLang: 'en',
  meta: {
    title: 'Replace Excel and WhatsApp in transport planning | Aurora Transport',
    description:
      'Aurora Transport brings jobs, drivers, time reporting and invoice drafts into one simple system for transport companies. Flat price from 449 SEK per month.',
  },
  nav: {
    features: 'Features',
    flow: 'How it works',
    pricing: 'Pricing',
    faq: 'FAQ',
    bookDemo: 'Book a demo',
    dashboard: 'Go to dashboard',
    login: 'Log in',
    menu: 'Menu',
    breadcrumbHome: 'Home',
  },
  hero: {
    badge: 'Built in Sweden for hauliers, couriers and staffing companies',
    h1: 'Drop Excel, WhatsApp and manual planning',
    sub: 'Aurora gathers jobs, drivers, time reporting and invoice drafts in one simple system for small and mid-sized transport companies.',
    ctaPrimary: 'Book a demo',
    ctaSecondaryIdle: 'Try the live demo',
    ctaSecondaryLoading: 'Signing in...',
    trustPoints: [
      'Flat price: 449 SEK per month',
      'No lock-in',
      'Human support',
      'Up and running the same day',
    ],
  },
  values: [
    {
      title: 'Less admin',
      text: 'Create jobs, assign drivers and collect time reports without jumping between Excel, phone calls and chats.',
    },
    {
      title: 'Fewer mistakes',
      text: 'Everyone sees the right information instantly. Less double work, fewer misunderstandings and better control of every job.',
    },
    {
      title: 'Faster invoicing',
      text: 'Move from completed job to ready-to-send invoice draft with cleaner time reports and a unified history.',
    },
  ],
  flow: {
    eyebrow: 'From order to invoice',
    h2: 'How Aurora Transport works in practice',
    sub: 'A clear flow for jobs, drivers and reporting — without the extra admin.',
    steps: [
      { label: '01', title: 'Create a job', text: 'Add customer, address, time and notes in one place.' },
      { label: '02', title: 'Assign a driver', text: 'Pick the right person and dispatch the job in seconds.' },
      { label: '03', title: 'Driver sees the job', text: 'Everything they need is on their phone — no extra chat threads.' },
      { label: '04', title: 'Time reporting', text: 'Start, stop and notes are captured in a couple of taps.' },
      { label: '05', title: 'Invoice draft ready', text: 'Time and jobs are bundled into clean invoice drafts.' },
    ],
  },
  features: {
    eyebrow: 'Features',
    h2: 'Everything you need. Nothing you do not.',
    sub: 'A focused tool for transport companies that want less admin and more control over the day-to-day.',
    groups: [
      {
        title: 'Jobs and planning',
        text: 'Plan the day, dispatch work and follow status in one clear flow.',
        items: ['Create jobs fast', 'Assign drivers', 'Real-time status'],
      },
      {
        title: 'Drivers and crew',
        text: 'Give drivers what they need straight on their phone and cut down on calls.',
        items: ['Mobile driver view', 'Clear instructions', 'Less chat chaos'],
      },
      {
        title: 'Time and finance',
        text: 'Collect hours, history and invoice drafts without doing the work twice.',
        items: ['Time reporting', 'Invoice drafts', 'Reports and overview'],
      },
    ],
  },
  audiences: {
    eyebrow: 'Who is it for?',
    h2: 'Built for transport companies that want to move faster',
    sub: 'Aurora is made for businesses that need order, speed and simplicity — not yet another complicated system.',
    items: [
      { title: 'Hauliers', text: 'For small and growing hauliers that want better control over jobs and drivers.' },
      { title: 'Couriers', text: 'For companies with fast jobs, frequent changes and a need for clear mobile communication.' },
      { title: 'Transport staffing', text: 'For teams that need to keep track of staff, shifts, hours and jobs.' },
    ],
  },
  pricing: {
    eyebrow: 'Pricing',
    h2: 'One flat price. No surprises.',
    sub: 'For transport companies that want to get going quickly — no lock-in and no hidden fees.',
    setupLabel: 'Setup',
    setupPrice: '3,500 SEK',
    setupText: 'One-time fee for setup, configuration and onboarding.',
    monthlyLabel: 'Monthly',
    monthlyPrice: '449 SEK',
    monthlyUnit: 'per month',
    monthlyText: 'Unlimited drivers, admins and jobs. Human support included.',
    monthlyBenefits: ['No lock-in', 'Human support', 'Unlimited drivers', 'Invoice drafts included'],
    cta: 'Book a demo',
  },
  faq: {
    eyebrow: 'FAQ',
    h2: 'Common questions',
    sub: 'Short, straight and to the point — just like the system.',
    items: [
      { q: 'What does Aurora Transport cost?', a: 'Aurora Transport is 449 SEK per month. Setup and onboarding is a one-time fee of 3,500 SEK.' },
      { q: 'Is there a lock-in period?', a: 'No. You can cancel whenever you want. We want the system to be easy to start with and easy to stay with.' },
      { q: 'Does Aurora suit small hauliers?', a: 'Yes. Aurora is built for small transport companies that want to move away from Excel, WhatsApp and manual admin.' },
      { q: 'Can drivers use it on their phone?', a: 'Yes. Drivers can see jobs and report directly from their phone.' },
      { q: 'How quickly can we get started?', a: 'Most teams are up and running the same day after a short walkthrough and a simple setup.' },
    ],
  },
  finalCta: {
    h2: 'Ready to drop Excel and WhatsApp?',
    sub: 'Book a short demo and we will show you how Aurora can fit your transport business.',
    primary: 'Book a demo',
    secondaryIdle: 'Try the live demo',
    secondaryLoading: 'Signing in...',
  },
  toasts: {
    demoSuccess: (companyName) => `Signed in as ${companyName} — redirecting...`,
    demoError: 'Demo sign-in failed',
  },
  hreflang: {
    sv: 'https://auroratransport.se/',
    en: 'https://auroratransport.se/en',
  },
  langSwitch: {
    sv: 'SV',
    en: 'EN',
    aria: 'Switch language',
  },
};

export const landingCopy: Record<Lang, LandingCopy> = { sv: SV, en: EN };
