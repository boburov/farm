# Sokin Savdo — topshiriq hujjati

**Holat:** 2010 va 2020–2021 sahifalari tayyor. QA 46/46 o'tadi.

Sahifalar orasida uch xil yo'l bilan yurish mumkin, uchalasi bir holatni
boshqaradi:

| Usul | Qanday |
|---|---|
| Klaviatura | `←` `→` · `Home` `End` |
| Sichqoncha | pastdagi nuqtalar |
| Manzil | `http://127.0.0.1:5173/#2020-2021` |

Hash tufayli sahifani to'g'ridan-to'g'ri ochish, yangilash va brauzerning
orqaga/oldinga tugmalari ishlaydi; havolani yuborsa ham o'sha sahifa ochiladi.
Hash — `assets/years.js` dagi `id` maydoni.

Loyiha 2026-09-12 da to'liq qayta qurildi. Oldingi variant — 6 bob / 13 sahnadan
iborat kinematik 3D prezentatsiya (`index.html` 7373 satr) — olib tashlandi.
Uni tiklash kerak bo'lsa: `git show 3b09ac1` va undan oldingi commitlar.

---

## Nima qurilgan

Yillar bo'yicha infografika slaydlari. Hozir ikkitasi:

| Sahifa | `layout` | Nima ko'rsatadi |
|---|---|---|
| `2010` | `single` | Bitta yil: tepada ikki statistika kartasi, suratda uch zona |
| `2020-2021` | `compare` | Ikki yil yonma-yon + o'sish ustuni |

Sahifa turi `assets/years.js` dagi `layout` maydoni bilan tanlanadi;
`assets/page.js` da har turga alohida render funksiyasi bor
(`renderSingle` / `renderCompare`). Fon, zanjir va animatsiya umumiy.

Bir ekran (scroll yo'q, mobilda ruxsat), to'liq offline, hech qanday CDN yoki
tashqi so'rov yo'q. Kompozitsiya buyurtmachi bergan referens rasmga mos:

```
┌──────────────────────────────────────────────────────────────┐
│ ┌──────────┐        ┌──────────┐          ┌────────────────┐ │
│ │ 3 ta     │        │ 2010-yil │          │ Yillik aylanma:│ │
│ │ ishchi   │        └──────────┘          │ 200 mln so'm   │ │
│ └──────────┘                              │ 6 marta aylanma│ │
│                                                              │
│        butun ekran foni: bitta keng surat                    │
│   ishlab chiqaruvchi  ↷  yuklash  ↷  bozor                   │
│                                                              │
│ ┌─ olish ─┐  →  ┌─ tashish ─┐  →  ┌─ bozorga sotish ─┐       │
│ ══════════════════════════════════════════════════════       │
└──────────────────────────────────────────────────────────────┘
```

Fon — buyurtmachi bergan bitta keng surat (`assets/photos/2010.jpg`), butun
ekranni `cover` bilan qoplaydi: chapda ishlab chiqaruvchi, o'rtada yuklash,
o'ngda bozor. Ikkita **jingalak strelka** zonalar chegarasiga qo'yiladi.

Chegara nuqtalari `assets/years.js` da `arrowsAt` sifatida **surat kengligining
ulushi** (0..1) bilan beriladi, piksel bilan emas. `assets/page.js: placeArrows`
har resize'da `cover` matematikasini qayta hisoblab, strelkani suratdagi aynan
o'sha nuqtaga qo'yadi — shuning uchun ekran nisbati o'zgarsa ham (4:3, 16:9,
ultrawide) strelka joyidan siljimaydi.

Surat yuklanmasa fon `assets/scenes.js` dagi uchta vektor sahnaga tushadi.
Talablar va almashtirish tartibi — `assets/photos/CREDITS.md`.

**Diqqat:** fon qatlami `z-index:0`, kontent `z-index:1`. Manfiy `z-index`
ishlatilmaydi — `body` foni uni bekitib qo'yadi. QA shuni tekshiradi
(`backdrop-fullscreen`, `bodyBg === 'none'`).

### Vizual uslub

Buyurtmachi referensiga moslangan: **to'ldirilgan** (kontur emas) yashil
piktogrammalar, yirik tipografika, shaffof oynasimon statistika kartalari,
strelkalar doira ichida emas — yaxlit egri shakl. `assets/icons.js` da ikki
oila bor: `FILL` (ishlatilayotgani) va `LINE` (zaxira). Pastdagi zanjir och
panel ustida, sahifa chetigacha cho'ziladi.

Suratning ustida uchta **zona yozuvi** (`zones` — `assets/years.js`) turadi:
oq kapsula, oltin hoshiya, to'q yashil matn. Oq kapsula ataylab tanlangan —
yozuvlar ham och bino ustiga, ham to'q tent ustiga tushadi, to'q fonli variant
bozor tentida yo'qolib ketardi.

Boshqa nozikliklar: yil belgisida gradient va oltin hoshiya; markazda brend
qatori (`brand`) va izoh (`subtitle`); statistika izohi oltin chiziq bilan
ajratilgan; fonda 34 soniyalik sekin yaqinlashuv (`@keyframes drift`) va
ikki qatlamli parda (tepa/past tinchlantiriladi, chetlar qoraytiriladi).
Barchasi `prefers-reduced-motion` bilan o'chadi.

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
| `assets/scenes.js` | fon uchun uchta vektor sahna (foto zaxirasi) |
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
  arrowsAt:[0.335, 0.645],   // zona chegaralari, surat kengligining ulushi
  panels:[ {scene:'producer'}, {scene:'transport'}, {scene:'bazaar'} ],
  chain: [ {icon,label}, … ]
}
```

Keyin: `scripts/qa.mjs` dagi `ALLOWED` ro'yxatiga yangi yilning raqamlarini
qo'shish (har birining manbasini izohda ko'rsatib). `←/→` o'qlari avtomatik
ishlaydi. Yangi panel sahnasi kerak bo'lsa — `assets/scenes.js` ga qo'shiladi.

### O'sish foizlari (`compare`)

`growth` maydoni — **o'ylab topilgan raqam emas**, ikki yilning o'z
raqamlaridan hisoblangan: `(yangi - eski) / eski x 100`. Buni QA majburlaydi:
`growth-matches-arithmetic` har bir foizni qaytadan hisoblab, ekrandagisi bilan
solishtiradi. Ya'ni foizni qo'lda "tuzatib" qo'yib bo'lmaydi — yo raqamlar,
yo foiz o'zgaradi.

Boshqa yillar uchun tayyor ma'lumot `docs/` ichida: 2022, 2023,
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
