# Locally served fonts

Inter normal weights 400, 500, 600 and 700 are byte-for-byte copies of the licensed files already bundled by StayBoost. The source files had `.woff2` names, but their actual format is TrueType; these copies use `.ttf` names and `format('truetype')`.

On 2026-10-08, the four TrueType files were losslessly encoded as WOFF2 with FontTools/Brotli. `site-fonts.css` now loads those WOFF2 files (444,464 bytes total instead of 1,302,640 bytes). The original TrueType files and licenses are retained for provenance.

Original StayBoost request: https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,600&family=Inter:wght@400;500;600;700&display=swap

JetBrains Mono normal weights 400 and 500 are byte-for-byte WOFF2 copies from Cykelhjalpen's existing local font bundle. The six supplied subsets and their original unicode ranges are preserved: latin, latin-ext, cyrillic, cyrillic-ext, greek and vietnamese. These variable font subset files support the two declared weights.

Original upstream family: https://fonts.google.com/specimen/JetBrains+Mono

Both families use the SIL Open Font License; complete license texts are bundled as `inter-OFL.txt` and `jetbrainsmono-OFL.txt`.

Plus Jakarta Sans was replaced in Tailwind's sans family by Inter to use an existing licensed local asset. Requests for weight 800 use browser weight matching or synthesis. Existing body CSS font choices are unchanged. No visitor font request uses Google's domains.
