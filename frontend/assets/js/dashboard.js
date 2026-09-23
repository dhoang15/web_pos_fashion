        document.addEventListener('DOMContentLoaded', () => {
            const themeToggleBtn = document.getElementById('themeToggle');
            const themeIcon = document.getElementById('themeIcon');
            const body = document.body;

            // Hàm áp dụng theme
            const setTheme = (isDark) => {
                if (isDark) {
                    body.classList.add('dark-theme');
                    themeIcon.classList.remove('fa-moon');
                    themeIcon.classList.add('fa-sun');
                    localStorage.setItem('theme', 'dark');
                } else {
                    body.classList.remove('dark-theme');
                    themeIcon.classList.remove('fa-sun');
                    themeIcon.classList.add('fa-moon');
                    localStorage.setItem('theme', 'light');
                }
            };

            // MẶC ĐỊNH LÀ SÁNG. Chỉ bật dark mode nếu user đã từng nhấn nút và lưu ở localStorage
            if (localStorage.getItem('theme') === 'dark') {
                setTheme(true);
            } else {
                setTheme(false);
            }

            // Sự kiện khi click nút chuyển đổi
            themeToggleBtn.addEventListener('click', () => {
                const isDarkModeNow = body.classList.contains('dark-theme');
                setTheme(!isDarkModeNow);
            });
        });