import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { serviceCategory, type AssignmentServiceDetails } from '@/lib/assignment-services';

interface Props {
  service: string;
  value: AssignmentServiceDetails;
  onChange: (value: AssignmentServiceDetails) => void;
}

export function AssignmentServiceFields({ service, value, onChange }: Props) {
  const category = serviceCategory(service);
  if (!category) return null;
  const field = (key: keyof AssignmentServiceDetails, label: string, placeholder: string, type = 'text') => (
    <div className="space-y-2" key={key}>
      <Label htmlFor={`service-${key}`}>{label}</Label>
      <Input id={`service-${key}`} type={type} min={type === 'number' ? '0' : undefined} step={type === 'number' ? 'any' : undefined}
        value={value[key]} onChange={event => onChange({ ...value, [key]: event.target.value })} placeholder={placeholder} />
    </div>
  );
  return (
    <section aria-label={category === 'container' ? 'Containeruthyrning' : 'Kranbilsjobb'} className="space-y-4 rounded-xl border bg-muted/30 p-4">
      <div>
        <h2 className="font-semibold">{category === 'container' ? 'Containeruthyrning' : 'Kranbilsjobb'}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Uppgifterna följer med i chaufförens uppdragsinstruktioner.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {category === 'container' ? <>
          {field('containerId', service === 'Container – byte' ? 'Container ut – ID' : 'Container-ID', 'T.ex. C-024')}
          {service === 'Container – byte' && field('returnContainerId', 'Container in – ID', 'T.ex. C-018')}
          {field('volume', 'Volym (m³)', 'T.ex. 10', 'number')}
          {field('material', 'Material / avfallsslag', 'T.ex. trä, schaktmassor, blandat byggavfall')}
          {field('disposalSite', 'Mottagningsanläggning', 'Namn och eventuell vågreferens')}
          {service !== 'Container – hämtning' && <>
            {field('rentalEnd', 'Planerat hämtdatum', '', 'date')}
            {field('dailyRent', 'Avtalad dygnshyra (kr exkl. moms)', 'T.ex. 80', 'number')}
            <p className="text-xs text-muted-foreground sm:col-span-2">Boka hämtningen som ett separat uppdrag. Dygnshyran är avtalsinformation; ange fakturabeloppet nedan.</p>
          </>}
        </> : <>
          {field('cargo', 'Gods / lyftobjekt', 'T.ex. betongelement eller maskin')}
          {field('weight', 'Uppgiven vikt (kg)', 'T.ex. 2500', 'number')}
          {field('reach', 'Önskad räckvidd (m)', 'T.ex. 12', 'number')}
          {field('liftHeight', 'Önskad lyfthöjd (m)', 'T.ex. 8', 'number')}
        </>}
        {field('contact', 'Kontakt på plats', 'Namn och telefonnummer')}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="service-siteAccess">{category === 'container' ? 'Placering och åtkomst' : 'Uppställningsplats och åtkomst'}</Label>
          <Textarea id="service-siteAccess" value={value.siteAccess} onChange={event => onChange({ ...value, siteAccess: event.target.value })}
            placeholder={category === 'container' ? 'Placering, portkod, tillfart och kontakt vid ankomst' : 'Utrymme för stödben, underlag, tillfart och hinder'} />
        </div>
      </div>
    </section>
  );
}
