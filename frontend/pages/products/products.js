// JS riêng của trang Products / Items.
// Dữ liệu nằm trong kho dùng chung (assets/js/store.js) nên POS tự cập nhật theo trang này.
(() => {
    const root = document.getElementById('view-products');
    if (!root) {
        console.warn('[products] Không thấy #view-products (products.html chưa nạp?)');
        return;
    }
    if (!window.Store) {
        console.warn('[products] Không thấy Store (assets/js/store.js chưa được nạp trước products.js?)');
        return;
    }

    // ---------- Cấu hình ----------
    const MAX_IMG_SIDE = 640;                 // ảnh upload được thu nhỏ còn tối đa 640px
    const MAX_IMG_BYTES = 10 * 1024 * 1024;   // chặn file ảnh quá lớn trước khi xử lý
    const MAX_CSV_BYTES = 2 * 1024 * 1024;
    const DEFAULT_CATEGORY = 'Other';         // danh mục mặc định khi CSV không có cột category

    const state = { q: '', cat: '', editingId: null };
    let formImg = '';                         // ảnh đang chọn trong form ('' = không có)
    let lang = localStorage.getItem('lang') || 'en';
    let lastFocus = null;
    let noticeTimer = null;

    // ---------- Tiện ích ----------
    const $ = (id) => document.getElementById(id);
    const el = {
        body: $('prodBody'), empty: $('prodEmpty'), search: $('prodSearch'), category: $('prodCategory'),
        listTitle: $('prodListTitle'), notice: $('prodNotice'), noticeText: $('prodNoticeText'),
        importFile: $('prodImportFile'),
        modal: $('prodModal'), form: $('prodForm'), formTitle: $('prodFormTitle'), submit: $('prodSubmit'),
        name: $('prodName'), cat: $('prodCat'), catList: $('prodCatList'), price: $('prodPrice'), stock: $('prodStock'), desc: $('prodDesc'),
        errName: $('prodErrName'), errCat: $('prodErrCat'), errPrice: $('prodErrPrice'), errStock: $('prodErrStock'), errImg: $('prodErrImg'),
        imgPreview: $('prodImgPreview'), imgRemove: $('prodImgRemove'), imgFile: $('prodImgFile'),
    };

    const fmt = (n) => n.toLocaleString('vi-VN') + ' ₫';
    const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
    const toast = (key) => { if (typeof window.showToast === 'function') window.showToast(key); };

    const t = (key, vars = {}) => {
        const dict = translations[lang] || translations.en || {};
        const str = dict[key] ?? (translations.en && translations.en[key]) ?? key;
        return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
    };

    // "4590000" hoặc "4.590.000" hoặc "4,590,000" -> 4590000; sai định dạng -> NaN
    const parseMoney = (v) => {
        const s = String(v).trim().replace(/\s/g, '');
        if (/^\d+$/.test(s)) return Number(s);
        if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ''));
        return NaN;
    };
    const parseCount = (v) => {
        const s = String(v).trim();
        return /^\d+$/.test(s) ? Number(s) : NaN;
    };

    // ---------- Render ----------
    const thumbHTML = (p) => p.img
        ? `<img src="${esc(p.img)}" alt="" loading="lazy">`
        : '<i class="fas fa-shoe-prints"></i>';

    const rowHTML = (p) => {
        const st = Store.statusOf(p);
        return `<tr>
            <td>
                <div class="flex items-center gap-3">
                    <span class="prod-thumb">${thumbHTML(p)}</span>
                    <span class="font-bold text-gray-900 dark:text-white">${esc(p.name)}</span>
                </div>
            </td>
            <td class="text-gray-500 dark:text-gray-400">${p.category ? esc(p.category) : '—'}</td>
            <td class="text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">${fmt(p.price)}</td>
            <td class="text-gray-700 dark:text-gray-300">${p.stock.toLocaleString('vi-VN')}</td>
            <td><span class="prod-badge prod-status-${st}">${esc(t('prod_status_' + st))}</span></td>
            <td class="whitespace-nowrap">
                <button type="button" data-act="edit" data-id="${esc(p.id)}" class="prod-icon-btn" aria-label="${esc(t('prod_edit'))}"><i class="far fa-pen-to-square"></i></button>
                <button type="button" data-act="delete" data-id="${esc(p.id)}" class="prod-icon-btn is-danger" aria-label="${esc(t('prod_delete'))}"><i class="far fa-trash-can"></i></button>
            </td>
        </tr>`;
    };

    const renderCategories = () => {
        const cats = Store.categories();
        if (state.cat && !cats.includes(state.cat)) state.cat = '';   // danh mục không còn -> về "Tất cả"
        el.category.innerHTML = [`<option value="">${esc(t('prod_all'))}</option>`]
            .concat(cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`)).join('');
        el.category.value = state.cat;
        el.catList.innerHTML = cats.map(c => `<option value="${esc(c)}"></option>`).join('');
    };

    const renderTable = () => {
        const q = norm(state.q.trim());
        const list = Store.getProducts().filter(p =>
            (state.cat === '' || p.category === state.cat) &&
            (!q || norm(p.name).includes(q) || norm(p.category).includes(q)));
        el.body.innerHTML = list.map(rowHTML).join('');
        el.empty.classList.toggle('hidden', list.length > 0);
        el.listTitle.textContent = t('prod_list_title', { n: list.length });
    };

    const applyStaticText = () => {
        el.search.placeholder = t('prod_search');
        root.querySelectorAll('[data-i18n-aria]').forEach(n => n.setAttribute('aria-label', t(n.dataset.i18nAria)));
        const editing = state.editingId !== null;
        el.formTitle.textContent = t(editing ? 'prod_form_edit_title' : 'prod_form_add_title');
        el.submit.textContent = t(editing ? 'prod_save_edit' : 'prod_add');
    };

    const renderAll = () => {
        applyStaticText();
        renderCategories();
        renderTable();
    };

    // ---------- Thông báo ----------
    const hideNotice = () => {
        clearTimeout(noticeTimer);
        el.notice.classList.add('hidden');
        el.notice.classList.remove('flex');
    };
    const showNotice = (msg, kind = 'success') => {
        clearTimeout(noticeTimer);
        el.notice.classList.remove('is-success', 'is-error');
        el.notice.classList.add(kind === 'error' ? 'is-error' : 'is-success', 'flex');
        el.notice.classList.remove('hidden');
        el.noticeText.textContent = msg;
        noticeTimer = setTimeout(hideNotice, 8000);
    };

    // ---------- Modal ----------
    const isOpen = () => !el.modal.classList.contains('hidden');
    const showModal = () => {
        lastFocus = document.activeElement;
        el.modal.classList.remove('hidden');
        el.modal.classList.add('flex');
    };
    const hideModal = () => {
        el.modal.classList.add('hidden');
        el.modal.classList.remove('flex');
        state.editingId = null;
        applyStaticText();
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    };

    const setError = (input, errEl, msg) => {
        errEl.textContent = msg || '';
        errEl.classList.toggle('hidden', !msg);
        if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    };
    const clearErrors = () => {
        setError(el.name, el.errName, '');
        setError(el.cat, el.errCat, '');
        setError(el.price, el.errPrice, '');
        setError(el.stock, el.errStock, '');
        setError(null, el.errImg, '');
    };

    const renderImgPreview = () => {
        el.imgPreview.innerHTML = formImg
            ? `<img src="${esc(formImg)}" alt="">`
            : '<i class="far fa-image"></i>';
        el.imgRemove.classList.toggle('hidden', !formImg);
    };

    const openForm = (id = null) => {
        state.editingId = id;
        const p = id !== null ? Store.getProduct(id) : null;
        el.form.reset();
        clearErrors();
        el.name.value = p ? p.name : '';
        el.cat.value = p ? p.category : '';
        el.price.value = p ? String(p.price) : '';
        el.stock.value = p ? String(p.stock) : '';
        el.desc.value = p ? p.desc : '';
        formImg = p ? p.img : '';
        renderImgPreview();
        applyStaticText();
        showModal();
        el.name.focus();
    };

    // Thu nhỏ ảnh upload rồi đổi sang data URL để lưu trong localStorage
    const readImage = (file) => new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) return reject(new Error('type'));
        if (file.size > MAX_IMG_BYTES) return reject(new Error('size'));
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, MAX_IMG_SIDE / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';              // ảnh PNG trong suốt -> nền trắng
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load')); };
        img.src = url;
    });

    const onPickImage = async () => {
        const file = el.imgFile.files && el.imgFile.files[0];
        el.imgFile.value = '';
        if (!file) return;
        setError(null, el.errImg, '');
        try {
            formImg = await readImage(file);
            renderImgPreview();
        } catch (err) {
            setError(null, el.errImg, t(err.message === 'size' ? 'prod_err_img_size' : 'prod_err_img'));
        }
    };

    const validate = () => {
        clearErrors();
        let ok = true;
        const name = el.name.value.trim().replace(/\s+/g, ' ');
        const category = el.cat.value.trim();
        const price = parseMoney(el.price.value);
        const stock = parseCount(el.stock.value);

        if (!name) {
            setError(el.name, el.errName, t('prod_err_name')); ok = false;
        } else {
            const dup = Store.findByName(name);
            if (dup && dup.id !== state.editingId) { setError(el.name, el.errName, t('prod_err_name_dup')); ok = false; }
        }
        if (!category) { setError(el.cat, el.errCat, t('prod_err_category')); ok = false; }
        if (!Number.isSafeInteger(price) || price <= 0) { setError(el.price, el.errPrice, t('prod_err_price')); ok = false; }
        if (!Number.isSafeInteger(stock) || stock < 0) { setError(el.stock, el.errStock, t('prod_err_stock')); ok = false; }

        if (!ok) {
            const bad = [el.name, el.cat, el.price, el.stock].find(i => i.getAttribute('aria-invalid') === 'true');
            if (bad) bad.focus();
        }
        return ok;
    };

    const saveForm = () => {
        if (!validate()) return;
        const data = {
            name: el.name.value,
            category: el.cat.value,
            price: parseMoney(el.price.value),
            stock: parseCount(el.stock.value),
            desc: el.desc.value,
            img: formImg,
        };
        const editing = state.editingId !== null;
        if (editing) Store.updateProduct(state.editingId, data);
        else {
            // Xóa bộ lọc để sản phẩm vừa thêm luôn hiện trong bảng
            state.q = ''; state.cat = ''; el.search.value = '';
            Store.addProduct(data);
        }
        hideModal();
        toast(editing ? 'prod_toast_updated' : 'prod_toast_added');
    };

    const deleteProduct = (id) => {
        const p = Store.getProduct(id);
        if (!p) return;
        if (!window.confirm(t('prod_confirm_delete', { name: p.name }))) return;
        Store.removeProduct(id);
        toast('prod_toast_deleted');
    };

    // ---------- CSV: xuất ----------
    const csvCell = (v, isText = false) => {
        let s = String(v ?? '');
        if (isText && /^[=+\-@\t\r]/.test(s)) s = "'" + s;   // chống công thức độc hại khi mở bằng Excel
        return /[",\r\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };

    const exportCSV = () => {
        const products = Store.getProducts();
        if (products.length === 0) { showNotice(t('prod_export_empty'), 'error'); return; }
        const rows = [['name', 'category', 'price', 'stock', 'description']].concat(
            products.map(p => [csvCell(p.name, true), csvCell(p.category, true), p.price, p.stock, csvCell(p.desc, true)]));
        // BOM để Excel đọc đúng tiếng Việt
        const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showNotice(t('prod_export_ok', { n: products.length }));
    };

    // ---------- CSV: nhập ----------
    const parseCSV = (input) => {
        const text = input.replace(/^\uFEFF/, '');
        const first = text.split(/\r?\n/, 1)[0];
        const delim = first.split(';').length > first.split(',').length ? ';' : ',';   // Excel tiếng Việt hay dùng ;
        const rows = [];
        let row = [], cell = '', inQ = false;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (inQ) {
                if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false; }
                else cell += ch;
            } else if (ch === '"' && cell === '') inQ = true;   // chỉ mở trích dẫn ở đầu ô; dấu " giữa ô giữ nguyên
            else if (ch === delim) { row.push(cell); cell = ''; }
            else if (ch === '\n' || ch === '\r') {
                if (ch === '\r' && text[i + 1] === '\n') i++;
                row.push(cell); cell = ''; rows.push(row); row = [];
            } else cell += ch;
        }
        if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
        return rows.filter(r => r.some(c => c.trim() !== ''));
    };

    const COLS = {
        name:     ['name', 'product', 'productname', 'ten', 'tensanpham', 'tensp'],
        category: ['category', 'danhmuc', 'loai', 'nhom'],
        price:    ['price', 'gia', 'dongia'],
        stock:    ['stock', 'qty', 'quantity', 'soluong', 'tonkho'],
        desc:     ['description', 'desc', 'mota'],
    };

    const importCSV = async (file) => {
        if (file.size > MAX_CSV_BYTES) { showNotice(t('prod_import_big'), 'error'); return; }
        let table;
        try { table = parseCSV(await file.text()); }
        catch (err) { showNotice(t('prod_import_fail'), 'error'); return; }
        if (table.length < 2) { showNotice(t('prod_import_none'), 'error'); return; }

        const header = table[0].map(h => norm(h).replace(/[^a-z]/g, ''));
        const idx = {};
        Object.entries(COLS).forEach(([key, aliases]) => { idx[key] = header.findIndex(h => aliases.includes(h)); });
        if (idx.name < 0 || idx.price < 0) { showNotice(t('prod_import_header'), 'error'); return; }

        const good = [];
        let skipped = 0;
        table.slice(1).forEach(r => {
            const cell = (k) => (idx[k] >= 0 ? (r[idx[k]] ?? '').trim() : '');
            const name = cell('name');
            const price = parseMoney(cell('price'));
            const stock = idx.stock >= 0 && cell('stock') !== '' ? parseCount(cell('stock')) : 0;
            if (!name || !Number.isSafeInteger(price) || price <= 0 || !Number.isSafeInteger(stock)) { skipped++; return; }
            good.push({ name, category: cell('category') || DEFAULT_CATEGORY, price, stock, desc: cell('desc') });
        });

        if (good.length === 0) { showNotice(t('prod_import_none'), 'error'); return; }
        const { added, updated } = Store.upsertMany(good);
        showNotice(t('prod_import_ok', { added, updated, skipped }));
    };

    // ---------- Sự kiện ----------
    root.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        switch (btn.dataset.act) {
            case 'add':          openForm(); break;
            case 'edit':         openForm(btn.dataset.id); break;
            case 'delete':       deleteProduct(btn.dataset.id); break;
            case 'import':       el.importFile.click(); break;
            case 'export':       exportCSV(); break;
            case 'close-form':   hideModal(); break;
            case 'close-notice': hideNotice(); break;
            case 'pick-image':   el.imgFile.click(); break;
            case 'remove-image': formImg = ''; renderImgPreview(); break;
        }
    });

    el.form.addEventListener('submit', (e) => { e.preventDefault(); saveForm(); });
    el.imgFile.addEventListener('change', onPickImage);
    el.importFile.addEventListener('change', () => {
        const file = el.importFile.files && el.importFile.files[0];
        el.importFile.value = '';   // cho phép chọn lại cùng một file
        if (file) importCSV(file);
    });

    el.search.addEventListener('input', () => { state.q = el.search.value; renderTable(); });
    el.category.addEventListener('change', () => { state.cat = el.category.value; renderTable(); });

    // Esc đóng modal; Tab xoay vòng trong modal
    document.addEventListener('keydown', (e) => {
        if (!isOpen()) return;
        if (e.key === 'Escape') { hideModal(); return; }
        if (e.key === 'Tab') {
            const items = [...el.modal.querySelectorAll('button, input, textarea, select')]
                .filter(n => !n.disabled && n.type !== 'file' && n.getClientRects().length > 0);
            if (!items.length) return;
            const first = items[0], last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });

    // Dữ liệu đổi (từ trang này, từ POS khi bán hàng, hoặc từ tab khác) -> vẽ lại
    document.addEventListener('store:products', renderAll);
    document.addEventListener('store:error', () => showNotice(t('prod_err_storage'), 'error'));

    // Đổi ngôn ngữ ở Settings. Dùng e.target.value vì listener này chạy trước listener của settings.js.
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            lang = e.target.value;
            renderAll();
        });
    }

    renderAll();
})();