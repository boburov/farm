# Panel fotosurati

## 2010.jpg

- **Manba:** buyurtmachi bergan, Gemini bilan yaratilgan surat
  (`Gemini_Generated_Image_sjv6jvsjv6jvsjv6.jpg`, 2528x1684).
- **Tahrir:** tepadagi bo'sh osmon va elektr simlari hamda pastdagi bo'sh beton
  kesib tashlandi (`extract {top:440, bottom:64}`), eni 2400 px ga keltirildi,
  JPEG q82 → 2400x1120 (2.14:1), 327 KB.
- **Kadr:** chapda ishlab chiqaruvchi, o'rtada yashiklarni yuk mashinasiga
  ortish, o'ngda bozor rastasi — sahifadagi uch bo'g'inga aynan mos tushadi,
  shuning uchun u butun panel bandini qoplaydi va yashil strelkalar zonalar
  chegarasiga tushadi.

Kadrda o'qiladigan yozuv, brend logotipi, avtomobil raqami yoki 2010-yilga
tegishli bo'lmagan sana yo'q — `no-fabricated-numbers` tekshiruvi buzilmaydi.

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
