/**
 * 🛡️ DRY: daftar status pesanan ditulis SEKALI di sini, dipake di banyak tempat —
 * model (enum kolom status), dropdown ubah status di halaman admin, badge warna
 * di view invoice, sampai teks notifikasi. Kalau nanti nambah status baru,
 * cukup tambah satu baris di sini, semua ikut nyesuain.
 */
const STATUS = {
  pending: { label: 'Menunggu Konfirmasi', color: 'yellow' },
  diproses: { label: 'Diproses', color: 'blue' },
  dikirim: { label: 'Dikirim', color: 'purple' },
  selesai: { label: 'Selesai', color: 'green' },
  dibatalkan: { label: 'Dibatalkan', color: 'red' },
};

const STATUS_LIST = Object.keys(STATUS);
const STATUS_DEFAULT = 'pending';
const STATUS_CANCELLED = 'dibatalkan';

function getStatusLabel(status) {
  return STATUS[status]?.label || status;
}

function getStatusColor(status) {
  return STATUS[status]?.color || 'gray';
}

function isValidStatus(status) {
  return STATUS_LIST.includes(status);
}

module.exports = {
  STATUS,
  STATUS_LIST,
  STATUS_DEFAULT,
  STATUS_CANCELLED,
  getStatusLabel,
  getStatusColor,
  isValidStatus,
};
