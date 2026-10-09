// Nạp các file HTML tách riêng (layouts + pages) vào pages/dashboard/dashboard.html,
// rồi mới chạy JS của từng trang. Cần chạy bằng Live Server (fetch).
(async () => {
    // 1. Thay từng <div data-include="..."> bằng nội dung file
    for (const el of document.querySelectorAll('[data-include]')) {
        const path = el.dataset.include;
        try {
            const res = await fetch(path);
            // FIX 1: file không tồn tại (404) thì KHÔNG chèn chữ "Cannot GET..." vào trang nữa
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            el.outerHTML = await res.text();
        } catch (err) {
            console.error(`[include] Không nạp được HTML: ${path}`, err);
            el.outerHTML = `<p class="text-red-500 text-sm p-4">Lỗi tải: ${path}</p>`;
        }
    }

    // 2. Nạp script theo đúng thứ tự
    // FIX 2: thêm onerror. Trước đây file 404 thì onload không bao giờ chạy
    //        -> promise treo mãi -> dashboard.js không được nạp -> dark mode + sidebar chết hết.
    const load = (src) => new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => {
            console.error(`[include] Không nạp được script: ${src}`);
            resolve(); // vẫn đi tiếp để các script còn lại chạy
        };
        document.body.appendChild(s);
    });
    await load('../../assets/js/translations.js');
    await load('../customers/customers.js');
    await load('../settings/setting.js');
    await load('../dashboard/dashboard.js');

    // 3. DOMContentLoaded thật đã xảy ra trước khi fetch xong,
    //    nên kích lại một lần để setting.js và dashboard.js chạy.
    document.dispatchEvent(new Event('DOMContentLoaded'));
})();