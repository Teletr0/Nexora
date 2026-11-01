'use strict';

const API = '/api/shop';
const CART_KEY = 'nexora-cart-v1';
const WISHLIST_KEY = 'nexora-wishlist-v1';

const state = {
  query: '',
  category: '',
  sort: 'featured',
  products: [],        // Catálogo completo para o carrinho
  visibleProducts: [], // Produtos exibidos após os filtros
  categories: [],
  cart: readCart(),
  wishlist: readWishlist()
};

const $ = id => document.getElementById(id);

const ui = {
  headerSearch: $('header-search'),
  search: $('catalog-search'),
  category: $('category-filter'),
  sort: $('sort-filter'),
  grid: $('product-grid'),
  status: $('catalog-status'),
  count: $('catalog-count'),
  error: $('catalog-error'),
  errorMessage: $('catalog-error-message'),
  retry: $('retry-load'),
  cartCount: $('cart-count'),
  drawer: $('cart-drawer'),
  overlay: $('cart-overlay'),
  cartItems: $('cart-items'),
  cartEmpty: $('cart-empty'),
  cartSummary: $('cart-summary'),
  subtotal: $('cart-subtotal'),
  cartTitleCount: $('cart-title-count'),
  dialog: $('product-dialog'),
  dialogContent: $('dialog-content'),
  toast: $('toast'),
  wishlistCount: $('wishlist-count'),
  wishlistTitleCount: $('wishlist-title-count'),
  wishlistDrawer: $('wishlist-drawer'),
  wishlistOverlay: $('wishlist-overlay'),
  wishlistItems: $('wishlist-items'),
  wishlistEmpty: $('wishlist-empty')
};

const money = value =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);

async function getJSON(url, options = {}) {
  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...options.headers
      }
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Não foi possível conectar à API Flask.');
  }

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error('A API retornou uma resposta que não é JSON válido.');
  }

  if (!response.ok) {
    throw new Error(
      data?.error?.message || `Erro HTTP ${response.status}.`
    );
  }

  return data;
}

function readCart() {
  try {
    const value = JSON.parse(
      localStorage.getItem(CART_KEY) || '[]'
    );

    if (!Array.isArray(value)) return [];

    return value.filter(item =>
      item &&
      Number.isSafeInteger(item.id) &&
      item.id > 0 &&
      Number.isSafeInteger(item.quantity) &&
      item.quantity > 0
    );
  } catch {
    return [];
  }
}

function readWishlist() {
  try {
    const value = JSON.parse(
      localStorage.getItem(WISHLIST_KEY) || '[]'
    );

    if (!Array.isArray(value)) return [];

    return [...new Set(value.filter(id =>
      Number.isSafeInteger(id) && id > 0
    ))];
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    return true;
  } catch {
    toast('Não foi possível salvar o carrinho neste navegador.');
    return false;
  }
}

function saveWishlist() {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(state.wishlist));
    return true;
  } catch {
    toast('Não foi possível salvar a lista neste navegador.');
    return false;
  }
}

let toastTimer;

function toast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add('visible');

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    ui.toast.classList.remove('visible');
  }, 2400);
}

function makeImage(src, alt, className) {
  const img = document.createElement('img');

  img.alt = alt;
  img.className = className;
  img.loading = 'lazy';

  img.onerror = () => {
    img.removeAttribute('src');
    img.alt = `Imagem indisponível: ${alt}`;
  };

  img.src = src;

  return img;
}

function productById(id) {
  return state.products.find(product => product.id === id);
}

/* Inicialização */

async function init() {
  ui.status.textContent = 'Conectando à API Flask…';
  ui.error.hidden = true;

  try {
    const [catalog, categories] = await Promise.all([
      getJSON(`${API}/products?sort=featured`),
      getJSON(`${API}/categories`)
    ]);

    if (!Array.isArray(catalog.items) ||
        !Array.isArray(categories.items)) {
      throw new Error('Estrutura de dados inválida recebida da API.');
    }

    // Preserva o catálogo completo, sem aplicar filtros aqui.
    state.products = catalog.items;
    state.categories = categories.items;

    // Evita duplicar categorias ao tentar novamente.
    ui.category.replaceChildren(
      new Option('Todas as categorias', '')
    );

    state.categories.forEach(category => {
      ui.category.add(new Option(category, category));
    });

    ui.category.value = state.category;

    // Sincroniza o carrinho com os produtos disponíveis.
    reconcileCart();
    reconcileWishlist();

    await refresh();
  } catch (error) {
    ui.status.textContent = '';
    ui.error.hidden = false;
    ui.errorMessage.textContent =
      `${error.message} Verifique se o Flask está em execução.`;
    ui.count.textContent = 'Catálogo indisponível';
  }
}

function reconcileCart() {
  state.cart = state.cart
    .map(item => {
      const product = productById(item.id);

      if (!product || product.stock <= 0) return null;

      return {
        id: item.id,
        quantity: Math.min(item.quantity, product.stock)
      };
    })
    .filter(Boolean);

  saveCart();
  renderCart();
}

function reconcileWishlist() {
  state.wishlist = state.wishlist.filter(id => productById(id));
  saveWishlist();
  renderWishlist();
}

/* Catálogo e filtros */

let refreshSequence = 0;

async function refresh() {
  const sequence = ++refreshSequence;

  ui.error.hidden = true;
  ui.status.textContent = 'Atualizando catálogo…';

  const params = new URLSearchParams({
    sort: state.sort
  });

  if (state.query.trim()) {
    params.set('q', state.query.trim());
  }

  if (state.category) {
    params.set('category', state.category);
  }

  try {
    const data = await getJSON(
      `${API}/products?${params.toString()}`
    );

    // Ignora respostas antigas que chegaram fora de ordem.
    if (sequence !== refreshSequence) return;

    if (!Array.isArray(data.items) ||
        !Number.isFinite(data.total)) {
      throw new Error('Resposta de catálogo inválida.');
    }

    // Não sobrescreve state.products: ele contém o catálogo completo.
    state.visibleProducts = data.items;

    renderProducts(state.visibleProducts);

    ui.count.textContent =
      `${data.total} ${data.total === 1 ? 'produto' : 'produtos'}`;

    ui.status.textContent = data.total
      ? ''
      : 'Nenhum produto corresponde aos filtros.';

    renderCart();
  } catch (error) {
    if (sequence !== refreshSequence) return;

    ui.status.textContent = '';
    ui.error.hidden = false;
    ui.errorMessage.textContent = error.message;
  }
}

function clearFilters() {
  state.query = '';
  state.category = '';
  state.sort = 'featured';

  ui.search.value = '';
  ui.headerSearch.value = '';
  ui.category.value = '';
  ui.sort.value = 'featured';

  refresh();
}

function renderProducts(products) {
  ui.grid.replaceChildren();

  if (!products.length) {
    const box = document.createElement('div');
    box.className = 'empty-results';

    const heading = document.createElement('h3');
    heading.textContent = 'Nenhum resultado por aqui.';

    const description = document.createElement('p');
    description.textContent =
      'Experimente outro termo ou remova algum filtro.';

    const button = document.createElement('button');
    button.className = 'button button-dark';
    button.type = 'button';
    button.textContent = 'Limpar filtros';
    button.addEventListener('click', clearFilters);

    box.append(heading, description, button);
    ui.grid.append(box);

    return;
  }

  for (const product of products) {
    const card = document.createElement('article');
    card.className = 'product-card';

    const imageWrap = document.createElement('div');
    imageWrap.className = 'product-image-wrap';

    imageWrap.append(
      makeImage(product.image, product.name, 'product-image')
    );

    const wish = document.createElement('button');
    wish.className = 'wishlist-toggle';
    wish.type = 'button';
    wish.addEventListener('click', () => toggleWishlist(product.id));
    updateWishlistToggle(wish, product.id);
    imageWrap.append(wish);

    const tag = document.createElement('span');
    tag.className = `product-tag${product.stock <= 0 ? ' sold' : ''}`;
    tag.textContent = product.stock <= 0
      ? 'Indisponível'
      : product.stock <= 5
        ? 'Últimas unidades'
        : 'Curadoria NXR';

    imageWrap.append(tag);

    const add = document.createElement('button');
    add.className = 'quick-add';
    add.type = 'button';
    add.textContent = product.stock > 0
      ? '+ Adicionar ao carrinho'
      : 'Sem estoque';
    add.disabled = product.stock <= 0;
    add.addEventListener('click', () => addToCart(product.id));

    imageWrap.append(add);

    const meta = document.createElement('div');
    meta.className = 'product-meta';

    const category = document.createElement('span');
    category.className = 'product-category';
    category.textContent = product.category;

    const stock = document.createElement('span');
    stock.textContent = product.stock > 0
      ? `${product.stock} disponíveis`
      : 'Esgotado';

    meta.append(category, stock);

    const name = document.createElement('h3');
    name.className = 'product-name';
    const productLink = document.createElement('a');
    productLink.className = 'product-name-link';
    productLink.href = `/produto/${product.id}`;
    productLink.textContent = product.name;
    name.append(productLink);

    const bottom = document.createElement('div');
    bottom.className = 'product-bottom';

    const price = document.createElement('span');
    price.className = 'product-price';
    price.textContent = money(product.price);

    const details = document.createElement('button');
    details.className = 'details-link';
    details.type = 'button';
    details.textContent = 'Ver detalhes ↗';
    details.addEventListener('click', () => detailsFor(product.id));

    bottom.append(price, details);
    card.append(imageWrap, meta, name, bottom);
    ui.grid.append(card);
  }
}

function updateWishlistToggle(button, id) {
  const product = productById(id);
  const saved = state.wishlist.includes(id);

  button.dataset.productId = id;
  button.textContent = saved ? '♥' : '♡';
  button.setAttribute('aria-pressed', String(saved));
  button.setAttribute(
    'aria-label',
    `${saved ? 'Remover da' : 'Adicionar à'} lista de desejos: ${product.name}`
  );
}

function toggleWishlist(id) {
  const product = productById(id);

  if (!product) {
    toast('Produto indisponível.');
    return;
  }

  const index = state.wishlist.indexOf(id);
  const added = index === -1;

  if (added) {
    state.wishlist.push(id);
  } else {
    state.wishlist.splice(index, 1);
  }

  const saved = saveWishlist();
  renderWishlist();

  document
    .querySelectorAll('.wishlist-toggle, .wishlist-dialog-toggle')
    .forEach(button => {
      if (Number(button.dataset.productId) === id) {
        updateWishlistToggle(button, id);
      }
    });

  if (!saved) return;

  toast(added
    ? `${product.name} adicionado à lista de desejos.`
    : `${product.name} removido da lista de desejos.`);
}

/* Detalhes do produto */

async function detailsFor(id) {
  try {
    const product = await getJSON(`${API}/products/${id}`);

    ui.dialogContent.replaceChildren();

    const wrap = document.createElement('div');
    wrap.className = 'dialog-product';

    wrap.append(
      makeImage(product.image, product.name, 'dialog-image')
    );

    const copy = document.createElement('div');
    copy.className = 'dialog-copy';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = `${product.category} / NXR-${product.id}`;

    const heading = document.createElement('h2');
    heading.textContent = product.name;

    const description = document.createElement('p');
    description.textContent = product.description;

    const stock = document.createElement('p');
    stock.textContent = product.stock > 0
      ? `${product.stock} unidades disponíveis`
      : 'Produto indisponível no momento.';

    const price = document.createElement('strong');
    price.className = 'dialog-price';
    price.textContent = money(product.price);

    const add = document.createElement('button');
    add.className = 'button button-dark';
    add.type = 'button';
    add.disabled = product.stock <= 0;
    add.textContent = product.stock > 0
      ? 'Adicionar ao carrinho +'
      : 'Sem estoque';

    add.addEventListener('click', () => {
      addToCart(product.id);
      ui.dialog.close();
    });

    const wish = document.createElement('button');
    wish.className = 'wishlist-dialog-toggle';
    wish.type = 'button';
    wish.addEventListener('click', () => toggleWishlist(product.id));
    updateWishlistToggle(wish, product.id);

    copy.append(eyebrow, heading, description, stock, price, add, wish);
    wrap.append(copy);
    ui.dialogContent.append(wrap);

    if (!ui.dialog.open) {
      ui.dialog.showModal();
    }
  } catch (error) {
    toast(`Não foi possível carregar os detalhes: ${error.message}`);
  }
}

/* Carrinho */

function addToCart(id) {
  const product = productById(id);

  if (!product || product.stock <= 0) {
    toast('Produto indisponível.');
    return;
  }

  const item = state.cart.find(entry => entry.id === id);

  if (item) {
    if (item.quantity >= product.stock) {
      toast('Limite de estoque atingido.');
      return;
    }

    item.quantity++;
  } else {
    state.cart.push({ id, quantity: 1 });
  }

  saveCart();
  renderCart();
  toast(`${product.name} adicionado ao carrinho.`);
}

function changeQty(id, delta) {
  const item = state.cart.find(entry => entry.id === id);
  const product = productById(id);

  if (!item || !product) return;

  const next = item.quantity + delta;

  if (next < 1) {
    removeItem(id);
    return;
  }

  if (next > product.stock) {
    toast('Quantidade máxima disponível atingida.');
    return;
  }

  item.quantity = next;

  saveCart();
  renderCart();
}

function removeItem(id) {
  state.cart = state.cart.filter(item => item.id !== id);

  saveCart();
  renderCart();

  toast('Item removido do carrinho.');
}

function renderCart() {
  const items = state.cart
    .map(item => ({
      ...item,
      product: productById(item.id)
    }))
    .filter(item => item.product);

  const count = items.reduce(
    (sum, item) => sum + item.quantity, 0
  );

  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity, 0
  );

  $('cart-count').textContent = count;
  ui.cartTitleCount.textContent = `(${count})`;
  ui.subtotal.textContent = money(total);

  ui.cartItems.replaceChildren();

  ui.cartEmpty.hidden = items.length > 0;
  ui.cartSummary.hidden = items.length === 0;

  for (const item of items) {
    const product = item.product;

    const row = document.createElement('article');
    row.className = 'cart-row';

    row.append(makeImage(product.image, product.name, 'cart-image'));

    const info = document.createElement('div');

    const category = document.createElement('div');
    category.className = 'cart-category';
    category.textContent = product.category;

    const title = document.createElement('h3');
    title.textContent = product.name;

    const price = document.createElement('div');
    price.className = 'cart-price';
    price.textContent = money(product.price * item.quantity);

    const qty = document.createElement('div');
    qty.className = 'quantity-control';

    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.setAttribute('aria-label', `Diminuir ${product.name}`);
    minus.addEventListener('click', () => changeQty(item.id, -1));

    const amount = document.createElement('span');
    amount.textContent = item.quantity;

    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.disabled = item.quantity >= product.stock;
    plus.setAttribute('aria-label', `Aumentar ${product.name}`);
    plus.addEventListener('click', () => changeQty(item.id, 1));

    qty.append(minus, amount, plus);
    info.append(category, title, price, qty);

    const remove = document.createElement('button');
    remove.className = 'remove-item';
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remover ${product.name}`);
    remove.addEventListener('click', () => removeItem(item.id));

    row.append(info, remove);
    ui.cartItems.append(row);
  }
}

function renderWishlist() {
  const products = state.wishlist
    .map(productById)
    .filter(Boolean);

  ui.wishlistCount.textContent = products.length;
  ui.wishlistTitleCount.textContent = `(${products.length})`;
  ui.wishlistItems.replaceChildren();
  ui.wishlistEmpty.hidden = products.length > 0;

  for (const product of products) {
    const row = document.createElement('article');
    row.className = 'wishlist-row';
    row.append(makeImage(product.image, product.name, 'wishlist-image'));

    const info = document.createElement('div');
    const category = document.createElement('div');
    category.className = 'wishlist-category';
    category.textContent = product.category;

    const title = document.createElement('h3');
    title.textContent = product.name;

    const price = document.createElement('p');
    price.className = 'wishlist-price';
    price.textContent = money(product.price);

    const details = document.createElement('a');
    details.href = `/produto/${product.id}`;
    details.textContent = 'Ver produto';

    const add = document.createElement('button');
    add.className = 'details-link';
    add.type = 'button';
    add.textContent = 'Adicionar ao carrinho';
    add.addEventListener('click', () => addToCart(product.id));

    info.append(category, title, price, details, add);

    const remove = document.createElement('button');
    remove.className = 'remove-item';
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remover ${product.name} da lista`);
    remove.addEventListener('click', () => toggleWishlist(product.id));

    row.append(info, remove);
    ui.wishlistItems.append(row);
  }
}

/* Navegação do carrinho */

function openCart() {
  if (ui.wishlistDrawer.classList.contains('open')) closeWishlist();
  ui.overlay.hidden = false;
  ui.drawer.classList.add('open');
  ui.drawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('drawer-open');

  $('close-cart').focus();
}

function closeCart() {
  ui.drawer.classList.remove('open');
  ui.drawer.setAttribute('aria-hidden', 'true');
  ui.overlay.hidden = true;
  document.body.classList.remove('drawer-open');

  $('open-cart').focus();
}

function openWishlist() {
  if (ui.drawer.classList.contains('open')) closeCart();
  ui.wishlistOverlay.hidden = false;
  ui.wishlistDrawer.classList.add('open');
  ui.wishlistDrawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('drawer-open');
  $('close-wishlist').focus();
}

function closeWishlist() {
  ui.wishlistDrawer.classList.remove('open');
  ui.wishlistDrawer.setAttribute('aria-hidden', 'true');
  ui.wishlistOverlay.hidden = true;
  document.body.classList.remove('drawer-open');
  $('open-wishlist').focus();
}

/* Eventos */

let searchTimer;

function syncSearch(value) {
  state.query = value;

  if (ui.search.value !== value) {
    ui.search.value = value;
  }

  if (ui.headerSearch.value !== value) {
    ui.headerSearch.value = value;
  }

  clearTimeout(searchTimer);
  searchTimer = setTimeout(refresh, 180);
}

ui.search.addEventListener('input', event => {
  syncSearch(event.target.value);
});

ui.headerSearch.addEventListener('input', event => {
  syncSearch(event.target.value);
});

ui.category.addEventListener('change', event => {
  state.category = event.target.value;
  refresh();
});

ui.sort.addEventListener('change', event => {
  state.sort = event.target.value;
  refresh();
});

ui.retry.addEventListener('click', init);

$('open-cart').addEventListener('click', openCart);
$('close-cart').addEventListener('click', closeCart);
ui.overlay.addEventListener('click', closeCart);
$('open-wishlist').addEventListener('click', openWishlist);
$('close-wishlist').addEventListener('click', closeWishlist);
ui.wishlistOverlay.addEventListener('click', closeWishlist);

$('continue-shopping').addEventListener('click', () => {
  closeCart();
  $('catalogo').scrollIntoView({ behavior: 'smooth' });
});

$('continue-wishlist').addEventListener('click', () => {
  closeWishlist();
  $('catalogo').scrollIntoView({ behavior: 'smooth' });
});

$('close-dialog').addEventListener('click', () => {
  ui.dialog.close();
});

ui.dialog.addEventListener('click', event => {
  if (event.target === ui.dialog) {
    ui.dialog.close();
  }
});

document.addEventListener('keydown', event => {
  if (
    event.key === 'Escape' &&
    ui.drawer.classList.contains('open')
  ) {
    closeCart();
  } else if (
    event.key === 'Escape' &&
    ui.wishlistDrawer.classList.contains('open')
  ) {
    closeWishlist();
  }
});

/* Inicialização final */

renderCart();
init();
