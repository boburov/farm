# Tashqi asset manbalari

Hammasi lokal saqlanadi — sahifa internetsiz to'liq ishlaydi
(`no-external-requests` QA kafolati). CDN havolasi yo'q.

## Shriftlar — `assets/fonts/`

**Archivo** (Omnibus-Type) va **Instrument Serif** (Rodrigo Fuenzalida,
Jordan Egstad) — SIL Open Font License 1.1 (https://openfontlicense.org).
Google Fonts'dan yuklab olingan; `@font-face` qoidalari `assets/fonts.css` da.
Hozirgi sahifa faqat Archivo'ni ishlatadi.

## 3D model — `assets/models/chicken-parts.glb`

Buyurtmachi bergan `~/Desktop/chicken.glb` (92 MB, 2.74 mln uchburchak,
Tripo AI mesh, qo'lda kesilgan) dan `scripts/prep-chicken-parts.mjs`
tayyorlaydi: 174 365 uchburchak, 4.18 MB, WebP teksturalar
(`KHR_mesh_quantization`), hammasi fayl ichiga joylashtirilgan.

Yetti tugun: `torso · wingL · wingR · legL · legR · neck · tail`.
Batafsil shartnoma va tuzoqlar — `HANDOFF.md`.

## Bo'laklar suratlari — `assets/photos/cuts/`

To'qqizta fon-shaffof PNG (`akorachka · file · qanot · golen · bedro ·
drakon · teri · karkas · qanot-uchi`). Manba — `~/Desktop/toviqxona`
loyihasining `site/assets/img/cut-*-alpha.png` fayllari (2026-09-12 da
o'zgarishsiz ko'chirildi, taxminan 60-90 KB dan). 2025-2026 sahifasidagi
halqada shular ko'rinadi (`assets/years.js` → `centre.wheel`).

## Fotosuratlar — `assets/photos/`

Manba, muallif, litsenziya va tahrir tafsilotlari alohida faylda:
`assets/photos/CREDITS.md`.

---

Eskirgan: bu loyihada ilgari Poly Haven HDRI/PBR teksturalari va
Sketchfab modeli ishlatilar edi. Ularning hammasi 2026-09-12 qayta
qurishda olib tashlandi — ro'yxati git tarixida (`3b09ac1` dan oldin).
