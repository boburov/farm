# Panel fotosuratlari

Sahifadagi uch panel (`ishlab chiqaruvchidan olish → tashish → bozorda sotish`)
hozircha **vektor sahnalar** bilan chiziladi — `assets/scenes.js`.

Haqiqiy fotosurat qo'yish uchun shu papkaga quyidagi nomlar bilan tashlang:

| Fayl | Nima ko'rsatilishi kerak |
|---|---|
| `2010-1.jpg` | Ishlab chiqaruvchidan tovuq go'shti olinayotgani (sovuq xona, yashiklar) |
| `2010-2.jpg` | Yashiklar yuk mashinasiga ortilayotgani |
| `2010-3.jpg` | Bozorda tovuq go'shti sotilayotgani |

Sahifa ularni avtomat ko'taradi (`assets/page.js` → `panelNode`), fayl
bo'lmasa yoki yuklanmasa vektor sahna joyida qoladi. Kodga tegish shart emas.

Tavsiya: kengligi ~1400–2000 px, deyarli kvadrat kadr (panel kvadratga yaqin),
JPEG sifat ~82.

## Talablar

- **Litsenziya**: tijorat maqsadida erkin bo'lishi shart. Manbani shu faylga yozing.
- **Yozuvsiz**: kadrda o'qiladigan yozuv, do'kon peshlavhasi, brend logotipi yoki
  avtomobil raqami bo'lmasin — ular begona til/brendni ekranga olib chiqadi va
  raqam (masalan avtomobil raqami) `no-fabricated-numbers` tekshiruvini chalg'itadi.
- **Anaxronizmsiz**: 2010-yil sahifasida keyingi yillarga tegishli sana yoki
  kalendar ko'rinmasin.
- **Lokal**: fayl shu papkada saqlanadi, CDN havolasi ishlatilmaydi
  (`no-external-requests` kafolati).

## Tekshirilgan va rad etilgan variantlar (2026-09-12)

Unsplash'dan to'rtta nomzod ko'rib chiqildi, uchtasi yaroqsiz:

- `unsplash.com/photos/7zzxrZMe280` — bozor vitrinasida butun tovuqlar.
  Mazmunan mos, lekin kadr yuqorisida gruzin yozuvlari, brend shishalari va
  2010-yilga tegishli bo'lmagan kalendar raqami bor. Pastki qismini kesib
  ishlatish mumkin.
- `unsplash.com/photos/eHltrxVNHtY` — bozor rastasi: kamerraga qarab turgan
  yuzlar, Adidas va ABA logotiplari, xitoy/xmer yozuvlari. **Rad etildi.**
- `unsplash.com/photos/4QZBIdS6SWY` — yuk mashinasi: oq-qora, "PASAR" yozuvi,
  avtomobil raqami ko'rinadi. **Rad etildi.**
- `unsplash.com/photos/M-Owv7Ax-dE` — furgon: ulkan "MEALPRO.COM" brendi va
  Kaliforniya avtomobil raqami. **Rad etildi.**

Xulosa: bu hikoya uchun mos, toza bepul stok foto topilmadi. Fotolarni
buyurtmachi bergan referens uslubida alohida tayyorlash kerak.
