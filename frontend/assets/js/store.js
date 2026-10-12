// KHO DỮ LIỆU DÙNG CHUNG (assets/js/store.js)
// Products (thêm/sửa/xóa/import) và POS (trừ tồn kho khi bán) cùng đọc ghi ở đây.
// Phải được nạp TRƯỚC pos.js và products.js (xem thứ tự trong include.js).
//
// Mỗi lần dữ liệu đổi:  document phát sự kiện  'store:products'
// Lưu localStorage lỗi (đầy bộ nhớ, chế độ riêng tư...): phát  'store:error'
(() => {
    const KEY = 'btriple.products';
    const LOW_STOCK = 10;   // tồn kho <= mức này: "Low Stock"

    // Thư mục ảnh tính từ pages/dashboard/dashboard.html. Đổi ở đây nếu bạn chuyển ảnh sang thư mục khác
    // (vd '../../assets/images/products/').
    const IMG_DIR = '../../assets/images/';

    // ---------- Dữ liệu mẫu lần đầu ----------
    // aj1-linen chưa có file ảnh trong assets/images -> để '' (hiện icon giày). Thêm ảnh rồi điền tên file vào.
    const SEED = [
        { id: 'aj1-brotherhood', name: 'Air Jordan 1 Retro High OG "Brotherhood"', category: 'Jordan 1 High', price: 4590000, stock: 24, img: IMG_DIR + 'jordan-1-high-brotherhood.jpg', desc: 'Purple and gold leather high-top with the classic Wings logo.' },
        { id: 'aj1-linen',       name: 'Air Jordan 1 Mid "Linen"',                 category: 'Jordan 1 Mid',  price: 3290000, stock: 18, img: '',                                  desc: 'Linen and grey panels on a bone-white sole, easy to wear every day.' },
        { id: 'aj1-black-toe',   name: 'Air Jordan 1 High "Black Toe"',            category: 'Jordan 1 High', price: 4890000, stock: 12, img: IMG_DIR + 'jordan-1-high-black-toe.jpg',   desc: 'Red, black and white colour block with a black toe box.' },
        { id: 'aj4-black-cat',   name: 'Air Jordan 4 Retro "Black Cat"',           category: 'Jordan 4',      price: 5990000, stock: 9,  img: IMG_DIR + 'jordan-4-black-cat.jpg',        desc: 'Matte all-black Jordan 4 with a stealth look.' },
        { id: 'aj1-smoke-grey',  name: 'Air Jordan 1 Mid "Light Smoke Grey"',      category: 'Jordan 1 Mid',  price: 3190000, stock: 31, img: IMG_DIR + 'jordan-1-mid-grey.jpg',         desc: 'Light smoke grey leather with a bold black swoosh.' },
        { id: 'aj1-navy',        name: 'Air Jordan 1 Mid "Navy"',                  category: 'Jordan 1 Mid',  price: 3390000, stock: 6,  img: IMG_DIR + 'jordan-1-mid-navy.jpg',         desc: 'Navy and white mid-top finished with tan laces.' },
    ];

    // ---------- Chuẩn hóa dữ liệu ----------
    const cleanText = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');
    const cleanInt = (v, min) => {
        const n = Math.round(Number(v));
        return Number.isFinite(n) && n >= min ? n : min;
    };
    const normName = (s) => cleanText(s).normalize('NFC').toLowerCase();

    const sanitize = (p) => ({
        id: String(p.id),
        name: cleanText(p.name),
        category: cleanText(p.category),
        price: cleanInt(p.price, 0),
        stock: cleanInt(p.stock, 0),
        desc: String(p.desc ?? '').trim(),
        img: typeof p.img === 'string' ? p.img : '',
    });

    const newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    // ---------- Đọc / ghi localStorage ----------
    const readStorage = () => {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw === null) return null;
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr)) return null;
            return arr.filter(p => p && p.id !== undefined && p.name).map(sanitize);
        } catch (err) {
            return null;
        }
    };

    const writeStorage = (list) => {
        try {
            localStorage.setItem(KEY, JSON.stringify(list));
            return true;
        } catch (err) {
            return false;
        }
    };

    const emit = (name) => document.dispatchEvent(new CustomEvent(name));

    let products = readStorage();
    if (products === null) {
        products = SEED.map(sanitize);
        writeStorage(products);   // lỗi thì thôi, vẫn dùng bản trong bộ nhớ
    }

    // Lưu danh sách mới. Thành công mới thay dữ liệu + báo cho giao diện; thất bại thì giữ nguyên bản cũ.
    const commit = (next) => {
        if (!writeStorage(next)) {
            emit('store:error');
            return false;
        }
        products = next;
        emit('store:products');
        return true;
    };

    // ---------- API ----------
    const Store = {
        LOW_STOCK,

        getProducts: () => products.map(p => ({ ...p })),

        getProduct: (id) => {
            const p = products.find(x => x.id === String(id));
            return p ? { ...p } : null;
        },

        findByName: (name) => {
            const key = normName(name);
            const p = key ? products.find(x => normName(x.name) === key) : null;
            return p ? { ...p } : null;
        },

        categories: () => [...new Set(products.map(p => p.category).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'vi')),

        // 'in' | 'low' | 'out'
        statusOf: (p) => (p.stock <= 0 ? 'out' : p.stock <= LOW_STOCK ? 'low' : 'in'),

        addProduct: (data) => {
            const p = sanitize({ ...data, id: newId() });
            return commit([p, ...products]) ? { ...p } : null;
        },

        updateProduct: (id, data) => {
            const key = String(id);
            if (!products.some(x => x.id === key)) return null;
            const next = products.map(x => (x.id === key ? sanitize({ ...x, ...data, id: key }) : x));
            return commit(next) ? Store.getProduct(key) : null;
        },

        removeProduct: (id) => {
            const key = String(id);
            if (!products.some(x => x.id === key)) return false;
            return commit(products.filter(x => x.id !== key));
        },

        // Import CSV: trùng tên -> cập nhật giá/tồn/danh mục/mô tả (giữ ảnh); chưa có -> thêm mới. Chỉ phát 1 sự kiện.
        upsertMany: (list) => {
            const next = products.map(p => ({ ...p }));
            const byName = new Map(next.map(p => [normName(p.name), p]));
            const created = [];
            let added = 0, updated = 0;
            list.forEach(item => {
                const key = normName(item.name);
                if (!key) return;
                const hit = byName.get(key);
                if (hit) {
                    Object.assign(hit, sanitize({ ...hit, ...item, img: hit.img, id: hit.id }));
                    updated++;
                } else {
                    const p = sanitize({ ...item, id: newId(), img: '' });
                    byName.set(key, p);
                    created.push(p);
                    added++;
                }
            });
            if (!added && !updated) return { added: 0, updated: 0 };
            return commit([...created, ...next]) ? { added, updated } : { added: 0, updated: 0 };
        },

        // POS bán hàng: lines = [{ id, qty }]. Trừ tồn kho, không để âm.
        adjustStock: (lines) => {
            const next = products.map(p => ({ ...p }));
            let changed = false;
            lines.forEach(l => {
                const p = next.find(x => x.id === String(l.id));
                const qty = Math.round(Number(l.qty));
                if (!p || !(qty > 0)) return;
                p.stock = Math.max(0, p.stock - qty);
                changed = true;
            });
            return changed ? commit(next) : false;
        },
    };

    window.Store = Object.freeze(Store);

    // Tab khác sửa dữ liệu -> đồng bộ lại
    window.addEventListener('storage', (e) => {
        if (e.key !== KEY) return;
        const fresh = readStorage();
        if (fresh === null) return;
        products = fresh;
        emit('store:products');
    });
})();