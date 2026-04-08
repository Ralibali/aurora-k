

## Plan: Ta bort alla emojis från e-postmallar

### Sammanfattning
Rensa bort samtliga emojis från e-postmallarna i `supabase/functions/_shared/email-templates.ts` för ett professionellt utseende. Ersätt `featureItem`-funktionens emoji-parameter med en enkel punkt/streck, och ta bort emojis från rubriker, ämnesrader, alertboxar och logo-headern.

### Ändringar

**Fil: `supabase/functions/_shared/email-templates.ts`**

1. **Logo-header (rad 33):** Byt ut `🚛`-emojin mot bokstaven "AT" eller en ren cirkel-ikon i text
2. **`featureItem`-funktionen (rad 91-97):** Ändra så den renderar en punkt (•) istället för emoji-parametern, alternativt ta bort emoji-kolumnen helt
3. **welcomeEmail:** `Välkommen, ${name}! 👋` → `Välkommen, ${name}!` och subject `🚛` borttagen
4. **driverInviteEmail:** `Du har blivit inbjuden! 🎉` → `Du har blivit inbjuden` och byt `📋📍✍️📊` till `•`
5. **paymentFailedEmail:** `⚠️` i heading och subject, `⏰` i alertBox — alla borttagna
6. **assignmentConfirmationEmail:** `📋` i heading, `🟢🔵🔴` i priorityLabel → "Låg/Normal/Brådskande" utan emoji, `📝💬` i alertboxar borttagna
7. **driverWelcomeEmail:** `🎉` i heading, `🚛` i subject, `📋📍✍️⏱️` i featureItems → alla borttagna
8. **subscriptionCancelledEmail:** `📦` i alertBox borttagen
9. **newLeadNotificationEmail:** `🎯` i heading, `💬` i alertBox borttagna
10. **newCustomerMessageEmail:** `💬` i heading och alertBox borttagna

Totalt ca 25 emojis att ta bort/ersätta i en enda fil. Inga andra filer påverkas.

