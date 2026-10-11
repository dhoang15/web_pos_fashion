// JS riêng của trang POS / Sales (dữ liệu mẫu, sau này thay bằng API)
(() => {
    const root = document.getElementById('view-pos');
    if (!root) {
        console.warn('[pos] Không thấy #view-pos (pos.html chưa nạp?)');
        return;
    }
    if (!window.Store) {
        console.warn('[pos] Không thấy Store (assets/js/store.js chưa được nạp trước pos.js?)');
        return;
    }

    // ---------- Cấu hình ----------
    const TAX_RATE = 0.1;                       // VAT 10% (sau này đọc từ Settings > Invoice)
    const PROMOS = { NEWUSER: 10, BTRIPLE5: 5 }; // mã -> % giảm
    const SIZES = [38, 39, 40, 41, 42, 43, 44, 45];
    const DEFAULT_SIZE = 42;
    const LOW_STOCK = Store.LOW_STOCK;

    // Sản phẩm lấy từ kho dùng chung (assets/js/store.js), được quản lý ở trang Products.
    const all = () => Store.getProducts();
    const byId = (id) => Store.getProduct(id);
    const categories = () => Store.categories();

    // Ảnh sản phẩm; chưa có ảnh thì hiện khung icon
    const imgHTML = (p, cls, alt = '') => p.img
        ? `<img src="${esc(p.img)}" alt="${esc(alt)}" loading="lazy" class="${cls}">`
        : `<div class="${cls} flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600"><i class="fas fa-shoe-prints text-2xl"></i></div>`;

    // ---------- Trạng thái ----------
    const state = {
        cat: '',         // '' = tất cả danh mục
        q: '',
        cart: [],        // [{ id, size, qty }]
        promo: null,     // { code, pct }
        pay: 'cash',
    };
    let lang = localStorage.getItem('lang') || 'en';

    // ---------- Tiện ích ----------
    const $ = (id) => document.getElementById(id);
    const el = {
        tabs: $('posTabs'), grid: $('posGrid'), empty: $('posEmpty'), search: $('posSearch'),
        cartList: $('posCartList'), cartCount: $('posCartCount'), clear: $('posClear'),
        promo: $('posPromo'), promoMsg: $('posPromoMsg'),
        subtotal: $('posSubtotal'), taxLabel: $('posTaxLabel'), tax: $('posTax'),
        discount: $('posDiscount'), total: $('posTotal'), checkout: $('posCheckout'),
    };

    const fmt = (n) => n.toLocaleString('vi-VN') + ' ₫';
    const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const t = (key, vars = {}) => {
        const dict = translations[lang] || translations.en || {};
        const str = dict[key] ?? (translations.en && translations.en[key]) ?? key;
        return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
    };

    const inCart = (id) => state.cart.filter(l => l.id === id).reduce((s, l) => s + l.qty, 0);
    const remaining = (p) => p.stock - inCart(p.id);
    const cartQty = () => state.cart.reduce((s, l) => s + l.qty, 0);

    const calc = () => {
        const sub = state.cart.reduce((s, l) => s + byId(l.id).price * l.qty, 0);
        const discount = state.promo ? Math.round(sub * state.promo.pct / 100) : 0;
        const base = sub - discount;
        const tax = Math.round(base * TAX_RATE);
        return { sub, discount, tax, total: base + tax };
    };

    // ---------- Render: tabs + sản phẩm ----------
    const renderTabs = () => {
        // Danh mục bị xóa/đổi tên ở Products -> quay về "Tất cả"
        if (state.cat && !categories().includes(state.cat)) state.cat = '';
        el.tabs.innerHTML = ['', ...categories()].map(c => {
            const count = c === '' ? all().length : all().filter(p => p.category === c).length;
            const active = state.cat === c;
            const label = c === '' ? t('pos_cat_all') : c;
            return `<button type="button" data-act="cat" data-id="${esc(c)}"
                class="flex items-center gap-2.5 px-5 py-3 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${active
                    ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-orange-300'}">
                ${esc(label)}
                <span class="px-2 py-0.5 rounded-full text-[11px] ${active ? 'bg-white/25 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}">${count}</span>
            </button>`;
        }).join('');
    };

    const cardHTML = (p) => {
        const left = remaining(p);
        const out = left <= 0;
        const low = !out && left <= LOW_STOCK;
        const badge = out ? t('pos_out_of_stock') : t('pos_stock_left', { n: left });
        return `<article class="pos-card bg-white dark:bg-gray-800/40 rounded-3xl p-4 border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col">
            <div class="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-[4/3]">
                ${imgHTML(p, 'w-full h-full object-cover ' + (out ? 'grayscale opacity-60' : ''), p.name)}
                <span class="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-bold text-white ${out ? 'bg-red-500' : low ? 'bg-orange-500' : 'bg-gray-900/85'}">${esc(badge)}</span>
            </div>
            <div class="px-1 pt-4 flex-1 flex flex-col">
                <h4 class="font-extrabold text-sm text-gray-900 dark:text-white leading-snug pos-clamp-2">${esc(p.name)}</h4>
                <p class="text-xs leading-relaxed text-gray-400 mt-1.5 pos-clamp-2">${esc(p.desc || '')}</p>
                <p class="mt-auto pt-4 font-extrabold text-base text-gray-900 dark:text-white">${fmt(p.price)}</p>
            </div>
            <button type="button" data-act="add" data-id="${p.id}" ${out ? 'disabled' : ''}
                class="mt-4 w-full py-3 rounded-2xl text-xs font-extrabold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-orange-500 hover:border-orange-500 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-700 dark:disabled:hover:text-gray-200 disabled:hover:border-gray-200">
                <i class="fas fa-plus mr-2"></i>${esc(t('pos_add'))}
            </button>
        </article>`;
    };

    const renderProducts = () => {
        const q = state.q.trim().toLowerCase();
        const list = all().filter(p =>
            (state.cat === '' || p.category === state.cat) && p.name.toLowerCase().includes(q));
        el.grid.innerHTML = list.map(cardHTML).join('');
        el.empty.classList.toggle('hidden', list.length > 0);
    };

    // ---------- Render: giỏ hàng ----------
    const lineHTML = (l, i) => {
        const p = byId(l.id);
        const canInc = remaining(p) > 0;
        return `<li class="flex gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
            ${imgHTML(p, 'w-[72px] h-[72px] rounded-xl object-cover flex-shrink-0')}
            <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                    <p class="font-bold text-sm text-gray-900 dark:text-white leading-snug pos-clamp-2">${esc(p.name)}</p>
                    <button type="button" data-act="remove" data-i="${i}" aria-label="${esc(t('pos_remove'))}" class="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <select data-act="size" data-i="${i}" aria-label="${esc(t('pos_size'))}"
                    class="pos-size mt-2 pl-3 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 focus:outline-none focus:border-orange-500">
                    ${SIZES.map(s => `<option value="${s}" ${s === l.size ? 'selected' : ''}>${esc(t('pos_size'))} ${s}</option>`).join('')}
                </select>
                <div class="flex items-center justify-between mt-3">
                    <div class="flex items-center gap-1.5">
                        <button type="button" data-act="dec" data-i="${i}" aria-label="${esc(t('pos_decrease'))}"
                            class="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-orange-400 hover:text-orange-500 transition-colors"><i class="fas fa-minus text-[10px]"></i></button>
                        <span class="pos-qty-num text-sm font-extrabold text-gray-900 dark:text-white">${String(l.qty).padStart(2, '0')}</span>
                        <button type="button" data-act="inc" data-i="${i}" ${canInc ? '' : 'disabled'} aria-label="${esc(t('pos_increase'))}"
                            class="w-7 h-7 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-orange-500"><i class="fas fa-plus text-[10px]"></i></button>
                    </div>
                    <span class="font-extrabold text-sm text-gray-900 dark:text-white">${fmt(p.price * l.qty)}</span>
                </div>
            </div>
        </li>`;
    };

    const renderCart = () => {
        if (state.cart.length === 0) {
            el.cartList.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-center py-8 px-4">
                <div class="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center mb-3">
                    <i class="fas fa-shopping-bag text-xl"></i>
                </div>
                <p class="font-extrabold text-sm text-gray-900 dark:text-white">${esc(t('pos_cart_empty'))}</p>
                <p class="text-xs text-gray-400 mt-1">${esc(t('pos_cart_empty_desc'))}</p>
            </div>`;
        } else {
            el.cartList.innerHTML = `<ul class="space-y-4 pb-1">${state.cart.map(lineHTML).join('')}</ul>`;
        }
        el.cartCount.textContent = t('pos_cart_items', { n: cartQty() });
        el.clear.classList.toggle('hidden', state.cart.length === 0);
    };

    const renderSummary = () => {
        const c = calc();
        el.subtotal.textContent = fmt(c.sub);
        el.taxLabel.textContent = t('pos_tax', { n: Math.round(TAX_RATE * 100) });
        el.tax.textContent = fmt(c.tax);
        el.discount.textContent = c.discount ? '−' + fmt(c.discount) : fmt(0);
        el.total.textContent = fmt(c.total);
        el.checkout.disabled = state.cart.length === 0;
    };

    const renderPromoMsg = (invalid = false) => {
        const msg = el.promoMsg;
        msg.classList.remove('text-emerald-600', 'dark:text-emerald-400', 'text-red-500');
        if (invalid) {
            msg.textContent = t('pos_promo_invalid');
            msg.classList.add('text-red-500');
            msg.classList.remove('hidden');
        } else if (state.promo) {
            msg.textContent = t('pos_promo_applied', { code: state.promo.code, pct: state.promo.pct });
            msg.classList.add('text-emerald-600', 'dark:text-emerald-400');
            msg.classList.remove('hidden');
        } else {
            msg.classList.add('hidden');
        }
    };

    const renderPay = () => {
        root.querySelectorAll('.pos-pay').forEach(btn =>
            btn.classList.toggle('is-active', btn.dataset.method === state.pay));
    };

    const applyStaticText = () => {
        el.search.placeholder = t('pos_search');
        el.promo.placeholder = t('pos_promo_placeholder');
    };

    const renderAll = () => {
        applyStaticText();
        renderTabs();
        renderProducts();
        renderCart();
        renderSummary();
        renderPromoMsg();
        renderPay();
    };

    // Thay đổi giỏ -> vẽ lại phần bị ảnh hưởng (số tồn kho trên thẻ thay đổi theo giỏ)
    const cartChanged = () => {
        renderProducts();
        renderCart();
        renderSummary();
    };

    // ---------- Thao tác giỏ hàng ----------
    const addToCart = (id) => {
        const p = byId(id);
        if (!p || remaining(p) <= 0) return;
        const line = state.cart.find(l => l.id === id && l.size === DEFAULT_SIZE);
        if (line) line.qty += 1;
        else state.cart.push({ id, size: DEFAULT_SIZE, qty: 1 });
        cartChanged();
    };

    const changeQty = (i, delta) => {
        const line = state.cart[i];
        if (!line) return;
        if (delta > 0 && remaining(byId(line.id)) <= 0) return;
        line.qty += delta;
        if (line.qty <= 0) state.cart.splice(i, 1);
        cartChanged();
    };

    const changeSize = (i, size) => {
        const line = state.cart[i];
        if (!line) return;
        line.size = size;
        // Cùng sản phẩm + cùng size thì gộp dòng
        const other = state.cart.findIndex((l, j) => j !== i && l.id === line.id && l.size === size);
        if (other !== -1) {
            state.cart[other].qty += line.qty;
            state.cart.splice(i, 1);
        }
        cartChanged();
    };

    const removeLine = (i) => {
        state.cart.splice(i, 1);
        cartChanged();
    };

    const clearCart = () => {
        state.cart = [];
        cartChanged();
    };

    const applyPromo = () => {
        const code = el.promo.value.trim().toUpperCase();
        if (!code) {
            state.promo = null;
            renderPromoMsg();
        } else if (PROMOS[code]) {
            state.promo = { code, pct: PROMOS[code] };
            renderPromoMsg();
        } else {
            state.promo = null;
            renderPromoMsg(true);
        }
        renderSummary();
    };

    const checkout = () => {
        if (state.cart.length === 0) return;
        const lines = state.cart.map(l => ({ id: l.id, qty: l.qty }));
        state.cart = [];
        state.promo = null;
        el.promo.value = '';
        // Trừ tồn kho thật trong kho dùng chung -> trang Products tự cập nhật theo
        Store.adjustStock(lines);
        renderAll();
        if (typeof window.showToast === 'function') window.showToast('pos_toast_paid');
    };

    // ---------- Sự kiện ----------
    root.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-act]');
        if (!btn || btn.disabled || btn.tagName === 'SELECT') return;
        const i = Number(btn.dataset.i);
        switch (btn.dataset.act) {
            case 'cat':         state.cat = btn.dataset.id; renderTabs(); renderProducts(); break;
            case 'add':         addToCart(btn.dataset.id); break;
            case 'inc':         changeQty(i, 1); break;
            case 'dec':         changeQty(i, -1); break;
            case 'remove':      removeLine(i); break;
            case 'clear':       clearCart(); break;
            case 'promo-apply': applyPromo(); break;
            case 'pay':         state.pay = btn.dataset.method; renderPay(); break;
            case 'checkout':    checkout(); break;
        }
    });

    root.addEventListener('change', (e) => {
        if (e.target.dataset.act === 'size') changeSize(Number(e.target.dataset.i), Number(e.target.value));
    });

    el.search.addEventListener('input', () => {
        state.q = el.search.value;
        renderProducts();
    });

    el.promo.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); applyPromo(); }
    });

    // Đổi ngôn ngữ ở Settings -> vẽ lại phần chữ do JS tạo.
    // Dùng e.target.value vì listener này chạy trước listener của settings.js (chưa kịp ghi localStorage).
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            lang = e.target.value;
            renderAll();
        });
    }

    // Giỏ hàng khớp lại với kho: sản phẩm bị xóa thì bỏ khỏi giỏ, tồn kho giảm thì hạ số lượng
    const reconcileCart = () => {
        const used = {};
        state.cart = state.cart.filter(l => {
            const p = byId(l.id);
            if (!p) return false;
            const left = p.stock - (used[l.id] || 0);
            if (left <= 0) return false;
            l.qty = Math.min(l.qty, left);
            used[l.id] = (used[l.id] || 0) + l.qty;
            return true;
        });
    };

    // Trang Products (hoặc tab khác) đổi dữ liệu -> đồng bộ lại POS
    document.addEventListener('store:products', () => {
        reconcileCart();
        renderAll();
    });

    renderAll();
})();