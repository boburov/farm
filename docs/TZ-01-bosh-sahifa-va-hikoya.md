# TZ-01 — "Sokin Savdo": Prezident tashrifi taqdimoti

**Loyiha:** birinchi loyiha — bosh sahifa (hero) va 2010-yildan bugungacha hikoya
**Kod bazasi:** `index.html` (Three.js r128 klik-taqdimoti, hozirgi nomi "Bir tovuqdan")
**Sana:** 2026-09-11
**Holat:** tasdiqlashga tayyor. Kod o'zgarishi bu hujjat tasdiqlangandan keyin boshlanadi.

Belgilar: `[TASDIQLANSIN]` — buyurtmachi bergan fakt kerak; `[FAYL]` — buyurtmachi beradigan foto/video.

---

## 1. Maqsad va kontekst

- **Voqea:** Prezidentning parrandachilik klasteriga tashrifi. Taqdimot nutq bilan parallel ko'rsatiladi.
- **Auditoriya:** Prezident va delegatsiya. Ekranni operator boshqaradi, mehmon ekranga tegmaydi.
- **Qurilma:** katta ekran yoki proyektor, 16:9 (asosiy 1920×1080, tekshiruv 1440×900 va 3840×2160). Boshqaruv: sichqoncha klik, klaviatura, taqdimot pulti (clicker).
- **Tarmoq:** internet bo'lmasligi mumkin. Sahifa to'liq oflayn ishlashi shart (hamma asset lokal; hozir ham shunday, CDN yo'q).
- **Davomiylik:** 5–7 daqiqa, 6 bo'lim, har klik bitta fikr. Avtomatik o'tish yo'q.
- **Muvaffaqiyat mezoni:** operator nutq ritmiga mos ravishda har bo'limni bir klikda ochadi; ekranda faqat nutqdagi real faktlar; hech qanday to'qima raqam, sanoq yoki kutish ekrani yo'q.
- **Til:** faqat o'zbek lotin.

## 2. Brend

- Nom: **Sokin Savdo**. "Bir tovuqdan" nomi hamma joydan olib tashlanadi:
  - `index.html:7` `<meta name="description">`, `index.html:8` `<title>`
  - `index.html:26` `#mark` (yuqori panel so'z-belgisi)
  - `index.html:78` `.loader-brand` (loader bilan birga ketadi)
  - `index.html:7082` `BEATS[15].t` "Bir tovuqdan" (sahna nomi, agar sahna ishlatilsa "Sokin Savdo bugun" ga o'zgaradi)
- So'z-belgi: logotip fayli yo'q, matnli. `Archivo 800`, `--display`, 27 px, harflar orasi −0,04em (mavjud `#mark b` uslubi, `assets/presentation.css:40`). Nuqta aksenti `--forest-light` rangida saqlanadi: **Sokin Savdo.**
- Rang tizimi o'zgarmaydi (`assets/presentation.css:2–6`): fon `#f4f2ec`, matn `#101512`, aksent `#174c32` (forest), oltin `#b58a45`, muted `#68716b`.
- Shrift: Archivo (lokal, `assets/fonts/`).

## 3. Olib tashlanadiganlar

| Element | Manzil | Amal |
|---|---|---|
| Loader ekrani `#loader` (brend, sarlavha, progress, "Taqdimotni boshlash", credit) | `index.html:77–86`; CSS `assets/presentation.css:131–132` | DOM va CSS o'chiriladi. Yuklanish indikatori hero ichiga ko'chadi (4-bo'lim) |
| 3-2-1 sanoq `#opening-countdown` | `index.html:87`; CSS `:133`; `P.start`/`openingTick` `assets/presentation.js:221–243`; `state.opening` tekshiruvlari `:146,152,186,268,291,322–328,410` | `P.start` soddalashadi: sanoqsiz, darhol `started=true` va 0-bo'lim (hero) ko'rsatiladi. `state.opening` doim `null` |
| Avtoplay taymeri `#auto-countdown` ("Keyingi bo'lim: mm:ss") | `index.html:44`; CSS `:93,155`; `assets/presentation.js:124–125` | DOM o'chiriladi. `P.setPlaying` kodi qoladi, lekin UI'da play tugmasi yo'q (7-bo'lim) |
| Hozirgi 1-bo'lim "O'z tizimimizga" | `index.html:7111` `CH[0]` (beat 3) | `CH` to'liq qayta yoziladi (5-bo'lim) |
| Shartli iqtisod: `FIG_SCHEMA` | `index.html:5934–5960` | O'chiriladi, unga bog'liq `num()` chaqiruvlari bilan birga |
| `ECON` obyekti (tannarx, foyda, ish o'rni sanoq animatsiyasi) | `index.html:7174–~7260` (`ECON.read/go/tick/render`), `openingTick` ichidagi `ECON.init/go` | O'chiriladi. `FLOCK.setStage(st)` chaqiruvi bo'lim `enter` hookiga ko'chadi (podaning kattaligi 01 → 03 bo'limda o'sishi saqlanadi) |
| "Raqamlar" muharriri `#editor`, `#edit-open`, `#edit-close`, `#edit-save`, `#edit-reset`, `buildEditor` | `index.html:38, 64–75`; `assets/presentation.js:271` | O'chiriladi. localStorage yozuvi yo'q |
| "Batafsil" dialogi `#details`, `#details-open`, `#details-close`, `#details-edit`, `P.renderDetails`, `visualsHTML` | `index.html:39, 49–53`; `assets/presentation.js:88, 250–286, 375` | O'chiriladi |
| `#panel-shade`, `P.openPanel/closePanel`, `state.panel` | `index.html:48`; `assets/presentation.js:12, 269–285, 377, 385` | Foto overlay uchun qayta ishlatiladi (6-bo'lim): `state.panel==='photo'` |
| Rail'dagi ✓ "ko'rilgan" belgisi va `state.completed` | `assets/presentation.js` | Qoladi (operatorga qayerda turganini ko'rsatadi) |
| Sketchfab tovuq krediti `#credit` | `index.html:88` | Hero'da ko'rinmaydi; faqat studiya tovuq sahnasi ishlatilgan bo'limda (03 → Aviagen sahnasi) ko'rinadi. Litsenziya CC BY 4.0 talab qiladi |
| "Klasterni kezish" `#explore-btn` | `index.html:37` | Faqat 03-bo'limda ko'rinadi, boshqa bo'limlarda `hidden` |

Barcha `CH.length` ga bog'liq hisoblar (`assets/presentation.js:106,113,122,125,139,148,151,172,185`) avtomatik 6 ga moslashadi. `#progress` `aria-valuemax` (`index.html:43`) 6 bo'ladi. Loader'dagi "4 bo'lim" matni ketadi.

## 4. Hero — 00-bo'lim

Referens: MDX studiya sahifasi (oq-kulrang fon, to'rt burchakka tarqalgan kompozitsiya, markaz bo'sh havo).

### 4.1. Fon
- 3D yo'q. `#gl` kanvasi hero'da `opacity:0` (sahna orqada tayyor turadi, 01-bo'limga o'tishda veil ostida ochiladi).
- CSS fon: `--background` + markazdan biroz yuqoriga siljigan radial yorug' dog' (`radial-gradient(ellipse 60% 50% at 50% 42%, #ffffff 0%, rgba(255,255,255,0) 70%)`) + pastda yupqa iliq soya (`rgba(181,138,69,.06)`, oltin ohang). Hech qanday tasvir yoki model.
- Film donasi / vignette o'chiq.

### 4.2. Tuzilma (1920×1080, gutter 44 px)

```
┌──────────────────────────────────────────────────────────────────┐
│ Sokin Savdo.  |  ○                          Hikoyani boshlash ↗ | 00 / 05 │
│                                                                  │
│                                                                  │
│                        (bo'sh, yorug' dog')                       │
│                                                                  │
│ Kichik go'sht do'konidan                       Biz 2010-yilda 3 nafar    │
│ parranda klasterigacha.                        xodim bilan boshlagan edik. │
│                                                Bugun 1,5 million boshli   │
│ 2010 · 3 xodim  →  2026 · 1,5 mln bosh         vertikal integratsiyalashgan│
│                                                klaster.                    │
│ [ HIKOYANI BOSHLASH → ]                        (1,5 mln bosh)(Ona tovuq — │
│                                                 Aviagen)(Chiqindisiz)      │
└──────────────────────────────────────────────────────────────────┘
```

| Zona | Tarkib | Uslub |
|---|---|---|
| Chap yuqori | `Sokin Savdo.` so'z-belgisi; vertikal ajratgich; dumaloq ○ tugma (to'liq ekran, F bilan bir xil) | `#mark` uslubi; ○ 52 px, `--line` chegara |
| O'ng yuqori | `Hikoyani boshlash ↗` matn havolasi (01-bo'limga o'tadi); ajratgich; `00 / 05` sanoq | 13 px, ostki chiziq, `--forest` |
| Chap past | H1 ikki qator: "Kichik go'sht do'konidan / parranda klasterigacha."; kichik satr: `2010 · 3 xodim → 2026 · 1,5 mln bosh`; pill CTA `HIKOYANI BOSHLASH →` | H1 `clamp(56px, 5.4vw, 92px)`, Archivo 700, −0,04em; satr 15 px muted, tabular raqamlar; CTA mavjud `.pill` (qora fon `--ink`, oq matn, 54 px) |
| O'ng past | Lead (2 gap): "Biz 2010-yilda 3 nafar xodim va kichik go'sht savdosidan boshlagan edik. Bugun — 1,5 million boshli, to'liq vertikal integratsiyalashgan parranda klasteri."; 3 chip: `1,5 mln bosh` · `Ona tovuq — Aviagen` · `Chiqindisiz texnologiya` | Lead 20 px, birinchi gap `--ink`, ikkinchi gap muted (referensdagi ikki ohang); chiplar mavjud `#rail` chip uslubi, `--line` chegara |
| Past o'rta | Yo'q (beat-nav hero'da yashirin) | — |
| Eng past | 2 px progress chizig'i (mavjud `#progress`), hero'da 1/6 | — |

### 4.3. Yuklanish holati
- Sahifa ochilishi bilan hero DOM darhol ko'rinadi (3D yuklanishini kutmaydi).
- 3D yuklanayotganda CTA `disabled`, ostida 2 px yupqa chiziq (`#load-fill` mantiqi qayta ishlatiladi) va 11 px matn: "Sahnalar tayyorlanmoqda". Tayyor bo'lgach chiziq yo'qoladi, CTA faollashadi, `Hikoyani boshlash ↗` havolasi ham.
- Yuklanish matnlari o'zbekcha, hozirgi `load-state` bosqichlari saqlanadi ("Dunyo quriladi", "Shaderlar tayyorlanmoqda", "Grafik xotira isitilmoqda").

### 4.4. Hero → 01 o'tish
- Klik/→/PageDown/CTA: mavjud `P.goTo(1)` veil o'tishi (`assets/presentation.js` `transitionTick`): hero matni 0–0,32 s so'nadi, `#gl` opacity 0 → 1 veil ostida, 01-bo'lim dawn ferma sahnasi ochiladi. Umumiy 1,45 s.
- Orqaga (←/PageUp) hero'ga qaytish mumkin, 3D yana yashirinadi.

## 5. Hikoya arki — bo'limlar

Umumiy qoidalar:
- 6 bo'lim, `CH` massivi (`index.html:7110`) to'liq qayta yoziladi. Har bo'lim: `{t, beats, times, photo?}`.
- Har bo'lim ichidagi sahnalar (beats) hozirgidek `beat-nav` nuqtalari bilan o'tiladi; bo'limlar orasida veil.
- Avtoplay yo'q: `times` faqat sahna animatsiyasining davomiyligi (sahna oxirgi holatida to'xtab turadi).
- Matn joylashuvi hozirgi full-bleed: chap past = eyebrow + sarlavha + 1 gap + CTA `Keyingi bo'lim`/`Oldingi`; o'ng past = xulosa (qalin) + lead + 2×2 raqam kartasi + bo'lim chiplari (`#rail`).
- Raqam kartasida faqat nutqdagi faktlar. Manba bo'lmasa katak bo'sh qoldirilmaydi, satr olib tashlanadi.

### 01 — "2010. Boshlanish"
| | |
|---|---|
| Sahnalar | beat 0 "Boshlanish" (dawn, ferma uzoqdan, `index.html:6658`) → beat 1 "Qayerdan boshladik" (morning, fermer yem soladi, `:6666`) |
| Eyebrow | `01 / 2010 — BOSHLANISH` |
| Sarlavha | "Uch kishi va bitta go'sht do'koni." |
| Gap | "2010-yilda bor-yo'g'i 3 nafar xodim bilan kichik go'sht savdosidan faoliyat boshlagan edik." |
| Xulosa (o'ng) | **"U paytlarda bunchalik katta marralarni tasavvur ham qilolmasdik."** |
| Raqamlar | `3` xodim · `2010` yil · `Go'sht savdosi` faoliyat turi · Parranda soni `[TASDIQLANSIN]` |
| Foto | `2010-arxiv` `[FAYL]` — "Fotoni ko'rish" tugmasi faqat fayl bo'lsa |
| 3D | `FLOCK.setStage(0)` — eng kichik poda |

### 02 — "O'sish. 25 ming bosh"
| | |
|---|---|
| Sahnalar | beat 3 "Birinchi qadam" (day, ferma + birinchi so'yish sexi, `:6733`) → beat 2 "Bozor" (lorry bozorga boradi, `:6688`) |
| Eyebrow | `02 / O'SISH` |
| Sarlavha | "Kechagi kun: 25 ming bosh parranda." |
| Gap | "Islohotlar tadbirkorlar poyini bog'lab turgan kishanlarni parchalab tashladi — biz yangi bosqichga chiqdik." |
| Xulosa | **"Biznesni boshlash bosqichidan kapitalni ko'paytirish bosqichiga o'tdik."** |
| Raqamlar | `25 000` bosh parranda · Yil `[TASDIQLANSIN]` · Xodimlar `[TASDIQLANSIN]` |
| Foto | Yo'q |
| 3D | `FLOCK.setStage(1)` |

### 03 — "Klaster 2026. 1,5 million bosh"
Bu bo'lim "hozirgi jarayon"ni ko'rsatadi: avval butun zanjir, keyin to'rt texnologiya. 5 sahna, har biri bir klik.

| # | Sahna | Mavjud beat | Eyebrow / Sarlavha | Gap | Raqamlar / chip | Foto |
|---|---|---|---|---|---|---|
| 3.1 | Zanjir | beat 7 "Yagona zanjir" (`:6842`), bo'g'inlar ketma-ket yonadi. Bo'g'in nomlari: **Ona tovuq → Nasldor tuxum → Jo'ja → Boqish → So'yish → Qayta ishlash → Kolbasa → Rendering** (8 bo'g'in, mavjud 8 ta tube) | `03 / KLASTER 2026` — "Vertikal integratsiya: hammasi o'zimizda." | "Kechagi kunda 25 ming bosh bilan ishlagan bo'lsak, 2026-yilda quvvatimizni 1,5 million boshga yetkazdik." | `1 500 000` bosh (25 000 dan, ×60) · `2026` · `8` bo'g'in bitta zanjirda | — |
| 3.2 | Ona tovuq | beat 8 "Bir tovuq, ko'p mahsulot" studiya (`:6863`), tovuq modeli (`#credit` shu sahnada ko'rinadi) | `03 / ONA TOVUQ` — "Eng katta yutug'imiz — Parent stock." | "Vengriyaning 'Aviagen' kompaniyasi bilan hamkorlikda ona tovuq loyihasini tikladik. Nasldor tuxum va jo'jani o'zimizda ochiryapmiz." | Chiplar: `Aviagen · Vengriya` · `Importga qaramlik tugadi` · `Valyuta ichkarida qoladi`. Raqam: nasldor tuxum/yil `[TASDIQLANSIN]` | `aviagen` `[FAYL]` |
| 3.3 | So'yish + kolbasa | beat 10 "Ish o'rinlari" interior sex (`:6918`) | `03 / QAYTA ISHLASH` — "Dunyoda tengi yo'q uskunalar." | "Gollandiyaning 'Marel' uskunalari bilan jihozlangan so'yish majmuasi va zamonaviy kolbasa sexini ishga tushirdik." | Chiplar: `Marel · Gollandiya` · `So'yish majmuasi` · `Kolbasa sexi`. Quvvat bosh/soat `[TASDIQLANSIN]` | `marel` `[FAYL]` |
| 3.4 | Rendering | beat 10 interior boshqa kamera burchagi (STILL yozuvi) yoki beat 9 "Qiymat qo'shiladi" (`:6893`) | `03 / CHIQINDISIZ` — "Birorta chiqindi tashqariga chiqmaydi." | "Ekologiyani asrash va tejamkorlik uchun 'chiqindisiz texnologiya' asosida Rendering liniyasini o'rnatdik. Hammasidan qo'shimcha qiymat olamiz." | Chiplar: `Rendering liniyasi` · `0 chiqindi` · `Qo'shilgan qiymat`. Mahsulot (un/yog') `[TASDIQLANSIN]` | `rendering` `[FAYL]` |
| 3.5 | Aqlli katak | Mavjud sahna yo'q. Variant A (tavsiya): beat 6 "Klaster g'oyasi" aerial (`:6821`) + o'ng kartada katak sxemasi (SVG, qavatlar). Variant B: yangi interior sahna — ko'p qavatli katak qatorlari (keyingi loyiha) | `03 / AQLLI KATAK` — "Joy tejamkor, samaradorlik yuqori." | "Eng so'nggi aqlli ko'p qavatli katak tizimlarini yo'lga qo'ydik." | Chiplar: `Ko'p qavatli` · `Aqlli boshqaruv`. Qavatlar soni, bosh/m² `[TASDIQLANSIN]` | `katak` `[FAYL]` |

3D: `FLOCK.setStage(3)` — eng katta poda. `#explore-btn` "Klasterni kezish" faqat shu bo'limda ko'rinadi.

### 04 — "Hozirgi bosqich"
| | |
|---|---|
| Sahna | beat 13 "Kelajakni quramiz" (`:7042`): kranlar, `exp1–exp3` korpuslar qurilish animatsiyasi (`setBuild`), so'ng oxirgi holatda to'xtaydi |
| Eyebrow | `04 / HOZIRGI BOSQICH` |
| Sarlavha | "Qurilish davom etmoqda." |
| Gap | "Klasterning keyingi bosqichi." `[TASDIQLANSIN: nima qurilyapti]` |
| O'ng zona | Raqam kartasi o'rniga **yo'l xaritasi** (roadmap): gorizontal chiziq, 9 nuqta, har birida yil/nom va holat belgisi |

Yo'l xaritasi nuqtalari:

| # | Nuqta | Yil | Holat |
|---|---|---|---|
| 1 | Go'sht savdosi, 3 xodim | 2010 | ● Bajarildi |
| 2 | 25 ming bosh parranda | `[TASDIQLANSIN]` | ● Bajarildi |
| 3 | Birinchi so'yish sexi | `[TASDIQLANSIN]` | ● Bajarildi |
| 4 | Aviagen ona tovuq (Parent stock) | `[TASDIQLANSIN]` | ● Ishga tushgan |
| 5 | Marel so'yish majmuasi + kolbasa sexi | `[TASDIQLANSIN]` | ● Ishga tushgan |
| 6 | Rendering liniyasi | `[TASDIQLANSIN]` | ● Ishga tushgan |
| 7 | Aqlli ko'p qavatli katak | `[TASDIQLANSIN]` | ● Ishga tushgan |
| 8 | 1,5 mln bosh quvvat | 2026 | ◉ **Hozir** (ajratilgan, `--gold`) |
| 9 | `[TASDIQLANSIN: qurilayotgan obyekt]` | `[TASDIQLANSIN]` | ◐ Qurilmoqda |
| 10 | `[TASDIQLANSIN: rejadagi obyekt]` | `[TASDIQLANSIN]` | ○ Rejada |

Uslub: bajarilgan nuqtalar `--forest`, "Hozir" `--gold` va kattaroq, qurilmoqda yarim to'ldirilgan, rejada bo'sh doira `--line`. Sahna kirganda nuqtalar chapdan o'ngga 0,08 s oraliq bilan paydo bo'ladi (reduced-motion: darhol). Xarita eni o'ng zona (`--data`, ~440 px) uchun tor; shuning uchun 04-bo'limda `#data-layer` kengligi `min(760px, 52vw)` ga o'zgaradi va 2 qatorli zigzag joylashuv ishlatiladi (5 + 5 nuqta).

### 05 — "Yakun. Kelajak"
| | |
|---|---|
| Sahna | beat 14 "Bugungi klaster" (golden, chiroqlar yonadi, `:7066`) → beat 15 orbit (`:7082`, nomi "Sokin Savdo bugun" ga o'zgaradi) |
| Eyebrow | `05 / KELAJAK` |
| Sarlavha | "Sokin Savdo. Keyingi marra." |
| Gap | "Bugungi klaster — kelajakdagi o'sishning poydevori." |
| O'ng zona | 4 reja kartasi (2×2) + Muddat satri, hammasi `[TASDIQLANSIN]`: **Quvvat** (bosh/yil) · **Ish o'rinlari** (yangi) · **Eksport** (mamlakatlar yoki hajm) · **Investitsiya** (mlrd so'm / mln $); pastda `Muddat: [TASDIQLANSIN]` |
| CTA | `Keyingi bo'lim` o'rniga `Boshiga qaytish` (hero'ga, 3-2-1 siz) |
| Brend | O'ng pastda kartalar ostida `Sokin Savdo.` so'z-belgisi katta (40 px) |

Reja kartalari raqamlari tasdiqlanmagan holda ekranga chiqmaydi: kod `--` ko'rsatadi va kartani xira qiladi. Tashrifgacha raqamlar berilmasa, 05-bo'lim faqat sarlavha + brend bilan qoladi.

## 6. Foto sahnasi (to'liq ekran overlay)

- Fayllar: `assets/photos/<key>.jpg` (yoki `.webp`), uzun tomon ≤ 1920 px, ≤ 600 KB. Kalitlar: `2010-arxiv`, `aviagen`, `marel`, `rendering`, `katak`. Video kerak bo'lsa `.mp4` (H.264, ovozsiz, ≤ 20 s, loop) — shu kalit bilan, foto o'rniga.
- Manifest `assets/photos/manifest.json`:
  ```json
  [
    {"key":"2010-arxiv","file":"2010-arxiv.jpg","caption":"2010-yil. Birinchi do'kon.","credit":""},
    {"key":"aviagen","file":"aviagen.jpg","caption":"Ona tovuq korpusi — Aviagen bilan hamkorlikda"}
  ]
  ```
  Manifestda bo'lmagan yoki fayli yuklanmagan kalit → tugma ko'rinmaydi.
- Tugma: chap pastdagi `.slide-actions` qatorida, `Oldingi`dan keyin: `Fotoni ko'rish ↗` (matnli, `.text-button`). Faqat sahna `photo` kalitiga ega va fayl mavjud bo'lsa.
- Ochilish: `P.openPanel('photo')` — `#panel-shade` qora 0,92, ustida rasm `object-fit: cover`, butun ekran, fade 0,4 s (`--ease-out`). Pastda chapda caption (16 px, oq), o'ngda `Yopish ×`. 3D render to'xtaydi (`invalidateScene` chaqirilmaydi, mavjud "render on demand" mantiqi).
- Yopish: Esc, rasmga klik, `Yopish`, → (yopadi va keyingi sahnaga o'tmaydi; ikkinchi → o'tadi), PageDown xuddi → kabi.
- Fokus: ochilganda `Yopish`ga, yopilganda `Fotoni ko'rish`ga qaytadi (mavjud `panelFocus` mantiqi).
- Prefetch: bo'limga kirganda shu bo'lim fotolari `<link rel="prefetch">` bilan oldindan yuklanadi.

## 7. Boshqaruv

| Kirish | Amal | Holat |
|---|---|---|
| Klik `Keyingi bo'lim` / kanvasga klik | keyingi sahna, bo'lim oxirida keyingi bo'lim | mavjud |
| → / ← | keyingi / oldingi (`assets/presentation.js:390`) | mavjud |
| **PageDown / PageUp** | → / ← bilan bir xil (clicker) | **yangi** |
| Home / End | hero / 05-bo'lim | mavjud |
| **F** | to'liq ekran (`document.documentElement.requestFullscreen()`), yana F chiqadi | **yangi**; hero'dagi ○ tugma ham shu |
| Esc | foto yopish → Explore yopish → hech narsa | mavjud, tartib saqlanadi |
| Space | hozir avtoplay; **yangi:** → bilan bir xil | o'zgaradi |
| Bo'lim chiplari `#rail` | to'g'ridan-to'g'ri bo'limga | mavjud |
| Beat nuqtalari | bo'lim ichidagi sahnaga | mavjud |

Play/pause tugmasi (`#play`) va avtoplay UI olib tashlanadi. `P.setPlaying` kodi qoladi (kelajakda ko'rgazma rejimi uchun), lekin hech qayerdan chaqirilmaydi.

## 8. Matnlar — to'liq ro'yxat

### 8.1. Nutqdan olingan faktlar va qayerda ishlatiladi
| Fakt | Bo'lim |
|---|---|
| 2010-yil, 3 nafar xodim, kichik go'sht savdosi | Hero, 01, 04 (nuqta 1) |
| "Bunchalik katta marralarni, zamonaviy texnologiyalarni tasavvur ham qilolmasdik" | 01 xulosa |
| Islohotlar, "kishanlarni parchalab tashlagani" | 02 gap |
| "Biznesni boshlash" → "kapitalni ko'paytirish" va yirik sanoat bosqichi | 02 xulosa |
| Vertikal integratsiya va klaster tizimi to'liq joriy etilgan | 03.1 |
| Kechagi kun 25 ming bosh → 2026-yilda 1,5 million bosh | Hero, 02, 03.1, 04 |
| Aviagen (Vengriya), ona tovuq / Parent stock, importga qaramlik va valyuta chiqib ketishiga chek, nasldor tuxum va jo'ja o'zimizda | 03.2 |
| "Xomashyoni chuqur qayta ishlab, qo'shilgan qiymat yaratish" | 03.3 eyebrow ostidagi kichik iqtibos |
| Marel (Gollandiya) so'yish majmuasi + zamonaviy kolbasa sexi | 03.3 |
| Chiqindisiz texnologiya, Rendering liniyasi, "birorta chiqindi tashqariga chiqmayapti" | 03.4 |
| Aqlli ko'p qavatli katak tizimlari, joy tejash, samaradorlik | 03.5 |

Nutqdagi Prezidentga murojaat va iqtiboslar ("Tadbirkor — mening eng yaqin ko'makchim...") ekranga chiqarilmaydi (Q12 qarori: yakun reja raqamlari). Kerak bo'lsa keyin 05-bo'limga qo'shish mumkin.

### 8.2. Placeholder ro'yxati — buyurtmachidan kutiladi
| # | Nima kerak | Qayerda |
|---|---|---|
| P1 | Korxonaning rasmiy yozilishi ("Sokin Savdo" MChJ? Klaster nomi?) | `<title>`, so'z-belgi |
| P2 | 25 ming boshga chiqilgan yil | 02, 04 |
| P3 | Birinchi so'yish sexi yili | 04 |
| P4 | Aviagen loyihasi yili, nasldor tuxum/jo'ja yillik hajmi | 03.2, 04 |
| P5 | Marel majmuasi yili, quvvat (bosh/soat), kolbasa sexi quvvati | 03.3, 04 |
| P6 | Rendering yili, mahsulot turi/hajmi | 03.4, 04 |
| P7 | Katak tizimi yili, qavatlar soni, sig'im | 03.5, 04 |
| P8 | Hozir qurilayotgan obyekt(lar): nom, muddat, bajarilish | 04 (nuqta 9), sarlavha gapi |
| P9 | Rejadagi obyekt(lar) | 04 (nuqta 10) |
| P10 | Kelajak reja: quvvat, ish o'rinlari, eksport, investitsiya, muddat | 05 |
| P11 | Hozirgi xodimlar soni (ixtiyoriy, 03.1 kartasiga) | 03.1 |
| P12 | Fotolar: `2010-arxiv`, `aviagen`, `marel`, `rendering`, `katak` (JPG ≤1920 px) | 6-bo'lim |
| P13 | Logotip (bo'lsa, SVG) — bo'lmasa matnli | 2-bo'lim |

## 9. Texnik cheklovlar

- Oflayn: yangi CDN yoki tashqi so'rov qo'shilmaydi. Foto va manifest lokal.
- Ekranlar: asosiy 1920×1080; QA 1440×900, 1920×1080, 3840×2160 (DPR 1), 844×390 (landshaft telefon — ikkinchi darajali, buzilmasligi kifoya).
- Mavjud `#scene-frame` kompozitsiya to'rtburchagi va `camera.lookAt` `setViewOffset` mantiqi (`assets/cinematic.js`) o'zgarmaydi; 04-bo'limda o'ng zona kengayganda `--data` faqat shu bo'lim uchun `body[data-chapter="4"]` selektori orqali.
- Hero'da 3D render to'xtaydi (`invalidateScene` chaqirilmaydi), GPU bo'sh.
- Reduced motion: hero o'zgarmaydi, veil o'tishlari darhol, yo'l xaritasi nuqtalari darhol, foto fade yo'q.
- Ishlash: hozirgi ko'rsatkichlar saqlanadi (HANDOFF.md jadvallari); yangi sahna qo'shilmaydi (3.5 Variant A).
- Kod joylashuvi: `CH`/`BEATS` matnlari `index.html` ichida qoladi (hozirgi tuzilma); foto overlay va pult tugmalari `assets/presentation.js` ga; hero CSS `assets/presentation.css` ga. Yangi fayl: `assets/photos/manifest.json`.

## 10. Amalga oshirish bosqichlari (keyingi topshiriq)

1. **Olib tashlash** — 3-bo'lim jadvali bo'yicha; `git mv` bilan hech narsa arxivlanmaydi, tarix gitda. Tekshiruv: `grep -c "Bir tovuqdan\|FIG_SCHEMA\|opening-countdown\|auto-countdown" index.html assets/*.js` → 0.
2. **Hero** — DOM (`#overlay` ichida `#hero` bo'limi), CSS, yuklanish holati, `P.start` soddalashtirish, `CH[0]` hero yozuvi (`{t:"Sokin Savdo", hero:true, beats:[]}`; `commit()` hero uchun 3D'ni yashiradi).
3. **Bo'limlar** — `CH` 6 yozuv, `BEATS` 0/1/3/2/7/8/10/9/6/13/14/15 matnlari (`dom()` funksiyalari) va `content()` xulosa/raqamlar; zanjir bo'g'in nomlari (beat 7); `FLOCK.setStage` bo'lim `enter`ida; `#explore-btn` faqat 03; `#credit` faqat 03.2.
4. **Foto overlay** — manifest yuklash, tugma, `openPanel('photo')`, klaviatura, prefetch.
5. **Yo'l xaritasi va reja kartalari** — 04 uchun `roadmapHTML()`, 05 uchun `planCardsHTML()`; placeholder holati (`--`, xira).
6. **Boshqaruv** — PageUp/PageDown, F, Space → next, ○ tugma.
7. **QA** — `scripts/qa-click.mjs`: countdown/autoplay/editor/details testlari o'chiriladi; qo'shiladi: `hero-visible-before-3d-ready`, `hero-no-canvas`, `hero-to-ch1-veil`, `six-chapters`, `pagedown-advances`, `f-fullscreen-request`, `photo-button-only-with-file`, `photo-open-close-esc`, `roadmap-10-points`, `plan-cards-placeholder`, `no-fake-numbers` (DOM'da "27 500", "so'm/kg" yo'q). `scripts/qa.mjs` quick: 6 bo'lim × 1920×1080 skrinshot, 0 xato, 0 yetishmayotgan fayl.
8. **Hujjat** — HANDOFF.md ga yangi bo'lim; bu TZ'dagi placeholder jadvali to'ldirilgan holda yangilanadi.

Taxminiy hajm: 1–2 ish kuni (3.5 Variant A bilan). Variant B (yangi katak interior sahnasi) +1 kun.

## 11. Qabul mezonlari

- [ ] Sahifa ochilganda 2 s ichida hero matni ko'rinadi (3D yuklanishidan mustaqil); loader ekrani va 3-2-1 sanoq yo'q.
- [ ] Hero rasmdagi referensga mos: chap yuqori so'z-belgi, o'ng yuqori havola + `00 / 05`, chap past sarlavha + qora pill, o'ng past lead + 3 chip, markaz bo'sh yorug' fon.
- [ ] DOM va ekranda "Bir tovuqdan" matni yo'q; brend "Sokin Savdo".
- [ ] To'qima raqamlar yo'q: tannarx, foyda, "so'm/kg", "Raqamlar", "Batafsil" hech qayerda chiqmaydi.
- [ ] 6 bo'lim: hero → 2010 → 25 ming → Klaster 2026 (5 sahna) → Hozirgi bosqich → Kelajak; `#rail`da 6 chip, progress 6 qadam.
- [ ] Clicker (PageDown/PageUp), →/←, Space, klik bilan to'liq o'tish; F to'liq ekran.
- [ ] "Fotoni ko'rish" faqat manifestda fayli bor sahnalarda; Esc yopadi; foto yo'q holatda hech qanday xato yo'q.
- [ ] 04-bo'limda 10 nuqtali yo'l xaritasi, "Hozir" nuqtasi ajratilgan; placeholder nuqtalar `[TASDIQLANSIN]` matni bilan emas, xira "—" bilan ko'rinadi.
- [ ] 05-bo'limda 4 karta + Muddat; raqamlar berilmagan holatda kartalar xira, "—".
- [ ] Oflayn: DevTools "Offline" rejimida sahifa to'liq ishlaydi, tarmoq so'rovlari faqat lokal.
- [ ] `npm run qa:quick` va `node scripts/qa-click.mjs` — 0 xato, 0 yetishmayotgan fayl, 1920×1080 va 1440×900.
- [ ] Reduced-motion rejimida barcha bo'limlar ko'rinadi, o'tishlar darhol.
