// Logic của Dashboard: dark/light mode + chuyển view theo sidebar.
// Việc nạp HTML (data-include) đã do include.js làm, file này KHÔNG nạp lại nữa.
document.addEventListener('DOMContentLoaded', () => {

    // ---------- 1. Dark / Light mode ----------
    const themeToggleBtn = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const htmlElement = document.documentElement;

    if (themeToggleBtn && themeIcon) {
        const setTheme = (isDark, save = true) => {
            htmlElement.classList.toggle('dark', isDark);
            themeIcon.classList.toggle('fa-sun', isDark);
            themeIcon.classList.toggle('fa-moon', !isDark);
            if (save) localStorage.setItem('theme', isDark ? 'dark' : 'light');
        };

        // Lần đầu: theo lựa chọn đã lưu, nếu chưa có thì theo hệ điều hành.
        // Khi khởi tạo KHÔNG ghi localStorage, để người dùng chưa chọn thì vẫn bám theo hệ thống.
        const saved = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(saved ? saved === 'dark' : prefersDark, false);

        themeToggleBtn.addEventListener('click', () => {
            setTheme(!htmlElement.classList.contains('dark'));
        });
    } else {
        console.warn('[dashboard] Không thấy #themeToggle / #themeIcon (navigation.html chưa nạp?)');
    }

    // ---------- 2. Chuyển view theo sidebar ----------
    const navItems = document.querySelectorAll('.nav-item');
    const viewContents = document.querySelectorAll('.view-content');

    // Chỉ đổi các class "trạng thái", giữ nguyên class còn lại (vd: mt-auto của nút Settings)
    const ACTIVE = ['bg-orange-100', 'text-orange-600', 'dark:bg-orange-900/40', 'dark:text-orange-400', 'font-bold', 'shadow-sm'];
    const IDLE   = ['text-gray-500', 'hover:text-gray-800', 'hover:bg-gray-200', 'dark:text-gray-400',
                    'dark:hover:text-gray-100', 'dark:hover:bg-darkcard', 'font-semibold'];

    const showView = (item) => {
        navItems.forEach(nav => {
            nav.classList.remove(...ACTIVE);
            nav.classList.add(...IDLE);
        });
        item.classList.remove(...IDLE);
        item.classList.add(...ACTIVE);

        viewContents.forEach(view => view.classList.add('hidden'));

        const targetId = item.getAttribute('data-target');
        const targetView = document.getElementById(targetId);
        if (targetView) {
            targetView.classList.remove('hidden');
        } else {
            console.warn(`[dashboard] Chưa có view "${targetId}"`);
        }
    };

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            showView(item);
        });
    });

    // ---------- 3. View mặc định khi vừa vào trang ----------
    // Chọn nút đầu tiên mà view của nó thực sự tồn tại (để không bị trang trắng)
    const firstWithView = [...navItems].find(n => document.getElementById(n.getAttribute('data-target')));
    if (firstWithView) showView(firstWithView);
});