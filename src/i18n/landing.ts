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
    ctaRegister: string;
    trustPoints: string[];
  };
  values: { title: string; text: string }[];
  seoIntro: {
    eyebrow: string;
    h2: string;
    text: string;
    bullets: string[];
  };
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
  emailOrder: {
    eyebrow: string;
    h2: string;
    sub: string;
    steps: { title: string; text: string }[];
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
    ctaRegister: string;
  };
  social: {
    eyebrow: string;
    h2: string;
    sub: string;
    quotes: { text: string; role: string; company: string }[];
  };
  roi: {
    eyebrow: string;
    h2: string;
    sub: string;
    driversLabel: string;
    assignmentsLabel: string;
    rateLabel: string;
    driversUnit: string;
    assignmentsUnit: string;
    rateUnit: string;
    assumption: string;
    hoursSavedLabel: string;
    moneySavedLabel: string;
    paybackLabel: string;
    paybackSuffix: string;
    perMonth: string;
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
    ctaRegister: string;
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
    // OBS: inga mjuka bindestreck här – de hamnar i sökresultatens titlar.
    title: 'Transportledningssystem för åkerier | Aurora Transport',
    description:
      'Svenskt transportledningssystem för åkerier, budfirmor och bemanning. Uppdrag, förare, tidrapportering och fakturaunderlag – 449 kr/mån.',
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
    badge: 'Svenskt transport­lednings­system för åkerier, bud och bemanning',
    // Mjuka bindestreck (\u00AD) styr var de långa sammansatta orden får brytas
    // så att rubriken inte kapas mitt i en stavelse på smala skärmar.
    h1: 'Transport\u00ADlednings\u00ADsystemet som ersätter Excel, WhatsApp och manuell planering',
    sub: 'Aurora Transport samlar uppdrag, förare, digital tidrapportering och fakturaunderlag i ett enkelt flöde för svenska transportföretag.',
    ctaPrimary: 'Boka demo',
    ctaSecondaryIdle: 'Se demo med exempeldata',
    ctaSecondaryLoading: 'Loggar in...',
    ctaRegister: 'Kom igång – skapa konto',
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
      text: 'Skapa uppdrag, tilldela förare och samla tidrapporter i ett transport­lednings­system i stället för att hoppa mellan Excel, telefon och chattar.',
    },
    {
      title: 'Färre missar',
      text: 'Alla ser rätt information direkt. Mindre dubbelarbete, färre missförstånd och bättre kontroll över varje transportuppdrag.',
    },
    {
      title: 'Snabbare fakturaunderlag',
      text: 'Gå från utfört jobb till tydligare fakturaunderlag med digital tidrapportering, samlad historik och bättre överblick.',
    },
  ],
  seoIntro: {
    eyebrow: 'Vad är Aurora Transport?',
    h2: 'Ett enkelt transport­lednings­system för svenska transportföretag',
    text: 'Aurora Transport är ett transport­lednings­system för åkerier, budfirmor och transportbemanning. Systemet hjälper dig att planera uppdrag, tilldela förare, samla tidrapporter och ta fram fakturaunderlag utan Excel, WhatsApp eller manuell administration.',
    bullets: [
      'Transportplanering och dispatch i samma flöde',
      'Digital tidrapportering för förare',
      'Fakturaunderlag och rapporter samlade på ett ställe',
    ],
  },
  flow: {
    eyebrow: 'Från order till fakturaunderlag',
    h2: 'Så fungerar Aurora Transport i praktiken',
    sub: 'Ett tydligt dispatchflöde för uppdrag, förare, tidrapportering och fakturaunderlag — utan extra administration.',
    steps: [
      { label: '01', title: 'Skapa uppdrag', text: 'Lägg in kund, adress, tid och instruktioner i systemet.' },
      { label: '02', title: 'Tilldela förare', text: 'Välj rätt förare och skicka ut jobbet direkt.' },
      { label: '03', title: 'Föraren ser jobbet', text: 'All information finns i mobilen, utan extra chattar.' },
      { label: '04', title: 'Tidrapportera', text: 'Start, stopp och kommentarer registreras enkelt.' },
      { label: '05', title: 'Underlag klart', text: 'Samla tid och uppdrag till tydligare fakturaunderlag.' },
    ],
  },
  features: {
    eyebrow: 'Funktioner',
    h2: 'Allt du behöver i ett modernt transport­lednings­system',
    sub: 'Ett fokuserat åkerisystem och dispatchsystem för transportföretag som vill samla uppdrag, förare, tidrapportering och fakturaunderlag på ett ställe.',
    groups: [
      {
        title: 'Uppdrag och dispatch',
        text: 'Planera dagen, skapa transportuppdrag, tilldela förare och följ status i realtid.',
        items: ['Skapa uppdrag snabbt', 'Tilldela förare', 'Status i realtid'],
      },
      {
        title: 'Förare och mobil vy',
        text: 'Ge förare rätt information direkt i mobilen och minska behovet av samtal, SMS och chattgrupper.',
        items: ['Mobil förarvy', 'Tydliga instruktioner', 'Mindre chattkaos'],
      },
      {
        title: 'Tidrapportering och ekonomi',
        text: 'Samla arbetstid, rapporter, historik och fakturaunderlag utan dubbelarbete.',
        items: ['Digital tidrapportering', 'Fakturaunderlag', 'Rapporter och överblick'],
      },
    ],
  },
  emailOrder: {
    eyebrow: 'Nytt',
    h2: 'Mejla in ordern – klart',
    sub: 'Kunden mejlar sin order. Systemet läser PDF eller text med AI. Transportledaren godkänner utkastet med ett klick.',
    steps: [
      { title: 'Kunder mejlar sin order till er adress', text: 'Skicka in befintlig kund till er inbox – ingen ny portal, inget nytt formulär.' },
      { title: 'Systemet läser PDF/text med AI', text: 'Automatisk tolkning av adresser, gods och tidsfönster direkt från mejlet eller den bifogade PDF:en.' },
      { title: 'Transportledaren godkänner utkastet med ett klick', text: 'Se det AI-genererade uppdraget, justera vid behov och lägg ut det på rätt förare.' },
    ],
  },
  audiences: {
    eyebrow: 'För vem?',
    h2: 'Transport­lednings­system för åkerier, budfirmor och transportbemanning',
    sub: 'Aurora Transport är byggt för transportbolag som behöver ordning, fart och enkelhet — inte fler komplicerade system.',
    items: [
      { title: 'Åkerier', text: 'För mindre och växande åkerier som vill få bättre kontroll över uppdrag, förare och fakturaunderlag.' },
      { title: 'Budfirmor', text: 'För budfirmor med snabba jobb, många ändringar och behov av tydlig mobil kommunikation.' },
      { title: 'Transportbemanning', text: 'För verksamheter som behöver hålla koll på personal, pass, tider, uppdrag och rapportering.' },
    ],
  },
  pricing: {
    eyebrow: 'Pris',
    h2: 'Ett prisvärt transport­lednings­system utan krångel',
    sub: 'För transportföretag som vill komma igång snabbt utan bindningstid, dolda avgifter eller dyra licenser per användare.',
    setupLabel: 'Setup',
    setupPrice: '3 500 kr',
    setupText: 'Engångskostnad för uppstart, konfiguration och onboarding.',
    monthlyLabel: 'Löpande',
    monthlyPrice: '449 kr',
    monthlyUnit: 'per månad',
    monthlyText: 'Obegränsat antal förare, admins och uppdrag. Support på svenska ingår.',
    monthlyBenefits: ['Ingen bindningstid', 'Support på svenska', 'Obegränsat antal förare', 'Fakturaunderlag ingår'],
    cta: 'Boka demo',
    ctaRegister: 'Kom igång – skapa konto',
  },
  social: {
    eyebrow: 'Kundröster',
    h2: 'Byggd tillsammans med svenska åkerier',
    sub: 'Vi utvecklar Aurora Transport i nära dialog med transportörerna som använder det varje dag.',
    quotes: [
      {
        text: 'Vi gick från Excel-ark och sms-trådar till att ha hela planeringen i ett flöde. Fakturaunderlagen skapar sig själva.',
        role: 'Disponent',
        company: 'Familjeåkeri i Västra Götaland',
      },
      {
        text: 'Förarna rapporterar tid direkt i appen och kunden följer leveransen live. Telefonen har blivit mycket tystare.',
        role: 'Trafikchef',
        company: 'Budfirma i Stockholm',
      },
      {
        text: 'Nya förare kommer igång på en dag. Allt de behöver finns i mobilen – uppdrag, adresser och tidrapporter.',
        role: 'Ägare',
        company: 'Åkeri i Skåne',
      },
    ],
  },
  roi: {
    eyebrow: 'Räkna på det',
    h2: 'Vad är din administration värd?',
    sub: 'Dra i reglagen och se hur mycket tid och pengar ett transport­lednings­system kan frigöra varje månad.',
    driversLabel: 'Antal förare',
    assignmentsLabel: 'Uppdrag per förare och vecka',
    rateLabel: 'Timkostnad för administration',
    driversUnit: 'st',
    assignmentsUnit: 'st',
    rateUnit: 'kr/h',
    assumption: 'Räkneexempel: 15 minuter sparad administration per uppdrag – planering, förarkontakt, tidrapporter och fakturaunderlag som annars hamnar i Excel, SMS och telefonsamtal.',
    hoursSavedLabel: 'Sparad tid',
    moneySavedLabel: 'Sparat värde',
    paybackLabel: 'Aurora betalar sig självt',
    paybackSuffix: 'gånger om',
    perMonth: 'per månad',
    cta: 'Boka demo och se hur',
  },
  faq: {
    eyebrow: 'FAQ',
    h2: 'Vanliga frågor om transport­lednings­system',
    sub: 'Kort, rakt och utan krångel. Precis som systemet.',
    items: [
      { q: 'Vad är ett transport­lednings­system?', a: 'Ett transport­lednings­system hjälper transportföretag att planera uppdrag, tilldela förare, följa status, samla tidrapporter och skapa fakturaunderlag i ett gemensamt system.' },
      { q: 'Vad kostar Aurora Transport?', a: 'Aurora Transport kostar 449 kr per månad. Setup och onboarding kostar 3 500 kr som engångskostnad.' },
      { q: 'Kan Aurora Transport användas som dispatchsystem?', a: 'Ja. Aurora Transport fungerar som ett enkelt dispatchsystem där du kan skapa uppdrag, tilldela förare och följa status i realtid.' },
      { q: 'Finns det bindningstid?', a: 'Nej. Du kan säga upp när du vill. Målet är att systemet ska vara enkelt att börja med och enkelt att stanna kvar i.' },
      { q: 'Passar Aurora Transport små åkerier?', a: 'Ja. Aurora Transport är byggt för mindre åkerier och transportföretag som vill bort från Excel, WhatsApp och manuell administration.' },
      { q: 'Kan förarna använda mobilen?', a: 'Ja. Förarna kan se uppdrag och rapportera information direkt via mobilen.' },
      { q: 'Hur fungerar digital tidrapportering?', a: 'Föraren rapporterar tid och uppdragsinformation digitalt. Informationen kan sedan användas för bättre uppföljning och tydligare fakturaunderlag.' },
      { q: 'Hur snabbt kan vi komma igång?', a: 'De flesta kan komma igång samma dag efter en kort genomgång och enkel uppsättning.' },
    ],
  },
  finalCta: {
    h2: 'Redo för ett enklare transport­lednings­system?',
    sub: 'Boka en kort demo så visar vi hur Aurora Transport kan ersätta Excel, WhatsApp och manuell planering i ditt transportföretag.',
    primary: 'Boka demo',
    secondaryIdle: 'Se demo med exempeldata',
    secondaryLoading: 'Loggar in...',
    ctaRegister: 'Kom igång – skapa konto',
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
    title: 'Transport management system for hauliers | Aurora Transport',
    description:
      'Swedish TMS for hauliers, couriers and transport staffing. Jobs, drivers, time reporting and invoice drafts from 449 SEK/month.',
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
    badge: 'Swedish transport management system for hauliers, couriers and staffing teams',
    h1: 'The transport management system that replaces Excel, WhatsApp and manual planning',
    sub: 'Aurora Transport brings jobs, drivers, digital time reporting and invoice drafts into one simple flow for transport companies.',
    ctaPrimary: 'Book a demo',
    ctaSecondaryIdle: 'Try the live demo',
    ctaSecondaryLoading: 'Signing in...',
    ctaRegister: 'Get started',
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
      text: 'Create jobs, assign drivers and collect time reports in one transport management system instead of jumping between Excel, phone calls and chats.',
    },
    {
      title: 'Fewer mistakes',
      text: 'Everyone sees the right information instantly. Less double work, fewer misunderstandings and better control of every transport job.',
    },
    {
      title: 'Faster invoice drafts',
      text: 'Move from completed job to clearer invoice drafts with digital time reporting, unified history and better overview.',
    },
  ],
  seoIntro: {
    eyebrow: 'What is Aurora Transport?',
    h2: 'A simple transport management system for modern transport companies',
    text: 'Aurora Transport is a transport management system for hauliers, courier companies and transport staffing teams. It helps you plan jobs, assign drivers, collect time reports and create invoice drafts without Excel, WhatsApp or manual admin.',
    bullets: [
      'Transport planning and dispatch in one flow',
      'Digital time reporting for drivers',
      'Invoice drafts and reports in one place',
    ],
  },
  flow: {
    eyebrow: 'From order to invoice draft',
    h2: 'How Aurora Transport works in practice',
    sub: 'A clear dispatch flow for jobs, drivers, time reporting and invoice drafts — without the extra admin.',
    steps: [
      { label: '01', title: 'Create a job', text: 'Add customer, address, time and instructions in the system.' },
      { label: '02', title: 'Assign a driver', text: 'Pick the right driver and send out the job instantly.' },
      { label: '03', title: 'Driver sees the job', text: 'Everything they need is on their phone — no extra chat threads.' },
      { label: '04', title: 'Time reporting', text: 'Start, stop and notes are captured in a couple of taps.' },
      { label: '05', title: 'Invoice draft ready', text: 'Time and jobs are bundled into clean invoice drafts.' },
    ],
  },
  features: {
    eyebrow: 'Features',
    h2: 'Everything you need in a modern transport management system',
    sub: 'A focused dispatch and transport planning system for companies that want jobs, drivers, time reporting and invoice drafts in one place.',
    groups: [
      {
        title: 'Jobs and dispatch',
        text: 'Plan the day, create transport jobs, assign drivers and follow status in real time.',
        items: ['Create jobs fast', 'Assign drivers', 'Real-time status'],
      },
      {
        title: 'Drivers and mobile view',
        text: 'Give drivers the right information on their phone and reduce calls, texts and chat groups.',
        items: ['Mobile driver view', 'Clear instructions', 'Less chat chaos'],
      },
      {
        title: 'Time reporting and finance',
        text: 'Collect working time, reports, history and invoice drafts without doing the work twice.',
        items: ['Digital time reporting', 'Invoice drafts', 'Reports and overview'],
      },
    ],
  },
  emailOrder: {
    eyebrow: 'New',
    h2: 'Email the order – done',
    sub: 'Customers email their order. The system reads the PDF or text with AI. Your dispatcher approves the draft with one click.',
    steps: [
      { title: 'Customers email the order to your address', text: 'They send to your inbox – no new portal, no new form.' },
      { title: 'The system reads the PDF/text with AI', text: 'Addresses, goods and time windows are parsed automatically from the email or attached PDF.' },
      { title: 'Your dispatcher approves the draft in one click', text: 'Review the AI-generated job, adjust if needed and assign the right driver.' },
    ],
  },
  audiences: {
    eyebrow: 'Who is it for?',
    h2: 'Transport management system for hauliers, couriers and transport staffing teams',
    sub: 'Aurora Transport is built for transport companies that need order, speed and simplicity — not yet another complicated system.',
    items: [
      { title: 'Hauliers', text: 'For small and growing hauliers that want better control over jobs, drivers and invoice drafts.' },
      { title: 'Couriers', text: 'For courier companies with fast jobs, frequent changes and a need for clear mobile communication.' },
      { title: 'Transport staffing', text: 'For teams that need to keep track of staff, shifts, hours, jobs and reporting.' },
    ],
  },
  pricing: {
    eyebrow: 'Pricing',
    h2: 'A cost-effective transport management system without the hassle',
    sub: 'For transport companies that want to get started quickly — no lock-in, no hidden fees and no expensive per-user licences.',
    setupLabel: 'Setup',
    setupPrice: '3,500 SEK',
    setupText: 'One-time fee for setup, configuration and onboarding.',
    monthlyLabel: 'Monthly',
    monthlyPrice: '449 SEK',
    monthlyUnit: 'per month',
    monthlyText: 'Unlimited drivers, admins and jobs. Human support included.',
    monthlyBenefits: ['No lock-in', 'Human support', 'Unlimited drivers', 'Invoice drafts included'],
    cta: 'Book a demo',
    ctaRegister: 'Get started',
  },
  social: {
    eyebrow: 'Customer voices',
    h2: 'Built together with Swedish hauliers',
    sub: 'We develop Aurora Transport in close dialogue with the carriers who use it every day.',
    quotes: [
      {
        text: 'We went from spreadsheets and text messages to having the whole plan in one flow. The invoice basis writes itself.',
        role: 'Dispatcher',
        company: 'Family haulier in Västra Götaland',
      },
      {
        text: 'Drivers report time straight in the app and customers follow deliveries live. The phone has gone much quieter.',
        role: 'Traffic manager',
        company: 'Courier company in Stockholm',
      },
      {
        text: 'New drivers get started in a day. Everything they need is on their phone – jobs, addresses and time reports.',
        role: 'Owner',
        company: 'Haulier in Skåne',
      },
    ],
  },
  roi: {
    eyebrow: 'Do the math',
    h2: 'What is your admin time worth?',
    sub: 'Move the sliders and see how much time and money a transport management system can free up every month.',
    driversLabel: 'Number of drivers',
    assignmentsLabel: 'Jobs per driver and week',
    rateLabel: 'Hourly cost of admin work',
    driversUnit: '',
    assignmentsUnit: '',
    rateUnit: 'SEK/h',
    assumption: 'Example: 15 minutes of admin saved per job – planning, driver calls, time reports and invoice drafts that otherwise end up in Excel, texts and phone calls.',
    hoursSavedLabel: 'Time saved',
    moneySavedLabel: 'Value saved',
    paybackLabel: 'Aurora pays for itself',
    paybackSuffix: 'times over',
    perMonth: 'per month',
    cta: 'Book a demo and see how',
  },
  faq: {
    eyebrow: 'FAQ',
    h2: 'Common questions about transport management systems',
    sub: 'Short, straight and to the point — just like the system.',
    items: [
      { q: 'What is a transport management system?', a: 'A transport management system helps transport companies plan jobs, assign drivers, follow status, collect time reports and create invoice drafts in one shared system.' },
      { q: 'What does Aurora Transport cost?', a: 'Aurora Transport is 449 SEK per month. Setup and onboarding is a one-time fee of 3,500 SEK.' },
      { q: 'Can Aurora Transport be used as a dispatch system?', a: 'Yes. Aurora Transport works as a simple dispatch system where you can create jobs, assign drivers and follow status in real time.' },
      { q: 'Is there a lock-in period?', a: 'No. You can cancel whenever you want. We want the system to be easy to start with and easy to stay with.' },
      { q: 'Does Aurora Transport suit small hauliers?', a: 'Yes. Aurora Transport is built for small transport companies that want to move away from Excel, WhatsApp and manual admin.' },
      { q: 'Can drivers use it on their phone?', a: 'Yes. Drivers can see jobs and report directly from their phone.' },
      { q: 'How does digital time reporting work?', a: 'The driver reports time and job information digitally. The information can then be used for better follow-up and clearer invoice drafts.' },
      { q: 'How quickly can we get started?', a: 'Most teams are up and running the same day after a short walkthrough and a simple setup.' },
    ],
  },
  finalCta: {
    h2: 'Ready for a simpler transport management system?',
    sub: 'Book a short demo and we will show you how Aurora Transport can replace Excel, WhatsApp and manual planning in your transport business.',
    primary: 'Book a demo',
    secondaryIdle: 'Try the live demo',
    secondaryLoading: 'Signing in...',
    ctaRegister: 'Get started',
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
