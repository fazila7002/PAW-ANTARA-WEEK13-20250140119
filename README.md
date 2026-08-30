# Telegram Shop Bot — CPMK52: Bot Messaging, Long Polling, Reuse Logic (DRY)

User belanja lewat **halaman web**, bisa manual (form biasa) ATAU **chat sama AI**
yang bisa bandingin produk, kasih rekomendasi, dan **langsung bikinin order**
kalau user udah yakin mau beli. Bot Telegram khusus dipake **admin** — notifikasi
tiap ada order baru (+ sisa stok) dan cek stok kapan aja lewat `/stok`.

## Alur singkatnya
```
Customer buka web -> pilih salah satu:
   (a) isi form manual di kartu produk, ATAU
   (b) chat sama AI: "bagusan A apa B?" -> AI jelasin -> "ya udah beli A 5 biji atas nama Budi"
        |
        v
   AI MANGGIL FUNGSI buat_pesanan (function calling) -> server eksekusi beneran
        |
        v
Kedua jalur (a) dan (b) SAMA-SAMA lewat orderService.createOrder()
        |
        v
Server: cek stok, kurangin stok, simpen order -> muncul di tab Invoice
        |
        v
Server: kirim notifikasi ke Telegram admin (otomatis) - order + sisa stok
```

## Struktur folder
```
telegram-shop-bot/
├── app.js
├── config/
│   ├── database.js
│   ├── telegram.js             # 🛡️ satu instance bot dipake semua handler
│   └── gemini.js
├── models/product.model.js, order.model.js, index.js
├── services/                    # 🛡️ INTI MATERI DRY
│   ├── product.service.js       # dipake: web, API, bot /stok, gemini
│   ├── order.service.js         # createOrder() dipake 2 JALUR MASUK: form & AI chat
│   └── gemini.service.js        # chat + FUNCTION CALLING (buat_pesanan)
├── controllers/
│   ├── page.controller.js       # render katalog + handle submit form manual
│   ├── chat.controller.js       # endpoint chat AI
│   ├── invoice.controller.js    # tab invoice
│   ├── product.controller.js
│   └── order.controller.js
├── routes/ (page, chat, product, order)
├── bot/
│   ├── bot.js
│   └── handlers/start.handler.js, stok.handler.js   # KHUSUS admin
├── views/
│   ├── index.ejs                # katalog + form manual + chat widget
│   ├── invoices.ejs             # tab invoice
│   ├── success.ejs
│   └── partials/nav.ejs, badge.ejs, product-card.ejs
├── public/js/store.js, chat.js  # state chat widget (client-side)
└── seeders/seed.js              # 2 varian kaos buat demo perbandingan AI
```

## Konsep #1: Long Polling
Bot admin pake `polling: true` (`config/telegram.js`) - bot kita yang TERUS
NANYA ke server Telegram "ada pesan baru gak?", bukan Telegram yang ngirim ke
kita (itu webhook, butuh domain+HTTPS). Cocok buat development/tugas kuliah
karena bisa langsung jalan di `localhost`.

## Konsep #2: Function Calling (BAGIAN BARU)
Ini yang bikin AI bisa "beraksi", bukan cuma ngobrol. Di `services/gemini.service.js`:

```js
const buatPesananFunctionDeclaration = {
  name: 'buat_pesanan',
  description: 'Membuat pesanan... PANGGIL HANYA setelah pelanggan setuju membeli...',
  parameters: {
    type: 'OBJECT',
    properties: {
      namaProduk: { type: 'STRING', ... },
      jumlah: { type: 'NUMBER', ... },
      namaPembeli: { type: 'STRING', ... },
    },
    required: ['namaProduk', 'jumlah', 'namaPembeli'],
  },
};
```

**Penting buat dipahami**: Gemini GAK BENERAN mengeksekusi fungsi ini. Dia cuma
bilang ke server kita "tolong panggilin `buat_pesanan` dengan parameter
begini-begini". Server yang BENERAN jalanin kodenya (`executeBuatPesanan()`),
manggil `orderService.createOrder()` yang sama persis kayak yang dipake form
manual. Jadi AI gak punya akses langsung ke database - dia cuma bisa "minta"
lewat kontrak yang kita definisikan sendiri. Ini penting buat keamanan: AI gak
bisa tiba-tiba manggil fungsi lain yang gak kita declare.

Alurnya di kode (`chatWithAI`):
1. Kirim pesan user + system instruction + daftar fungsi yang boleh dipanggil
2. Kalau Gemini balikin `functionCalls`, kita eksekusi fungsi itu di server
3. Kirim BALIK hasil eksekusinya ke Gemini (`functionResponse`)
4. Gemini nyusun kalimat natural buat user berdasarkan hasil itu (bukan kita hardcode kalimatnya)

## Konsep #3: Reuse Logic dengan DRY
`orderService.createOrder()` sekarang dipanggil dari **2 jalur masuk berbeda**:
```js
// controllers/page.controller.js -> submit form manual di kartu produk
const result = await orderService.createOrder({ productId, quantity, buyerName });

// services/gemini.service.js -> AI manggil function buat_pesanan
const result = await orderService.createOrder({ productId: product.id, quantity, buyerName: namaPembeli });
```
Logic cek stok, kurangin stok, simpen order, DAN notifikasi admin cuma ditulis
SEKALI. Kalau nanti nambah jalur order baru (misal WhatsApp), tinggal panggil
`createOrder()` yang sama, semuanya (termasuk notifikasi admin) otomatis ikut.

`productService.getAllProducts()` juga dipake di 4 tempat: halaman web,
`GET /api/products`, command `/stok` di bot, dan system instruction Gemini.

## Cara install & jalanin

### 1. Bot Telegram admin
1. Chat [@BotFather](https://t.me/BotFather), `/newbot`, copy tokennya
2. Chat [@userinfobot](https://t.me/userinfobot), copy chat ID kamu

### 2. Gemini (opsional, buat chat AI)
Ambil API key gratis di https://aistudio.google.com/app/apikey

### 3. Setup
```sql
CREATE DATABASE telegram_shop_db;
```
Copy `.env.example` jadi `.env`, isi semua kredensial di atas.

```bash
npm install
npm run seed
npm run dev
```

### 4. Coba alurnya
1. Buka `http://localhost:3000`
2. Di chat widget, coba: **"bagusan kaos polos A apa B?"** — AI jelasin bedanya
3. Lanjut: **"ya udah aku beli kaos polos B 5 biji atas nama Budi"** — AI bikinin order beneran
4. Cek tab **Invoice** — order baru muncul di sana
5. Cek HP Telegram kamu — notifikasi masuk otomatis, lengkap sama sisa stok
6. Coba juga jalur manual: isi form di kartu produk langsung (gak lewat chat)

## Endpoint

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | / | Katalog + form manual + chat widget |
| POST | /order | Submit form manual |
| GET | /invoices | Tab invoice |
| POST | /api/chat | Endpoint chat AI (dipanggil `public/js/chat.js`) |
| GET | /api/products | List produk (JSON) |
| GET | /api/orders | List semua order (JSON) |

## Kenapa chat-nya "stateless" di server

Riwayat percakapan (`history`) disimpen & dikirim ulang dari **client**
(`public/js/chat.js`), server gak nyimpen sesi apapun. Ini pilihan desain
sengaja biar server tetep sederhana (gak butuh Redis/session store buat chat) -
trade-off-nya: kalau user refresh halaman, riwayat chat-nya hilang (tapi order
yang udah dibuat tetep aman, karena itu udah kesimpen ke database).

## Kenapa .env penting
`GEMINI_API_KEY` dan `TELEGRAM_BOT_TOKEN` dua-duanya sensitif. Kalau
`GEMINI_API_KEY` bocor, orang lain bisa makan kuota API kamu. Kalau
`TELEGRAM_BOT_TOKEN` bocor, orang lain bisa ngontrol bot kamu sepenuhnya.

## Ide pengembangan lanjut
- Validasi produk yang disebut AI beneran ada sebelum eksekusi (udah ada, tapi bisa ditambah fuzzy match kalo salah ketik nama produk)
- Command `/riwayat` di bot admin buat liat order terakhir
- Simpan riwayat chat ke database (bukan cuma di browser) biar gak hilang pas refresh

---

## Pengembangan Tugas Practice 13

Project ini dikembangkan (bukan dibangun ulang) dengan tambahan berikut. Bukti lengkap
beserta screenshot ada di [`tugas.md`](tugas.md).

### Yang ditambahkan

| Fitur | File utama |
|---|---|
| Login 2 role (admin & customer) | `models/user.model.js`, `services/auth.service.js`, `controllers/auth.controller.js`, `middlewares/auth.middleware.js` |
| CRUD produk oleh admin | `controllers/admin.controller.js`, `services/product.service.js`, `views/admin/` |
| Multiple order dalam 1 transaksi | `models/orderItem.model.js`, `services/order.service.js`, `public/js/cart.js` |
| Invoice + ubah status pesanan | `controllers/admin.controller.js`, `utils/orderStatus.js`, `views/partials/invoice-detail-body.ejs` |
| 25 produk & 3 akun demo | `seeders/seed.js` |
| Perbaikan UI | `views/partials/` (nav, badge, status-badge, stat-card, head) |

### Struktur order yang baru

```
Order (header: pembeli, total, status, sumber)
  └──< OrderItem (produk, qty, harga saat dibeli) >── Product
```

Dulu 1 order = 1 produk (kolom `productId` nempel di tabel `orders`), sekarang 1 order
bisa banyak produk. Proses simpannya dibungkus **database transaction**, jadi kalau ada
satu item yang stoknya kurang, seluruh pesanan dibatalkan (gak ada stok yang kepotong
sebagian).

### Role & proteksi halaman

| Route | Akses |
|---|---|
| `/login`, `/register` | publik |
| `/`, `/checkout`, `/invoice`, `/invoice/:id` | customer (login) |
| `/admin/**` | admin saja (`requireRole('admin')`) |

Habis login, admin diarahkan ke `/admin`, customer ke `/` — beda role, beda tampilan.

### Akun demo (dari seeder)

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Customer | `budi` | `budi123` |
| Customer | `sari` | `sari123` |

### Catatan

`TELEGRAM_BOT_TOKEN` dan `GEMINI_API_KEY` sifatnya opsional. Kalau dikosongkan di
`.env`, aplikasi web tetap jalan penuh — cuma notifikasi Telegram & chat AI yang
otomatis nonaktif (ada warning di console, bukan crash).
