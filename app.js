require("dotenv").config();
const express = require("express");
const session = require("express-session");
const { sequelize } = require("./models");
const startBot = require("./bot/bot");

const { attachUser } = require("./middlewares/auth.middleware");
const { formatRupiah } = require("./utils/formatRupiah");
const { getStatusLabel, getStatusColor } = require("./utils/orderStatus");

const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const chatRoutes = require("./routes/chat.routes");
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const pageRoutes = require("./routes/page.routes");

const app = express();

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // buat baca body dari form HTML

app.use(
  session({
    secret: process.env.SESSION_SECRET || "rahasia-default-ganti-di-env",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true },
  })
);

/**
 * 🛡️ DRY: helper yang dipake DI BANYAK VIEW didaftarin sekali di sini
 * lewat app.locals, jadi tiap controller gak perlu ngoper fungsi yang
 * sama berulang-ulang lewat res.render().
 */
app.locals.formatRupiah = formatRupiah;
app.locals.getStatusLabel = getStatusLabel;
app.locals.getStatusColor = getStatusColor;

// nempelin user + nama toko ke res.locals buat semua view
app.use(attachUser);

app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/chat", chatRoutes);
app.use("/", authRoutes);
app.use("/admin", adminRoutes);
app.use("/", pageRoutes);

// halaman 404
app.use((req, res) => {
  res.status(404).render("error", {
    title: "Halaman gak ditemukan",
    message: `URL ${req.originalUrl} gak ada di aplikasi ini.`,
    backUrl: "/",
  });
});

/**
 * 🛡️ DRY: satu error handler buat SEMUA route. Kerja bareng
 * middlewares/asyncHandler.js — controller cukup nulis logic-nya,
 * error apapun otomatis mendarat di sini.
 */
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(500).render("error", {
    title: "Terjadi kesalahan",
    message: err.message,
    backUrl: "/",
  });
});

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log("Koneksi database berhasil");

    await sequelize.sync();
    console.log("Sync model selesai");

    // Express (halaman web tempat user belanja) dan bot Telegram (khusus
    // admin) jalan BARENG dalam 1 process, sama-sama manggil service
    // layer yang sama (liat services/)
    app.listen(PORT, () => {
      console.log(`Server web jalan di http://localhost:${PORT}`);
    });

    startBot();
  } catch (err) {
    console.error("Gagal konek ke database:", err.message);
  }
}

start();
