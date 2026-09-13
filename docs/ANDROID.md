# Android-app – bygge och release

Den aktuella mobilimplementationen och releaseinstruktionerna finns i
[mobile-release.md](mobile-release.md). Android-projektet är incheckat i
releasegrenen `codex/driver-mobile-release` och använder den separata
chaufförsbundlen i `dist-native`.

Efter `npm ci` förbereds plattformen med:

```sh
npm run build:native
node scripts/native-prepare.mjs android
```

Använd den befintliga upload key för appen
`se.auroramedia.auroratransport`. Skapa inte en ny signeringsidentitet för
varje release. Signeringsvariabler, Firebase-konfiguration, versionsnummer,
lokala Gradle-kommandon och Codemagic beskrivs i releaseinstruktionerna.

Firebase-projektet `aurora-transport-f71c5` och Android-appens konfiguration
är förberedda. Backendens FCM-uppgifter och verklig pushleverans behöver
verifieras separat; en lyckad AAB-byggnad innebär inte att push fungerar.

Butikernas granskning och offentlig publicering är separata steg från bygget.
