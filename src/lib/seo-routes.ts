export type SeoRoute = {
  path: string;
  priority: string;
  changefreq: "daily" | "weekly" | "monthly" | "yearly";
  lastmod?: string;
};

export const SEO_ROUTES: SeoRoute[] = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/en", priority: "0.9", changefreq: "weekly" },

  { path: "/tjanster", priority: "0.9", changefreq: "monthly" },
  { path: "/transportledningssystem", priority: "0.9", changefreq: "monthly" },
  { path: "/tidrapportering-transport", priority: "0.9", changefreq: "weekly", lastmod: "2026-04-29" },
  { path: "/vad-kostar-transportledningssystem", priority: "0.9", changefreq: "weekly", lastmod: "2026-04-29" },
  { path: "/coredination-alternativ", priority: "0.9", changefreq: "monthly" },
  { path: "/opter-alternativ", priority: "0.8", changefreq: "monthly", lastmod: "2026-07-03" },
  { path: "/workify-alternativ", priority: "0.8", changefreq: "monthly", lastmod: "2026-07-03" },
  { path: "/hogia-transport-alternativ", priority: "0.8", changefreq: "monthly", lastmod: "2026-07-03" },
  { path: "/pindeliver-alternativ", priority: "0.8", changefreq: "monthly", lastmod: "2026-07-03" },
  { path: "/alystra-alternativ", priority: "0.8", changefreq: "monthly", lastmod: "2026-07-03" },
  { path: "/budtjanst-app", priority: "0.8", changefreq: "monthly" },
  { path: "/akeri-system", priority: "0.8", changefreq: "monthly" },
  { path: "/dispatch-system", priority: "0.8", changefreq: "monthly" },

  { path: "/om-oss", priority: "0.7", changefreq: "monthly" },
  { path: "/kontakt", priority: "0.7", changefreq: "monthly" },

  { path: "/blogg", priority: "0.9", changefreq: "weekly" },
  { path: "/blogg/basta-dispatchsystemet-for-akeri-2026", priority: "0.8", changefreq: "monthly", lastmod: "2026-04-01" },
  { path: "/blogg/basta-transportledningssystemet-for-sma-akerier-2026", priority: "0.8", changefreq: "monthly", lastmod: "2026-07-03" },
  { path: "/blogg/hur-digitaliserar-man-sin-budtjanst", priority: "0.8", changefreq: "monthly", lastmod: "2026-03-28" },
  { path: "/blogg/vad-kostar-ett-transportledningssystem", priority: "0.8", changefreq: "monthly", lastmod: "2026-03-24" },
  { path: "/blogg/transportledningssystem-for-sma-akerier", priority: "0.8", changefreq: "monthly", lastmod: "2026-03-20" },
  { path: "/blogg/dispatch-app-forare-transport", priority: "0.8", changefreq: "monthly", lastmod: "2026-03-16" },
  { path: "/blogg/bemanningsbolag-transport-system", priority: "0.8", changefreq: "monthly", lastmod: "2026-03-12" },
  { path: "/blogg/skillnad-tms-dispatch-system", priority: "0.8", changefreq: "monthly", lastmod: "2026-03-08" },
  { path: "/blogg/transportapp-utan-bindningstid", priority: "0.8", changefreq: "monthly", lastmod: "2026-03-04" },
  { path: "/blogg/digitalt-korordrersystem-fordelar", priority: "0.8", changefreq: "monthly", lastmod: "2026-02-28" },
  { path: "/blogg/byta-dispatchsystem-guide", priority: "0.8", changefreq: "monthly", lastmod: "2026-02-24" },

  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
];

export const PRERENDER_ROUTES = SEO_ROUTES.map((route) => route.path);
