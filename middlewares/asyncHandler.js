/**
 * 🛡️ DRY — HILANGIN try/catch YANG BERULANG
 * ============================================================
 * Sebelumnya HAMPIR SEMUA controller isinya pola yang sama persis:
 *
 *   async function x(req, res) {
 *     try { ...logic... } catch (err) { res.status(500).send(err.message) }
 *   }
 *
 * Blok catch yang sama ditulis ulang di tiap fungsi. Dengan wrapper ini,
 * controller cukup nulis logic-nya aja; kalau ada error yang ke-throw,
 * otomatis dilempar ke error handler Express (liat app.js).
 *
 *   router.get('/', asyncHandler(controller.renderHome));
 * ============================================================
 */
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
