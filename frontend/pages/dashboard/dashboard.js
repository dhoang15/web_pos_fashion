document.addEventListener('DOMContentLoaded', async function() {
    const layoutFiles = [
        ['sidebar-container', '../../layouts/sidebar.html'],
        ['navigation-container', '../../layouts/navigation.html'],
        ['footer-container', '../../layouts/footer.html']
    ];

    try {
        // Tải toàn bộ các file layout song song cùng lúc
        await Promise.all(layoutFiles.map(async function([containerId, path]) {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Không tải được ${path}: HTTP ${response.status}`);
            }

            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = await response.text();
            }
        }));
    } catch (error) {
        console.error('Không thể tải giao diện:', error);
        return;
    }

    // Đăng ký sự kiện click sau khi layout đã được chèn vào DOM hoàn tất
    const navLinks = document.querySelectorAll('.nav-custom-link');
    const breadcrumbPage = document.getElementById('breadcrumbPage');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');

            if (breadcrumbPage) {
                breadcrumbPage.textContent = this.getAttribute('data-page');
            }
        });
    });
});