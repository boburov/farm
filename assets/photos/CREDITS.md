# Fon fotosuratlari

## 2010.jpg

- **Manba:** buyurtmachi bergan, Gemini bilan yaratilgan surat
  (`Gemini_Generated_Image_h4ktfmh4ktfmh4kt.jfif`, 1264x842).
- **Tahrir:** kesilmadi, faqat JFIF → JPEG ga o'girildi → 1264x842 (1.50:1),
  249 KB. Eni asl faylnikidek qoldirildi — sun'iy kattalashtirish detal
  qo'shmaydi.
- **Kadr:** uch panelli surat — chapda tovuqxona va yashiklarga joylash,
  o'rtada yashiklarni yuk mashinasiga ortish, o'ngda bozor rastasi — sahifadagi
  uch bo'g'inga aynan mos tushadi, shuning uchun u butun ekranni qoplaydi va
  qalin egri strelkalar zonalar chegarasiga tushadi.

Kadrda o'qiladigan yozuv, brend logotipi, avtomobil raqami yoki 2010-yilga
tegishli bo'lmagan sana yo'q — `no-fabricated-numbers` tekshiruvi buzilmaydi.
(Rastadagi doskada faqat tovuq chizmasi bor, matn yo'q.)

## 2020.jpg

- **Manba:** buyurtmachi bergan, Gemini bilan yaratilgan surat
  (`Gemini_Generated_Image_w5goq7w5goq7w5go.jfif`, 1264x842).
- **Tahrir:** tepadagi osmon va pastdagi xira barglar markazdan teng kesildi
  (`sips -c 748 1264`), JPEG q82 → 1264x748 (1.69:1), 308 KB.
  Eni asl faylnikidek qoldirildi — sun'iy kattalashtirish detal qo'shmaydi.
- **Kadr:** ochiq tovuqxona, yem siloslari va oldingi planda "SO‘YISH VA QAYTA
  ISHLASH" liniyasi — 2020–2021 hikoyasiga (boqish va so‘yish boshlandi)
  aynan mos.
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

- **Manba:** buyurtmachi bergan haqiqiy surat (`2026-09-12 21.55.48.jpg`,
  1195x896 = 1.33:1). Oldingi Gemini surati 2026-09-12 da shu foto bilan
  almashtirildi.
- **Tahrir:** yo'q — fayl asl holida qo'yildi (112 KB). Eni 2400 px ga
  cho'zilmadi, chunki manba o'zi 1195 px.
- **Ishlatilishi:** butun ekran foni EMAS — `layout:'project'` sahifasidagi
  tasvir maydoni (`.visual`, `object-fit:cover`), shuning uchun nisbati
  muhim emas: yuqori/pastdan kesiladi.
- Kadrda binodagi kichik peshtaxta yozuvi bor; avtomobil raqami o'qilmaydi.

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
