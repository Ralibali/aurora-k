import React, { type ReactNode } from 'react';

/** Shared by the live page and its first HTML paint. No browser-only dependencies. */
export function HomeHero({ lang = 'sv', children }: { lang?: 'sv' | 'en'; children?: ReactNode }) {
  const copy = (sv: string, en: string) => lang === 'en' ? en : sv;
  return (
        <section className="home-hero" aria-labelledby="home-title">
          <picture>
            <source media="(max-width: 639px)" srcSet="/images/home/hero-van-640.avif 640w, /images/home/hero-van-960.avif 960w" sizes="100vw" />
            <img className="home-hero-image" src="/images/home/hero-dawn-1600.avif" srcSet="/images/home/hero-dawn-640.avif 640w, /images/home/hero-dawn-960.avif 960w, /images/home/hero-dawn-1600.avif 1600w, /images/home/hero-dawn-1920.avif 1920w" sizes="100vw" width="1368" height="1824" alt={copy('Transportfordon på en depå i gryningen', 'Transport vehicles at a depot at dawn')} {...{ fetchpriority: 'high' }} />
          </picture>
          <div className="home-container home-hero-content">
            <div className="home-hero-copy">
              <p className="home-eyebrow">{copy('Aurora Transport · Ordning på arbetsdagen', 'Aurora Transport · Your working day, in order')}</p>
              <h1 id="home-title">{copy('Planeringen ska inte ligga i en WhatsApp-grupp.', 'Your schedule should not live in a WhatsApp group.')}</h1>
              <p className="home-hero-intro">{copy('Aurora Transport samlar uppdrag, förare, tidrapporter och fakturaunderlag på ett ställe. Gjort för åkerier och budfirmor som har vuxit ur Excel.', 'Aurora Transport keeps assignments, drivers, time reports and invoice records in one place. Made for hauliers and courier companies that have outgrown Excel.')}</p>
              {children ?? (<a className="home-button home-button-light" href={lang === 'en' ? '/en/book' : '/boka-demo'}>{copy('Boka en demo på 15 minuter', 'Book a 15-minute demo')} <span aria-hidden="true">↗</span></a>)}
            </div>
          </div>
        </section>
  );
}
