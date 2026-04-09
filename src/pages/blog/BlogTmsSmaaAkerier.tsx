import { BlogLayout } from '@/components/BlogLayout';
import { BlogCta } from '@/components/BlogCta';

export default function BlogTmsSmaaAkerier() {
  return (
    <BlogLayout
      slug="transportledningssystem-for-sma-akeries"
      title="Transportledningssystem för små åkerier – vad passar dig?"
      seoTitle="Transportledningssystem för små åkerier – vad passar dig?"
      metaDescription="Är du ett litet åkeri på 1–20 fordon? Här är vad du ska tänka på när du väljer ett transportledningssystem – och vilka system som faktiskt passar din storlek."
      publishDate="2026-03-20"
      readTime="4 min"
    >
      <p>De flesta TMS-system är byggda för stora speditörer med IT-avdelning och dedikerade projektledare. Det lämnar tusentals svenska småföretagare med ett problem: systemen är antingen för dyra, för komplicerade eller kräver månader av implementation.</p>
      <p>Men marknaden förändras. Moderna, molnbaserade system riktar sig nu direkt mot åkerier med 1–20 fordon.</p>

      <h2>Vad behöver ett litet åkeri egentligen?</h2>
      <p>Låt oss vara ärliga. Du behöver inte EDI-integration med IKEA:s lagersystem. Du behöver:</p>
      <ul>
        <li>En enkel vy över alla aktiva körordrar</li>
        <li>Snabb förartilldelning, helst med ett klick</li>
        <li>En app som föraren kan installera på sin egen telefon</li>
        <li>Tydlig historik och rapportering för fakturering</li>
        <li>Pris som inte äter upp din marginal</li>
      </ul>

      <h2>Undvik vanliga misstag</h2>
      <p><strong>Misstag 1: Välja system baserat på funktionslista.</strong> Fler funktioner är inte bättre. Varje onödig funktion är en knapp din personal måste lära sig – och en anledning att inte logga in.</p>
      <p><strong>Misstag 2: Ignorera mobilupplevelsen.</strong> Dina förare arbetar i bilen, inte vid ett skrivbord. Om appen är klumpig slutar de använda den.</p>
      <p><strong>Misstag 3: Välja system med per-förare-prissättning.</strong> Det gör det dyrt att växa och skapar incitament att undvika att lägga in alla i systemet.</p>

      <h2>Aurora Transport passar lika bra för ett fordon som för tjugo</h2>
      <p>Priset är detsamma oavsett hur du växer. Onboardingen tar en dag, inte en månad. Och du behöver ingen konsult – du kan sätta upp allt själv via självbetjäningsportalen.</p>

      <BlogCta text="Kom igång med Aurora Transport idag" />
    </BlogLayout>
  );
}
