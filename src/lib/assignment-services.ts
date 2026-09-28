export const assignmentServiceTypes = [
  'Container – utsättning', 'Container – byte', 'Container – hämtning',
  'Kranbil – lyft', 'Kranbil – transport och lyft',
  'Kranbil', 'Budbil', 'Tippbil', 'Krokbil', 'TMA-skydd', 'Byggsäck', 'Maskintransport', 'Annat',
] as const;

export interface AssignmentServiceDetails {
  containerId: string;
  returnContainerId: string;
  volume: string;
  material: string;
  rentalEnd: string;
  dailyRent: string;
  disposalSite: string;
  cargo: string;
  weight: string;
  reach: string;
  liftHeight: string;
  siteAccess: string;
  contact: string;
}

export const emptyServiceDetails: AssignmentServiceDetails = {
  containerId: '', returnContainerId: '', volume: '', material: '', rentalEnd: '', dailyRent: '',
  disposalSite: '', cargo: '', weight: '', reach: '', liftHeight: '', siteAccess: '', contact: '',
};

export function serviceCategory(service: string) {
  if (service.startsWith('Container')) return 'container';
  if (service.startsWith('Kranbil')) return 'crane';
  return null;
}

export function validateServiceDetails(service: string, details: AssignmentServiceDetails, start: string): string | null {
  const category = serviceCategory(service);
  const numeric = category === 'container'
    ? [details.volume, details.dailyRent]
    : category === 'crane' ? [details.weight, details.reach, details.liftHeight] : [];
  if (numeric.some(value => value.trim() && (!Number.isFinite(Number(value)) || Number(value) < 0))) {
    return 'Ange giltiga, positiva mått och belopp.';
  }
  if (category === 'container' && service !== 'Container – hämtning' && details.rentalEnd && details.rentalEnd < start.slice(0, 10)) {
    return 'Planerad hämtning kan inte vara före utsättningen.';
  }
  return null;
}

/** Persist the job brief in existing instructions so it is visible to drivers,
 * in assignment details and in exports, without a schema rollout dependency. */
export function buildServiceInstructions(service: string, details: AssignmentServiceDetails, instructions: string): string {
  const category = serviceCategory(service);
  if (!category) return instructions.trim();
  const lines: string[] = [];
  const add = (label: string, value: string, unit = '') => {
    if (value.trim()) lines.push(`${label}: ${value.trim()}${unit}`);
  };
  if (category === 'container') {
    add(service === 'Container – byte' ? 'Container ut' : 'Container-ID', details.containerId);
    if (service === 'Container – byte') add('Container in', details.returnContainerId);
    add('Volym', details.volume, ' m³');
    add('Material / avfallsslag', details.material);
    if (service !== 'Container – hämtning') {
      add('Planerad hämtning (bokas separat)', details.rentalEnd);
      add('Avtalad dygnshyra exkl. moms', details.dailyRent, ' kr/dygn');
    }
    add('Mottagningsanläggning', details.disposalSite);
  } else {
    add('Gods / lyftobjekt', details.cargo);
    add('Uppgiven vikt', details.weight, ' kg');
    add('Önskad räckvidd', details.reach, ' m');
    add('Önskad lyfthöjd', details.liftHeight, ' m');
  }
  add('Placering / åtkomst / uppställning', details.siteAccess);
  add('Kontakt på plats', details.contact);
  return [instructions.trim(), lines.length ? `${service}\n${lines.join('\n')}` : ''].filter(Boolean).join('\n\n');
}

export function assignmentErrorMessage(error: unknown): string {
  const details = error && typeof error === 'object' ? error as { code?: string; message?: string } : {};
  if (details.code === '42501' || details.code === 'PGRST301') return 'Du saknar behörighet att skapa uppdrag för företaget. Logga in igen eller be en administratör kontrollera din åtkomst.';
  if (details.code === '23503' || details.code === '22P02') return 'Kontrollera vald kund, chaufför, fordon och beställning. Ett av valen är inte längre tillgängligt.';
  if (details.code === '23502') return 'En obligatorisk uppgift saknas. Kontrollera kund, chaufför, titel och starttid.';
  if (details.message && !details.code) return details.message;
  return `Uppdraget kunde inte sparas. Dina uppgifter finns kvar. Försök igen.${details.code ? ` Felkod: ${details.code}.` : ''}`;
}
