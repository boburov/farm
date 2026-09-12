# Sokin Savdo — topshiriq hujjati

**Holat:** 2010-yil sahifasi tayyor. QA 24/24 o'tadi.

Loyiha 2026-09-12 da to'liq qayta qurildi. Oldingi variant — 6 bob / 13 sahnadan
iborat kinematik 3D prezentatsiya (`index.html` 7373 satr) — olib tashlandi.
Uni tiklash kerak bo'lsa: `git show 3b09ac1` va undan oldingi commitlar.

---

## Nima qurilgan

Yillar bo'yicha infografika sahifasi. Hozir bitta yil — **2010**.

Bir ekran (scroll yo'q, mobilda ruxsat), to'liq offline, hech qanday CDN yoki
tashqi so'rov yo'q. Kompozitsiya buyurtmachi bergan referens rasmga mos:

```
┌──────────────────────────────────────────────────────────────┐
│ ┌──────────┐        ┌──────────┐          ┌────────────────┐ │
│ │ 3 ta     │        │ 2010-yil │          │ Yillik aylanma:│ │
│ │ ishchi   │        └──────────┘          │ 200 mln so'm   │ │
│ └──────────┘                              │ 6 marta aylanma│ │
│                                           └────────────────┘ │
│ ┌────────────┐ →  ┌────────────┐  →  ┌────────────┐          │
│ │ ishlab     │    │  tashish   │     │   bozor    │          │
│ │ chiqaruvchi│    │            │     │            │          │
│ └────────────┘    └────────────┘     └────────────┘          │
│                                                              │
│ ┌─ olish ─┐  →  ┌─ tashish ─┐  →  ┌─ bozorga sotish ─┐       │
│ ══════════════════════════════════════════════════════       │
└──────────────────────────────────────────────────────────────┘
```

Panel bandi — 2010-yilgi qiymat zanjirining uchta bo'g'ini. Ustida
buyurtmachi bergan keng surat (`assets/photos/2010.jpg`) turadi: chapda ishlab
chiqaruvchi, o'rtada yuklash, o'ngda bozor — yashil strelkalar aynan zonalar
chegarasiga tushadi. Surat yuklanmasa sahifa `assets/scenes.js` dagi uchta
vektor sahnaga tushadi. Talablar va almashtirish tartibi —
`assets/photos/CREDITS.md`.

---

## ENG MUHIM QOIDA

`prompts/STEP_1.MD`: **ekranda ko'rinadigan har bir raqam buyurtmachi hujjatidan
olingan bo'lishi shart.** O'ylab topilgan, taxminiy, internetdan olingan raqam —
yo'q. Raqam bo'lmasa — raqam ko'rsatilmaydi.

Ekranda ko'rinadigan raqamlar: `2010`, `3`, `200`, `6` — boshqa hech nima.
2010-yil uchun hujjatda bor bo'lgan **hamma narsa** shu:

> **docs/Tovuqchilik_rivojlanish_tarixi.docx, 1–2-xatboshi:**
> "2010-yil 3 ta ishchi tovuq go'sht olib sotish bozor. Yillik aylanma 200 mln."
> "\* bir yilda 6 marta aylanma bo'ladi"

`docs/Yaratilgan_qiymat_Sokin_savdo.xlsx` → "Лист2" varag'ida **2010 ustuni bo'sh** —
o'sha yili ishlab chiqarish bo'lmagan. U yerdagi `20 000 so'm/kg` 2010-dan
2027-gacha barcha ustunlarda bir xil turadi: bu tarixiy narx emas, hisob
parametri — shuning uchun 2010 sahifasida **ko'rsatilmaydi**.

`scripts/qa.mjs` dagi `ALLOWED` ro'yxati shu qoidani majburlaydi. Ro'yxat
**qo'lda** yangilanadi: yangi raqam qo'shishdan oldin uni hujjatdan topib,
manbasini `assets/years.js` izohiga yozish kerak.

---

## Fayllar

| Fayl | Vazifasi |
|---|---|
| `index.html` | 15 satrlik skelet — `#page` va uchta skript |
| `assets/years.js` | **barcha matn va raqamlar shu yerda**, manba izohlari bilan |
| `assets/page.js` | YEARS dan DOM quradi, hisoblagich, staggered ochilish |
| `assets/page.css` | dizayn tokenlari, layout, statistika, panellar, mobil |
| `assets/icons.js` | inline SVG ikonkalar (tarmoq so'rovi yo'q) |
| `assets/scenes.js` | uch panel uchun vektor sahnalar (foto zaxirasi) |
| `assets/photos/` | `2010.jpg` (keng surat) + `CREDITS.md` (manba, talablar) |
| `assets/chicken-parts.js` | **parchalanish animatsiyasi moduli** — pastga qarang |
| `assets/poultry-runtime.js` | GLB adapter, faqat `chicken-parts.glb` uchun |
| `assets/models/chicken-parts.glb` | 7 bo'lakli tovuq, 4.4 MB, o'z ichiga yopiq |
| `scripts/prep-chicken-parts.mjs` | GLB tayyorlash quvuri (`npm run parts`) |
| `demo/chicken-parts.html` | modul test sahifasi (slider bilan) |
| `scripts/qa.mjs` | to'liq QA (`npm run qa`) |
| `scripts/smoke.mjs` | tez tekshiruv (`npm run smoke`) |
| `scripts/serve.mjs` | dev server (`npm run dev`, port 5173) |

---

## Yangi yil qo'shish

`assets/years.js` dagi massivga obyekt qo'shiladi — HTML/CSS/JS ga tegilmaydi.

```js
{
  id:'2020', year:'2020', title:'2020-yil',
  stats:[
    {side:'left',  icon:'workers', value:50, unit:'ta', label:'ishchi'},
    {side:'right', icon:'money',   value:7.5, unit:'mlrd so\'m',
     label:'Yillik aylanma:', note:'…'}
  ],
  photo:'assets/photos/2020.jpg', photoAlt:'…',
  panels:[ {scene:'producer'}, {scene:'transport'}, {scene:'bazaar'} ],
  chain: [ {icon,label}, … ]
}
```

Keyin: `scripts/qa.mjs` dagi `ALLOWED` ro'yxatiga yangi yilning raqamlarini
qo'shish (har birining manbasini izohda ko'rsatib). `←/→` o'qlari avtomatik
ishlaydi. Yangi panel sahnasi kerak bo'lsa — `assets/scenes.js` ga qo'shiladi.

Boshqa yillar uchun tayyor ma'lumot `docs/` ichida: 2020, 2021, 2022, 2023,
2025, 2026, 2026–2027 va istiqboldagi loyihalar.
**2024-yil ikkala hujjatda ham yo'q** — buyurtmachidan so'rash kerak.

---

## Parchalanish animatsiyasi — `assets/chicken-parts.js`

Eski loyihadan saqlab qolingan yagona narsa. 2010 sahifasida ishlatilmaydi
(hujjatga ko'ra parchalash **2025-yilda** boshlangan) — 2025 sahifasi uchun
tayyor turibdi.

```html
<script src="assets/vendor/three.min.js"></script>
<script src="assets/vendor/GLTFLoader.js"></script>
<script src="assets/poultry-runtime.js"></script>
<script src="assets/chicken-parts.js"></script>
```
```js
ChickenParts.load().then(function(){
  ChickenParts.mount(scene, {length:2.3, position:[0,.4,0]});
  ChickenParts.setSpread(0);   // 0 = butun tovuq, 1 = to'liq sochilgan
});
```

`setSpread(p)` — `p∈[0,1]`. `torso` markazda qoladi, qolgan 6 bo'lak
(`neck, wingR, legR, tail, legL, wingL`) halqadagi 6 ta asosga navbatma-navbat
yoy chizib uchadi va qo'nadi. Asoslar ham `p` bilan birga ko'tariladi.

Model yo'li skriptning **o'z manzilidan** hisoblanadi (`A.modelPath`), shuning
uchun modul ildizdagi sahifadan ham, `demo/` ichidan ham ishlaydi.

Tekshirish: `npm run dev`, keyin `http://127.0.0.1:5173/demo/chicken-parts.html`.

### GLB shartnomasi

`scripts/prep-chicken-parts.mjs` `~/Desktop/chicken.glb` (92 MB, 2.74 mln
uchburchak, Tripo mesh) dan tayyorlaydi → 174 365 uchburchak, 4.18 MB.

Ildiz tugun `chicken-parts`, yetti bola: `torso · wingL · wingR · legL · legR ·
neck · tail`. Uzunlik 1.0, pastki nuqta y=0, har tugunda `extras {center,min,max}`.

Manba faylda ko'rinishidan 5 ta tugun bor, lekin `Chicken_Work` ichida uchta
bog'lanmagan geometriya oroli yashiringan (tana + ikki qanot) — quvur ularni
`splitIslands()` bilan ajratadi, shuning uchun yakuniy son **7**.

**Tuzoq:** `primFromTriangles()` atribut qiymatlarini **xom massivdan** ko'chiradi,
`getElement()` orqali emas. `getElement()` `Uint8Array` dagi normalizatsiyalangan
1.0 ni 1 ga aylantirib yuboradi va model qop-qora chiqadi.

**Tuzoq:** three r128 nur va bbox hisobini xom atribut qiymatlari ustida bajaradi,
shuning uchun `defloat()` quantize qilingan Int16 pozitsiyalarni Float32 ga
o'tkazadi (`poultry-runtime.js`).

---

## Ishga tushirish

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run qa         # to'liq tekshiruv + skrinshotlar (qa/current/)
npm run smoke      # tez tekshiruv
npm run parts      # GLB ni qayta tayyorlash (manba fayl kerak)
```

QA ishlashi uchun dev server **oldindan** ishga tushgan bo'lishi kerak.
Boshqa manzil: `QA_URL=http://127.0.0.1:5173 npm run qa`.
