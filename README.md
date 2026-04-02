Spotify uslubidagi (dark theme) Music Player

Fayllar:
- index.html — asosiy sahifa
- styles.css — qo'shimcha CSS (glassmorphism, animation)
- script.js — hamma player logikasi
- Music/ — mahalliy .mp3 fayllar (allaqachon mavjud)
- Cover/ — album art rasmlari (allaqachon mavjud)

Qanday ishlatish:
1. Bu papkani local fayl server orqali oching yoki brauzerda `index.html` faylini oching.
   Windowsda oddiygina `index.html` ga ikki marta bosish bilan ochishingiz mumkin (Chrome/Edge/Firefox).
2. Agar audio fayllar yüklenmasa, fayl yo'llarini `script.js` dagi `tracks` massiviga moslab tekshiring.

Eslatma:
- Tailwind va FontAwesome CDN orqali yuklanadi. Internet aloqasi talab qilinadi.
- Kod izohlangan va tushunarli qilib yozilgan.

Keyingi takomillashlar (ixtiyoriy):
- Local build bilan Tailwind/DaisyUI integratsiyasi (purge, production styles)
- Play queue, drag-reorder, yoki ID3 metadan otomatik ma'lumot olish

