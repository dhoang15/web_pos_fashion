// Nạp các file HTML tách riêng (layouts + pages) vào pages/dashboard/dashboard.html,
// rồi mới chạy JS của từng trang. Cần chạy bằng Live Server (fetch).
(async () => {
    // 1. Thay từng <div data-include="..."> bằng nội dung file
    for (const el of document.querySelectorAll('[data-include]')) {
        const path = el.dataset.include;
        try {
            const res = await fetch(path);
            // File không tồn tại (404) thì KHÔNG chèn chữ "Cannot GET..." vào trang
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            el.outerHTML = await res.text();
        } catch (err) {
            console.error(`[include] Không nạp được HTML: ${path}`, err);
            el.outerHTML = `<p class="text-red-500 text-sm p-4">Lỗi tải: ${path}</p>`;
        }
    }

    // 2. Nạp script theo đúng thứ tự
    // Có onerror: file 404 thì vẫn đi tiếp, không làm treo các script phía sau.
    const load = (src) => new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => {
            console.error(`[include] Không nạp được script: ${src}`);
            resolve();
        };
        document.body.appendChild(s);
    });
    await load('../../assets/js/translations.js');
    await load('../../assets/js/store.js');  
    await load('../customers/customers.js');
    await load('../invoices/invoices.js');
    await load('../settings/settings.js');   // đã sửa: settings/settings.js (khớp tên thư mục + file)
    await load('../pos/pos.js');
    await load('../products/products.js');   
    await load('./dashboard.js');

    // 3. DOMContentLoaded thật đã xảy ra trước khi fetch xong,
    //    nên kích lại một lần để settings.js và dashboard.js chạy.
    document.dispatchEvent(new Event('DOMContentLoaded'));
})();