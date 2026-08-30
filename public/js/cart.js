/**
 * KERANJANG — INI YANG BIKIN MULTIPLE ORDER JALAN.
 * Semua item dikumpulin dulu di state (pakai createStore yang sama dengan
 * chat widget, liat public/js/store.js), baru dikirim SEKALI pas checkout
 * sebagai array JSON ke POST /checkout.
 */
const cartStore = createStore({
  items: [], // [{ productId, name, price, quantity, stock }]
});

const el = {
  list: document.getElementById('cart-items'),
  count: document.getElementById('cart-count'),
  total: document.getElementById('cart-total'),
  payload: document.getElementById('cart-payload'),
  checkoutBtn: document.getElementById('checkout-btn'),
  productList: document.getElementById('product-list'),
  search: document.getElementById('search-input'),
  emptySearch: document.getElementById('empty-search'),
};

const formatRupiah = (n) => 'Rp' + Number(n).toLocaleString('id-ID');

function addItem({ productId, name, price, stock, quantity }) {
  const items = [...cartStore.getState().items];
  const existing = items.find((i) => i.productId === productId);

  if (existing) {
    // jangan sampai melebihi stok yang ada
    existing.quantity = Math.min(existing.quantity + quantity, stock);
  } else {
    items.push({ productId, name, price, stock, quantity: Math.min(quantity, stock) });
  }

  cartStore.setState({ items });
}

function changeQty(productId, delta) {
  const items = cartStore
    .getState()
    .items.map((i) =>
      i.productId === productId
        ? { ...i, quantity: Math.min(Math.max(i.quantity + delta, 0), i.stock) }
        : i
    )
    .filter((i) => i.quantity > 0); // qty 0 = item dibuang dari keranjang

  cartStore.setState({ items });
}

function removeItem(productId) {
  cartStore.setState({
    items: cartStore.getState().items.filter((i) => i.productId !== productId),
  });
}

// render ulang tiap kali state keranjang berubah
function renderCart(state) {
  const { items } = state;

  if (items.length === 0) {
    el.list.innerHTML = '<p class="text-gray-400 text-center py-6 text-sm">Keranjang masih kosong</p>';
  } else {
    el.list.innerHTML = items
      .map(
        (i) => `
        <div class="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-800 truncate">${i.name}</p>
            <p class="text-xs text-gray-400">${formatRupiah(i.price)} x ${i.quantity} = ${formatRupiah(i.price * i.quantity)}</p>
          </div>
          <div class="flex items-center gap-1">
            <button type="button" class="cart-minus w-6 h-6 rounded bg-gray-100 text-gray-600" data-id="${i.productId}">-</button>
            <span class="w-6 text-center text-sm">${i.quantity}</span>
            <button type="button" class="cart-plus w-6 h-6 rounded bg-gray-100 text-gray-600" data-id="${i.productId}">+</button>
            <button type="button" class="cart-remove ml-1 text-red-500 text-xs" data-id="${i.productId}">✕</button>
          </div>
        </div>`
      )
      .join('');
  }

  const totalItem = items.reduce((s, i) => s + i.quantity, 0);
  const totalHarga = items.reduce((s, i) => s + i.price * i.quantity, 0);

  el.count.textContent = `${totalItem} item`;
  el.total.textContent = formatRupiah(totalHarga);
  el.checkoutBtn.disabled = items.length === 0;

  // payload yang dikirim ke server: array item, bukan cuma 1 produk
  el.payload.value = JSON.stringify(
    items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
  );
}

cartStore.subscribe(renderCart);
renderCart(cartStore.getState());

// tombol "+ Keranjang" di tiap kartu produk (event delegation, satu listener buat semua)
el.productList.addEventListener('click', (e) => {
  const btn = e.target.closest('.add-to-cart-btn');
  if (!btn) return;

  const productId = Number(btn.dataset.id);
  const qtyInput = document.querySelector(`.qty-input[data-id="${productId}"]`);
  const quantity = Math.max(1, Number(qtyInput?.value || 1));

  addItem({
    productId,
    name: btn.dataset.name,
    price: Number(btn.dataset.price),
    stock: Number(btn.dataset.stock),
    quantity,
  });
});

// tombol +/-/hapus di dalam keranjang
el.list.addEventListener('click', (e) => {
  const plus = e.target.closest('.cart-plus');
  const minus = e.target.closest('.cart-minus');
  const remove = e.target.closest('.cart-remove');

  if (plus) changeQty(Number(plus.dataset.id), 1);
  if (minus) changeQty(Number(minus.dataset.id), -1);
  if (remove) removeItem(Number(remove.dataset.id));
});

// pencarian produk sederhana di sisi client
if (el.search) {
  el.search.addEventListener('input', (e) => {
    const kata = e.target.value.trim().toLowerCase();
    let terlihat = 0;

    el.productList.querySelectorAll('div.bg-white').forEach((card) => {
      const cocok = card.textContent.toLowerCase().includes(kata);
      card.style.display = cocok ? '' : 'none';
      if (cocok) terlihat++;
    });

    el.emptySearch.classList.toggle('hidden', terlihat > 0);
  });
}
