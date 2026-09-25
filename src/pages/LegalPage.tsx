import { Link } from 'react-router-dom';
import terms from '@/content/legal/terms.json';
import dpa from '@/content/legal/dpa.json';
import { usePageMeta } from '@/lib/use-page-meta';
export default function LegalPage({ document }: { document: 'terms' | 'dpa' }) {
  const data = document === 'terms' ? terms : dpa;
  usePageMeta({ title: `${data.title} – Aurora Transport`, description: data.title, canonical: `https://auroratransport.se/${document === 'terms' ? 'villkor' : 'pub-avtal'}` });
  return <main className="mx-auto max-w-3xl px-5 py-12 space-y-6"><Link to="/" className="underline">Till startsidan</Link><h1 className="text-3xl font-bold">{data.title}</h1><p>Version {data.version} · Datum {data.date}</p>{document === 'dpa' && <a className="underline" href={dpa.source} target="_blank" rel="noreferrer">Läs EU-kommissionens fullständiga standardavtalsklausuler (EU) 2021/915</a>}{data.sections.map(section => <section key={section.heading} className="space-y-3"><h2 className="text-xl font-semibold">{section.heading}</h2>{section.paragraphs.map(text => <p key={text}>{text}</p>)}</section>)}{document === 'dpa' && dpa.subprocessors.map(service => <section key={service.name} className="space-y-2"><h3 className="font-semibold">{service.name}</h3><p>{service.purpose}</p><p>Region: {service.region}</p><p>Tredjelandsöverföring: {service.transfer}</p></section>)}</main>;
}
