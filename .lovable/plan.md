
Diagnos

- Jag har kontrollerat både koden och backend: `info@auroramedia.se` har redan vanlig admin-roll, kopplat företag och en separat platform-admin-post.
- Felet verkar därför inte vara att behörigheten saknas, utan att frontend avgör fel startvy.
- Just nu styrs inloggning och dashboard-länkar bara av `role = admin | driver` i `useAuth`, `LoginPage` och `LandingPage`.
- Platform-admin-status laddas separat i `usePlatformAdmin`, så första redirecten hinner redan skicka dig till `/admin` (företagsadmin) i stället för `/platform`.

Plan

1. Samla all access-logik i `src/hooks/useAuth.tsx`
   - Ladda `role`, `companyId` och `isPlatformAdmin` i samma auth-flöde.
   - Använd befintlig backend-funktion `is_platform_admin` i stället för separat UI-fråga mot tabellen.
   - Håll `loading` aktiv tills hela access-profilen är färdig.

2. Ge platform admin högsta prioritet i redirect-logiken
   - `src/pages/LoginPage.tsx`: om användaren är platform admin, skicka till `/platform` först.
   - `src/pages/LandingPage.tsx`: dashboard-knappen ska också peka till `/platform` för platform admin.
   - Ta bort fallbacks där en inloggad användare kan hamna i fel vy innan access-data är klar.

3. Ta bort inkonsekvent dubbel-laddning
   - `src/hooks/usePlatformAdmin.ts`: gör den till en tunn wrapper runt auth-contexten, eller läs `isPlatformAdmin` direkt från `useAuth`.
   - `src/components/PlatformAdminGuard.tsx` och `src/components/AdminSidebar.tsx`: använd samma källa för access-state så länk och route-skydd alltid är synkade.

4. Förtydliga skillnaden mellan platform admin och företagsadmin
   - Platform admin ska landa direkt i platformpanelen.
   - Företagsadmin kan fortfarande nå `/admin`, men det ska inte vara standardvyn för ditt konto.
   - I `PlatformAdminGuard` kan authenticated men ej platform-admin användare skickas till `/admin` i stället för startsidan för tydligare beteende.

Tekniska detaljer

- Filer: `src/hooks/useAuth.tsx`, `src/hooks/usePlatformAdmin.ts`, `src/pages/LoginPage.tsx`, `src/pages/LandingPage.tsx`, `src/components/PlatformAdminGuard.tsx`, `src/components/AdminSidebar.tsx`.
- Ingen databasändring behövs för just detta fel; accessen finns redan i backend.

Förväntat resultat

- När du loggar in med `info@auroramedia.se` ska du hamna i `/platform`, inte i vanliga företagsadmin-vyn.
- Platform Admin-länken, route-skyddet och all omdirigering kommer använda samma laddade access-state och bete sig konsekvent.
