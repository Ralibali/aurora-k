import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { loadGoogleMaps, useGoogleMapsAvailable } from '@/lib/google-maps';

export default function GoogleAddressSearch({ label, onSelect }: { label: string; onSelect: (address: string) => void }) {
  const [open, setOpen] = useState(false);
  const mapsAvailable = useGoogleMapsAvailable();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let widget: google.maps.places.PlaceAutocompleteElement | undefined;
    let selection = 0;
    setLoading(true); setError('');
    const timeout = window.setTimeout(() => { if (!cancelled) { cancelled = true; setLoading(false); setError('Adressökningen kunde inte laddas. Skriv adressen i fältet ovan.'); } }, 15000);
    const choose = async (event: Event) => {
      const current = ++selection;
      try {
        const place = (event as google.maps.places.PlacePredictionSelectEvent).placePrediction.toPlace();
        await place.fetchFields({ fields: ['formattedAddress'] });
        if (!cancelled && current === selection && place.formattedAddress) { selectRef.current(place.formattedAddress); setOpen(false); }
      } catch { if (!cancelled) setError('Adressen kunde inte hämtas. Skriv den i fältet ovan.'); }
    };
    const fail = () => { if (!cancelled) setError('Google kunde inte söka adresser. Du kan fortfarande skriva adressen själv.'); };
    loadGoogleMaps().then(() => google.maps.importLibrary('places') as Promise<google.maps.PlacesLibrary>).then(({ PlaceAutocompleteElement }) => {
      if (cancelled || !host.current) return;
      widget = new PlaceAutocompleteElement({ includedRegionCodes: ['se'], requestedLanguage: 'sv', requestedRegion: 'se' });
      widget.setAttribute('aria-label', `Sök ${label.toLowerCase()} med Google Maps`);
      widget.addEventListener('gmp-select', choose);
      widget.addEventListener('gmp-error', fail);
      host.current.appendChild(widget);
      window.clearTimeout(timeout); setLoading(false);
    }).catch(() => { window.clearTimeout(timeout); if (!cancelled) { setLoading(false); fail(); } });
    return () => { cancelled = true; window.clearTimeout(timeout); widget?.removeEventListener('gmp-select', choose); widget?.removeEventListener('gmp-error', fail); widget?.remove(); };
  }, [open, label]);
  if (!mapsAvailable) return null;
  return <div className="space-y-2"><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(v => !v)}>{open ? 'Stäng adressökning' : 'Sök adress med Google Maps'}</Button>{open && <><div ref={host} />{loading && <p role="status" className="text-xs">Laddar adressökning…</p>}{error && <p role="alert" className="text-xs text-muted-foreground">{error}</p>}</>}</div>;
}
