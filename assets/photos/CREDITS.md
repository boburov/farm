# Fon fotosuratlari

## 2010.jpg

- **Manba:** buyurtmachi bergan, Gemini bilan yaratilgan surat
  (`Gemini_Generated_Image_sjv6jvsjv6jvsjv6.jpg`, 2528x1684).
- **Tahrir:** faqat eng chetlari kesildi (`extract {top:56, bottom:40}`), eni
  2400 px ga keltirildi, JPEG q82 → 2400x1508 (1.59:1), 351 KB.
  Osmon ataylab saqlandi — referens kompozitsiyasida statistika kartalari
  aynan osmon ustida yotadi.
- **Kadr:** chapda ishlab chiqaruvchi, o'rtada yashiklarni yuk mashinasiga
  ortish, o'ngda bozor rastasi — sahifadagi uch bo'g'inga aynan mos tushadi,
  shuning uchun u butun ekranni qoplaydi va qalin egri strelkalar zonalar
  chegarasiga tushadi.

Kadrda o'qiladigan yozuv, brend logotipi, avtomobil raqami yoki 2010-yilga
tegishli bo'lmagan sana yo'q — `no-fabricated-numbers` tekshiruvi buzilmaydi.

## 2020.jpg

- **Manba:** buyurtmachi bergan, Gemini bilan yaratilgan surat
  (`Gemini_Generated_Image_w7aznyw7aznyw7az.jpg`, 2528x1684).
- **Tahrir:** pastdagi xira barglar va tepadagi ortiqcha osmon kesildi
  (`extract {top:40, bottom:150}`), eni 2400 px, JPEG q82 → 2400x1418
  (1.69:1), 426 KB.
- **Kadr:** tovuqxona, "SO‘YISH VA QAYTA ISHLASH" liniyasi va yuk mashinasi —
  2020–2021 hikoyasiga (boqish va so‘yish boshlandi) aynan mos.
- Kadrdagi yagona yozuv o‘zbekcha va brendga tegishli; begona logotip,
  avtomobil raqami yoki anaxronistik sana yo‘q.

## 2022.jpg

- **Manba:** buyurtmachi bergan, Gemini bilan yaratilgan surat
  (`Gemini_Generated_Image_uequo8uequo8uequ.jpg`, 2528x1684).
- **Tahrir:** pastdagi tayyor zanjir paneli va tepadagi ortiqcha osmon kesildi
  (`extract {top:60, bottom:384}`), eni 2400 px, JPEG q82 → 2400x1177
  (2.04:1), 359 KB.
  Zanjir paneli ataylab kesilgan: sahifa o'z zanjir qatorini chizadi, aks holda
  ikkita bir xil qator ustma-ust tushardi.
- **Kadr:** yem silosi va don uyumi, tovuqxonalar, so‘yish sexi va yuk mashinasi —
  2022–2023 hikoyasiga (klaster boshlandi, ichki yem ishlab chiqarish) mos.

## 2025.jpg

- **Manba:** buyurtmachi bergan, Gemini bilan yaratilgan surat
  (`Gemini_Generated_Image_u6pctiu6pctiu6pc.jpg`, 2528x1684).
- **Tahrir:** kesilmagan — faqat eni 2400 px ga keltirilib, JPEG q82 ga
  siqilgan → 2400x1599 (1.50:1), 487 KB.
  Kadr kollaj: har bir katak zanjirning bir bo'g'ini (nasl · yem · boqish ·
  so'yish · parchalash · qadoqlash), shuning uchun butun saqlandi.
- Kadrda yozuv, logotip yoki avtomobil raqami yo'q.

## 2026.jpg

- **Manba:** buyurtmachi bergan, Gemini bilan yaratilgan surat
  (`Gemini_Generated_Image_7mfprk7mfprk7mfp.jpg`, 3936x1088 = 3.62:1).
- **Tahrir:** kesilmagan — eni 2400 px ga keltirilib siqilgan → 2400x663,
  155 KB. Nisbati o'zi gorizontal polosa uchun mos.
- **Ishlatilishi:** butun ekran foni EMAS — `layout:'project'` sahifasidagi
  gorizontal polosa (`.band`), balandligi 52vh dan oshmaydi.
- Kadrda yozuv, logotip yoki avtomobil raqami yo'q.

## plans-1.jpg … plans-5.jpg (istiqboldagi loyihalar)

Buyurtmachi bergan, Gemini bilan yaratilgan beshta surat. Karta nisbati 4:5,
shuning uchun har biri aynan 4:5 ga kesilib, eni 900 px ga keltirilgan
(JPEG q82).

| Fayl | Loyiha | Manba |
|---|---|---|
| `plans-1.jpg` | Andijon yem ozuqa zavodi | `Gemini_..._tusqzh...` |
| `plans-2.jpg` | Kalbasa maxsulotlari | `Gemini_..._fysxnn...` |
| `plans-3.jpg` | Ona tovuq loyihasi | `Gemini_..._c5txzm...` |
| `plans-4.jpg` | 500 ta savdo do‘koni | `Gemini_..._7nso8j...` |
| `plans-5.jpg` | Parranda va naslli chorva | `Gemini_..._qsliun...` |

**`plans-1.jpg` — pastki 30% ataylab kesilgan.** Asl kadrda begona brend
("ukrmara AGRO") va yuk mashinasidagi yozuv bor edi; taqdimotda boshqa
kompaniya nomi turmasligi kerak. Kesilgandan keyin faqat silos va neytral
yashil barg belgisi qoldi.

## Qanday almashtiriladi

`assets/years.js` dagi yil obyektida `photo` maydoni. Fayl yo'q bo'lsa yoki
yuklanmasa sahifa `assets/scenes.js` dagi uchta vektor sahnaga tushadi —
kodga tegish shart emas.

Talablar:

- tijorat uchun erkin litsenziya (yoki buyurtmachiniki), manba shu yerga yoziladi;
- kadrda o'qiladigan yozuv, peshlavha, brend logotipi yoki avtomobil raqami bo'lmasin;
- 2010-yil sahifasida keyingi yillarga tegishli sana/kalendar ko'rinmasin;
- fayl shu papkada lokal saqlanadi, CDN havolasi ishlatilmaydi
  (`no-external-requests` kafolati);
- tavsiya: eni ~2400 px, keng nisbat (~2:1), JPEG sifat ~82.

## Rad etilgan stok variantlar (2026-09-12)

Buyurtmachi surat berishidan oldin Unsplash'dan to'rtta nomzod tekshirildi,
uchtasi yaroqsiz chiqdi — mos, toza bepul stok foto topilmadi:

- `unsplash.com/photos/eHltrxVNHtY` — kameraga qarab turgan yuzlar, Adidas va
  ABA logotiplari, xitoy/xmer yozuvlari.
- `unsplash.com/photos/4QZBIdS6SWY` — oq-qora, "PASAR" yozuvi, avtomobil raqami.
- `unsplash.com/photos/M-Owv7Ax-dE` — ulkan "MEALPRO.COM" brendi va Kaliforniya
  avtomobil raqami.
- `unsplash.com/photos/7zzxrZMe280` — mazmunan mos edi, lekin kadr yuqorisida
  gruzin yozuvlari, brend shishalari va 2010-yilga tegishli bo'lmagan kalendar
  raqami bor.
