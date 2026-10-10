// JS riêng của trang Customers (dữ liệu mẫu, sau này thay bằng API)
(() => {
    const root = document.getElementById('view-customers');
    if (!root) {
        console.warn('[customers] Không thấy #view-customers (customers.html chưa nạp?)');
        return;
    }

    // ---------- Cấu hình ----------
    const TIER_SILVER = 5000000;   // tổng chi tiêu từ mức này: hạng Bạc
    const TIER_GOLD = 10000000;    // từ mức này: hạng Vàng
    const POINT_RATE = 10000;      // 10.000 ₫ = 1 điểm
    const PHONE_RE = /^(0|\+84)\d{9}$/;
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    let customers = [
        { id: 1, name: 'Nguyễn Văn An',  email: 'an.nguyen@example.com',  phone: '0901 111 222', purchases: 12, spent: 12500000, address: '12 Lê Lợi, Quận 1, TP.HCM',          notes: 'Mua Jordan 1 size 42, ưu tiên báo hàng mới.' },
        { id: 2, name: 'Trần Thị Bình',  email: 'binh.tran@example.com',  phone: '0902 333 444', purchases: 6,  spent: 6780000,  address: '45 Nguyễn Huệ, Quận 1, TP.HCM',      notes: '' },
        { id: 3, name: 'Lê Hoàng Cường', email: 'cuong.le@example.com',   phone: '0903 555 666', purchases: 2,  spent: 2150000,  address: '',                                    notes: '' },
        { id: 4, name: 'Phạm Minh Đức',  email: '',                       phone: '0904 777 888', purchases: 1,  spent: 870000,   address: '',                                    notes: 'Khách mua tại quầy.' },
        { id: 5, name: 'Võ Thu Hà',      email: 'ha.vo@example.com',      phone: '0905 999 000', purchases: 9,  spent: 10280000, address: '88 Điện Biên Phủ, Bình Thạnh, TP.HCM', notes: 'Thích phối màu đen đỏ.' },
    ];
    let nextId = customers.length + 1;

    const state = { q: '', editingId: null };
    let lang = localStorage.getItem('lang') || 'en';
    let lastFocus = null;

    // ---------- Tiện ích ----------
    const $ = (id) => document.getElementById(id);
    const el = {
        body: $('custBody'), empty: $('custEmpty'), search: $('custSearch'), listTitle: $('custListTitle'),
        statTotal: $('custStatTotal'), statGold: $('custStatGold'), statAvg: $('custStatAvg'), statPoints: $('custStatPoints'),
        formModal: $('custFormModal'), viewModal: $('custViewModal'), form: $('custForm'),
        formTitle: $('custFormTitle'), submit: $('custSubmit'), del: $('custDelete'),
        name: $('custName'), phone: $('custPhone'), email: $('custEmail'), address: $('custAddress'), notes: $('custNotes'),
        errName: $('custErrName'), errPhone: $('custErrPhone'), errEmail: $('custErrEmail'),
    };

    const fmt = (n) => n.toLocaleString('vi-VN') + ' ₫';
    const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    // Bỏ dấu tiếng Việt để tìm "cuong" ra "Cường"
    const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
    const cleanPhone = (s) => s.replace(/[\s.\-]/g, '');
    const formatPhone = (s) => {
        const d = cleanPhone(s).replace(/^\+84/, '0');
        return /^\d{10}$/.test(d) ? d.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3') : s.trim();
    };
    const initials = (name) => {
        const w = name.trim().split(/\s+/);
        return ((w[0] || '')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
    };

    const t = (key, vars = {}) => {
        const dict = translations[lang] || translations.en || {};
        const str = dict[key] ?? (translations.en && translations.en[key]) ?? key;
        return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
    };

    const tierOf = (spent) => spent >= TIER_GOLD ? 'gold' : spent >= TIER_SILVER ? 'silver' : 'bronze';
    const pointsOf = (spent) => Math.floor(spent / POINT_RATE);
    const byId = (id) => customers.find(c => c.id === id);

    // ---------- Render ----------
    const rowHTML = (c) => `<tr>
        <td class="text-gray-900 dark:text-white font-bold">${esc(c.name)}</td>
        <td>
            <div class="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <p><i class="far fa-envelope w-4 mr-1 text-gray-400"></i>${c.email ? esc(c.email) : '—'}</p>
                <p><i class="fas fa-phone w-4 mr-1 text-gray-400"></i>${esc(c.phone)}</p>
            </div>
        </td>
        <td class="text-gray-700 dark:text-gray-300">${c.purchases}</td>
        <td class="text-orange-600 dark:text-orange-400 font-bold">${pointsOf(c.spent).toLocaleString('vi-VN')}</td>
        <td class="text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">${fmt(c.spent)}</td>
        <td><span class="cust-badge cust-tier-${tierOf(c.spent)}">${esc(t('cus_tier_' + tierOf(c.spent)))}</span></td>
        <td class="whitespace-nowrap">
            <button type="button" data-act="view" data-id="${c.id}" class="cust-icon-btn" aria-label="${esc(t('cus_view'))}"><i class="far fa-eye"></i></button>
            <button type="button" data-act="edit" data-id="${c.id}" class="cust-icon-btn" aria-label="${esc(t('cus_edit'))}"><i class="far fa-pen-to-square"></i></button>
        </td>
    </tr>`;

    const renderStats = () => {
        const total = customers.length;
        const sum = customers.reduce((s, c) => s + c.spent, 0);
        el.statTotal.textContent = total.toLocaleString('vi-VN');
        el.statGold.textContent = customers.filter(c => tierOf(c.spent) === 'gold').length.toLocaleString('vi-VN');
        el.statAvg.textContent = fmt(total ? Math.round(sum / total) : 0);
        el.statPoints.textContent = customers.reduce((s, c) => s + pointsOf(c.spent), 0).toLocaleString('vi-VN');
    };

    const renderTable = () => {
        const q = norm(state.q.trim());
        const qDigits = cleanPhone(state.q.trim());
        const list = !q ? customers : customers.filter(c =>
            norm(c.name).includes(q) ||
            norm(c.email).includes(q) ||
            (qDigits && cleanPhone(c.phone).includes(qDigits)));
        el.body.innerHTML = list.map(rowHTML).join('');
        el.empty.classList.toggle('hidden', list.length > 0);
        el.listTitle.textContent = t('cus_list_title', { n: list.length });
    };

    const applyStaticText = () => {
        el.search.placeholder = t('cus_search');
        root.querySelectorAll('[data-i18n-aria]').forEach(n => n.setAttribute('aria-label', t(n.dataset.i18nAria)));
        // Tiêu đề / nút của form phụ thuộc chế độ thêm hoặc sửa
        const editing = state.editingId !== null;
        el.formTitle.textContent = t(editing ? 'cus_form_edit_title' : 'cus_form_add_title');
        el.submit.textContent = t(editing ? 'cus_save_edit' : 'cus_add');
    };

    const renderAll = () => {
        applyStaticText();
        renderStats();
        renderTable();
    };

    // ---------- Modal ----------
    const showModal = (modal) => {
        lastFocus = document.activeElement;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };
    const hideModal = (modal) => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    };
    const isOpen = (modal) => !modal.classList.contains('hidden');

    // ---------- Form thêm / sửa ----------
    const setError = (input, errEl, msg) => {
        errEl.textContent = msg || '';
        errEl.classList.toggle('hidden', !msg);
        input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    };
    const clearErrors = () => {
        setError(el.name, el.errName, '');
        setError(el.phone, el.errPhone, '');
        setError(el.email, el.errEmail, '');
    };

    const openForm = (id = null) => {
        state.editingId = id;
        const c = id !== null ? byId(id) : null;
        el.form.reset();
        clearErrors();
        el.name.value = c ? c.name : '';
        el.phone.value = c ? c.phone : '';
        el.email.value = c ? c.email : '';
        el.address.value = c ? c.address : '';
        el.notes.value = c ? c.notes : '';
        el.del.classList.toggle('hidden', !c);
        applyStaticText();
        showModal(el.formModal);
        el.name.focus();
    };

    const validate = () => {
        clearErrors();
        let ok = true;
        const name = el.name.value.trim();
        const phone = cleanPhone(el.phone.value);
        const email = el.email.value.trim();

        if (!name) { setError(el.name, el.errName, t('cus_err_name')); ok = false; }

        if (!PHONE_RE.test(phone)) {
            setError(el.phone, el.errPhone, t('cus_err_phone')); ok = false;
        } else {
            const normalized = cleanPhone(formatPhone(phone));
            if (customers.some(c => c.id !== state.editingId && cleanPhone(c.phone) === normalized)) {
                setError(el.phone, el.errPhone, t('cus_err_phone_dup')); ok = false;
            }
        }

        if (email && !EMAIL_RE.test(email)) { setError(el.email, el.errEmail, t('cus_err_email')); ok = false; }

        if (!ok) {
            const firstBad = [el.name, el.phone, el.email].find(i => i.getAttribute('aria-invalid') === 'true');
            if (firstBad) firstBad.focus();
        }
        return ok;
    };

    const saveForm = () => {
        if (!validate()) return;
        const data = {
            name: el.name.value.trim().replace(/\s+/g, ' '),
            phone: formatPhone(el.phone.value),
            email: el.email.value.trim(),
            address: el.address.value.trim(),
            notes: el.notes.value.trim(),
        };

        let toastKey;
        if (state.editingId !== null) {
            Object.assign(byId(state.editingId), data);
            toastKey = 'cus_toast_updated';
        } else {
            customers.unshift({ id: nextId++, purchases: 0, spent: 0, ...data });
            // Xóa bộ lọc tìm kiếm để khách vừa thêm luôn hiện trong bảng
            state.q = '';
            el.search.value = '';
            toastKey = 'cus_toast_added';
        }
        hideModal(el.formModal);
        state.editingId = null;
        renderAll();
        if (typeof window.showToast === 'function') window.showToast(toastKey);
    };

    const deleteCustomer = () => {
        const c = byId(state.editingId);
        if (!c) return;
        if (!window.confirm(t('cus_confirm_delete', { name: c.name }))) return;
        customers = customers.filter(x => x.id !== c.id);
        hideModal(el.formModal);
        state.editingId = null;
        renderAll();
        if (typeof window.showToast === 'function') window.showToast('cus_toast_deleted');
    };

    // ---------- Modal xem chi tiết ----------
    let viewingId = null;
    const openView = (id) => {
        const c = byId(id);
        if (!c) return;
        viewingId = id;
        const tier = tierOf(c.spent);
        const none = t('cus_v_none');
        $('custViewAvatar').textContent = initials(c.name);
        $('custViewName').textContent = c.name;
        const badge = $('custViewTier');
        badge.className = `cust-badge inline-block mt-1 cust-tier-${tier}`;
        badge.textContent = t('cus_tier_' + tier);
        $('custViewPurchases').textContent = c.purchases;
        $('custViewPoints').textContent = pointsOf(c.spent).toLocaleString('vi-VN');
        $('custViewSpent').textContent = fmt(c.spent);
        $('custViewEmail').textContent = c.email || none;
        $('custViewPhone').textContent = c.phone;
        $('custViewAddress').textContent = c.address || none;
        $('custViewNotes').textContent = c.notes || none;
        showModal(el.viewModal);
        el.viewModal.querySelector('[data-act="edit-from-view"]').focus();
    };

    // ---------- Sự kiện ----------
    root.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const id = Number(btn.dataset.id);
        switch (btn.dataset.act) {
            case 'add':    openForm(); break;
            case 'edit':   openForm(id); break;
            case 'view':   openView(id); break;
            case 'delete': deleteCustomer(); break;
            case 'close-form': hideModal(el.formModal); state.editingId = null; applyStaticText(); break;
            case 'close-view': hideModal(el.viewModal); break;
            case 'edit-from-view': {
                const target = viewingId;
                hideModal(el.viewModal);
                openForm(target);
                break;
            }
        }
    });

    el.form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveForm();
    });

    el.search.addEventListener('input', () => {
        state.q = el.search.value;
        renderTable();
    });

    // Esc đóng modal; Tab xoay vòng trong modal đang mở
    document.addEventListener('keydown', (e) => {
        const modal = isOpen(el.formModal) ? el.formModal : isOpen(el.viewModal) ? el.viewModal : null;
        if (!modal) return;
        if (e.key === 'Escape') {
            hideModal(modal);
            if (modal === el.formModal) { state.editingId = null; applyStaticText(); }
            return;
        }
        if (e.key === 'Tab') {
            const items = [...modal.querySelectorAll('button, input, textarea, select')]
                .filter(n => !n.disabled && n.getClientRects().length > 0);
            if (!items.length) return;
            const first = items[0], last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
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

    renderAll();
})();