# Bevara lokala kalenderdatum i demobokningen

6 september 2026. Utvecklingsförslag; inte publicerat.

Efter midnatt kunde en svensk besökare välja exempelvis måndag men få söndagens datum i förfrågan, eftersom datumvärdet konverterades till UTC medan etiketten använde lokal tid. Datumen genereras nu som lokala kalenderdatum och alternativen räknas om när formuläret renderas igen.

Verifiering: 33 tester i 11 filer, typkontroll, lint och produktionsbygge passerar. Tre nya testfall täcker tiden efter midnatt, helger/tidsomställning och årsskifte. Inga kontaktuppgifter eller verkliga demoförfrågningar skickades. Ingen ändring av serveranrop, priser eller betalningar.

