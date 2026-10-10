// JS riêng của trang Invoices (dữ liệu mẫu, sau này thay bằng API)
(() => {
    const root = document.getElementById('view-invoices');
    if (!root) {
        console.warn('[invoices] Không thấy #view-invoices (invoices.html chưa nạp?)');
        return;
    }

    // ---------- Dữ liệu mẫu (ngày tính lùi từ hôm nay để bộ lọc thời gian luôn có kết quả) ----------
    const dayISO = (daysAgo) => {
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    let invoices = [
        { id: 'INV-001', customer: 'Nguyễn Văn An',  date: dayISO(0),  amount: 3150000, items: 3, payment: 'card',    status: 'paid' },
        { id: 'INV-002', customer: 'Trần Thị Bình',  date: dayISO(0),  amount: 2280000, items: 2, payment: 'cash',    status: 'pending' },
        { id: 'INV-003', customer: 'Lê Hoàng Cường', date: dayISO(1),  amount: 6190000, items: 5, payment: 'digital', status: 'paid' },
        { id: 'INV-004', customer: 'Phạm Minh Đức',  date: dayISO(20), amount: 1700000, items: 2, payment: 'card',    status: 'overdue' },
        { id: 'INV-005', customer: 'Võ Thu Hà',      date: dayISO(3),  amount: 3960000, items: 4, payment: 'cash',    status: 'paid' },
    ];
    let nextNo = invoices.length + 1;

    const STATUSES = ['paid', 'pending', 'overdue'];
    const PAYMENTS = ['card', 'cash', 'digital'];
    const TIMES = [['all', 'ivc_time_all'], ['today', 'ivc_time_today'], ['7', 'ivc_time_7'], ['30', 'ivc_time_30']];

    const state = { q: '', status: 'all', time: 'all' };
    let lang = localStorage.getItem('lang') || 'en';
    let lastFocus = null;
    let viewingId = null;

    // ---------- Tiện ích ----------
    const $ = (id) => document.getElementById(id);
    const el = {
        body: $('ivcBody'), empty: $('ivcEmpty'), search: $('ivcSearch'), listTitle: $('ivcListTitle'),
        fStatus: $('ivcFilterStatus'), fTime: $('ivcFilterTime'),
        statTotal: $('ivcStatTotal'), statAmount: $('ivcStatAmount'), statPaid: $('ivcStatPaid'), statOverdue: $('ivcStatOverdue'),
        formModal: $('ivcFormModal'), viewModal: $('ivcViewModal'), form: $('ivcForm'),
        customer: $('ivcCustomer'), amount: $('ivcAmount'), items: $('ivcItems'), payment: $('ivcPayment'), status: $('ivcStatus'), date: $('ivcDate'),
        errCustomer: $('ivcErrCustomer'), errAmount: $('ivcErrAmount'), errItems: $('ivcErrItems'), errDate: $('ivcErrDate'),
        markPaid: $('ivcMarkPaid'),
    };

    const fmt = (n) => n.toLocaleString('vi-VN') + ' ₫';
    const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
    const fmtDate = (iso) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
    const todayISO = () => dayISO(0);
    const byId = (id) => invoices.find(i => i.id === id);

    const t = (key, vars = {}) => {
        const dict = translations[lang] || translations.en || {};
        const str = dict[key] ?? (translations.en && translations.en[key]) ?? key;
        return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
    };
    const itemsText = (n) => t(n === 1 ? 'ivc_items_one' : 'ivc_items_other', { n });
    const toast = (key) => { if (typeof window.showToast === 'function') window.showToast(key); };

    // ---------- Lọc ----------
    const matchesTime = (inv) => {
        if (state.time === 'all') return true;
        const days = state.time === 'today' ? 0 : Number(state.time);
        return inv.date >= dayISO(days);
    };
    const filtered = () => {
        const q = norm(state.q.trim());
        return invoices.filter(inv =>
            (state.status === 'all' || inv.status === state.status) &&
            matchesTime(inv) &&
            (!q || norm(inv.id).includes(q) || norm(inv.customer).includes(q)));
    };

    // ---------- Render ----------
    const rowHTML = (inv) => `<tr>
        <td><button type="button" data-act="view" data-id="${esc(inv.id)}" class="ivc-id">${esc(inv.id)}</button></td>
        <td class="text-gray-900 dark:text-white font-bold">${esc(inv.customer)}</td>
        <td class="text-gray-600 dark:text-gray-300">${fmtDate(inv.date)}</td>
        <td class="text-emerald-600 dark:text-emerald-400 font-bold">${fmt(inv.amount)}</td>
        <td class="text-gray-600 dark:text-gray-300">${esc(itemsText(inv.items))}</td>
        <td><span class="ivc-badge ivc-pay-${inv.payment}">${esc(t('ivc_pay_' + inv.payment))}</span></td>
        <td><span class="ivc-badge ivc-st-${inv.status}">${esc(t('ivc_status_' + inv.status))}</span></td>
        <td>
            <button type="button" data-act="view" data-id="${esc(inv.id)}" class="ivc-icon-btn ivc-icon-view" aria-label="${esc(t('ivc_view'))}"><i class="far fa-eye"></i></button>
            <button type="button" data-act="download" data-id="${esc(inv.id)}" class="ivc-icon-btn ivc-icon-download" aria-label="${esc(t('ivc_download'))}"><i class="fas fa-download"></i></button>
            <button type="button" data-act="send" data-id="${esc(inv.id)}" class="ivc-icon-btn ivc-icon-send" aria-label="${esc(t('ivc_send'))}"><i class="far fa-paper-plane"></i></button>
        </td>
    </tr>`;

    const renderStats = () => {
        el.statTotal.textContent = invoices.length.toLocaleString('vi-VN');
        el.statAmount.textContent = fmt(invoices.reduce((s, i) => s + i.amount, 0));
        el.statPaid.textContent = invoices.filter(i => i.status === 'paid').length.toLocaleString('vi-VN');
        el.statOverdue.textContent = invoices.filter(i => i.status === 'overdue').length.toLocaleString('vi-VN');
    };

    const renderTable = () => {
        const list = filtered();
        el.body.innerHTML = list.map(rowHTML).join('');
        el.empty.classList.toggle('hidden', list.length > 0);
        el.listTitle.textContent = t('ivc_list_title', { n: list.length });
    };

    // Điền các ô <select> (giữ lựa chọn hiện tại khi đổi ngôn ngữ)
    const fillSelect = (select, pairs, keep) => {
        select.innerHTML = pairs.map(([v, k]) => `<option value="${v}">${esc(t(k))}</option>`).join('');
        select.value = keep;
    };

    const applyStaticText = () => {
        el.search.placeholder = t('ivc_search');
        root.querySelectorAll('[data-i18n-aria]').forEach(n => n.setAttribute('aria-label', t(n.dataset.i18nAria)));
        fillSelect(el.fStatus, [['all', 'ivc_f_all_status'], ...STATUSES.map(s => [s, 'ivc_status_' + s])], state.status);
        fillSelect(el.fTime, TIMES, state.time);
        fillSelect(el.payment, PAYMENTS.map(p => [p, 'ivc_pay_' + p]), el.payment.value || 'card');
        fillSelect(el.status, STATUSES.map(s => [s, 'ivc_status_' + s]), el.status.value || 'pending');
        el.fStatus.setAttribute('aria-label', t('ivc_col_status'));
        el.fTime.setAttribute('aria-label', t('ivc_col_date'));
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

    // ---------- Form hóa đơn mới ----------
    const setError = (input, errEl, msg) => {
        errEl.textContent = msg || '';
        errEl.classList.toggle('hidden', !msg);
        input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    };
    const clearErrors = () => {
        setError(el.customer, el.errCustomer, '');
        setError(el.amount, el.errAmount, '');
        setError(el.items, el.errItems, '');
        setError(el.date, el.errDate, '');
    };
    const parseAmount = (s) => Number(String(s).replace(/[^\d]/g, ''));

    const openForm = () => {
        el.form.reset();
        clearErrors();
        el.date.value = todayISO();
        el.items.value = 1;
        applyStaticText();
        el.payment.value = 'card';
        el.status.value = 'pending';
        showModal(el.formModal);
        el.customer.focus();
    };

    const validate = () => {
        clearErrors();
        let ok = true;
        if (!el.customer.value.trim()) { setError(el.customer, el.errCustomer, t('ivc_err_customer')); ok = false; }
        if (!(parseAmount(el.amount.value) > 0)) { setError(el.amount, el.errAmount, t('ivc_err_amount')); ok = false; }
        const n = Number(el.items.value);
        if (!Number.isInteger(n) || n < 1) { setError(el.items, el.errItems, t('ivc_err_items')); ok = false; }
        if (!el.date.value) { setError(el.date, el.errDate, t('ivc_err_date')); ok = false; }
        if (!ok) {
            const bad = [el.customer, el.amount, el.items, el.date].find(i => i.getAttribute('aria-invalid') === 'true');
            if (bad) bad.focus();
        }
        return ok;
    };

    const saveForm = () => {
        if (!validate()) return;
        invoices.unshift({
            id: 'INV-' + String(nextNo++).padStart(3, '0'),
            customer: el.customer.value.trim().replace(/\s+/g, ' '),
            date: el.date.value,
            amount: parseAmount(el.amount.value),
            items: Number(el.items.value),
            payment: el.payment.value,
            status: el.status.value,
        });
        // Xóa bộ lọc để hóa đơn vừa tạo luôn hiện trong bảng
        state.q = ''; state.status = 'all'; state.time = 'all';
        el.search.value = '';
        hideModal(el.formModal);
        renderAll();
        toast('ivc_toast_created');
    };

    // ---------- Xem chi tiết ----------
    const openView = (id) => {
        const inv = byId(id);
        if (!inv) return;
        viewingId = id;
        $('ivcViewId').textContent = inv.id;
        const st = $('ivcViewStatus');
        st.className = `ivc-badge ivc-st-${inv.status}`;
        st.textContent = t('ivc_status_' + inv.status);
        $('ivcViewAmount').textContent = fmt(inv.amount);
        $('ivcViewCustomer').textContent = inv.customer;
        $('ivcViewDate').textContent = fmtDate(inv.date);
        $('ivcViewItems').textContent = itemsText(inv.items);
        const pay = $('ivcViewPayment');
        pay.className = `ivc-badge ivc-pay-${inv.payment}`;
        pay.textContent = t('ivc_pay_' + inv.payment);
        el.markPaid.classList.toggle('hidden', inv.status === 'paid');
        showModal(el.viewModal);
        el.viewModal.querySelector('[data-act="download-from-view"]').focus();
    };

    const markPaid = () => {
        const inv = byId(viewingId);
        if (!inv) return;
        inv.status = 'paid';
        hideModal(el.viewModal);
        renderAll();
        toast('ivc_toast_paid');
    };

    // ---------- Xuất file (CSV mở được bằng Excel, có BOM để giữ tiếng Việt) ----------
    const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const download = (filename, text) => {
        const blob = new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const csvHeader = () => ['ivc_col_id', 'ivc_col_customer', 'ivc_col_date', 'ivc_col_amount', 'ivc_col_items', 'ivc_col_payment', 'ivc_col_status'].map(k => csvCell(t(k))).join(',');
    const csvRow = (i) => [i.id, i.customer, fmtDate(i.date), i.amount, i.items, t('ivc_pay_' + i.payment), t('ivc_status_' + i.status)].map(csvCell).join(',');

    const exportList = () => {
        download(`invoices-${todayISO()}.csv`, [csvHeader(), ...filtered().map(csvRow)].join('\r\n'));
        toast('ivc_toast_exported');
    };
    const downloadOne = (id) => {
        const inv = byId(id);
        if (!inv) return;
        download(`${inv.id}.csv`, [csvHeader(), csvRow(inv)].join('\r\n'));
        toast('ivc_toast_downloaded');
    };
    const sendOne = (id) => { if (byId(id)) toast('ivc_toast_sent'); };

    // ---------- Sự kiện ----------
    root.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const id = btn.dataset.id;
        switch (btn.dataset.act) {
            case 'new':      openForm(); break;
            case 'export':   exportList(); break;
            case 'view':     openView(id); break;
            case 'download': downloadOne(id); break;
            case 'send':     sendOne(id); break;
            case 'close-form': hideModal(el.formModal); break;
            case 'close-view': hideModal(el.viewModal); break;
            case 'download-from-view': downloadOne(viewingId); break;
            case 'send-from-view':     sendOne(viewingId); break;
            case 'mark-paid': markPaid(); break;
        }
    });

    el.form.addEventListener('submit', (e) => { e.preventDefault(); saveForm(); });
    el.search.addEventListener('input', () => { state.q = el.search.value; renderTable(); });
    el.fStatus.addEventListener('change', () => { state.status = el.fStatus.value; renderTable(); });
    el.fTime.addEventListener('change', () => { state.time = el.fTime.value; renderTable(); });

    // Esc đóng modal; Tab xoay vòng trong modal đang mở
    document.addEventListener('keydown', (e) => {
        const modal = isOpen(el.formModal) ? el.formModal : isOpen(el.viewModal) ? el.viewModal : null;
        if (!modal) return;
        if (e.key === 'Escape') { hideModal(modal); return; }
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
    // Dùng e.target.value vì listener này chạy trước listener của settings.js.
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            lang = e.target.value;
            renderAll();
            if (viewingId && isOpen(el.viewModal)) openView(viewingId);
        });
    }

    renderAll();
})();