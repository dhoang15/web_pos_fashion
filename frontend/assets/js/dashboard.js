document.addEventListener('DOMContentLoaded', async function() {
    const components = [
        ['sidebar-container', '../components/sidebar.html'],
        ['navigation-container', '../components/navigation.html']
    ];

    try {
        await Promise.all(components.map(async function([containerId, path]) {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Không tải được ${path}: HTTP ${response.status}`);
            }

            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Không tìm thấy vùng chèn component #${containerId}`);
            }

            container.innerHTML = await response.text();
        }));

        const footerResponse = await fetch('../components/footer.html');
        if (!footerResponse.ok) {
            throw new Error(`Không tải được ../components/footer.html: HTTP ${footerResponse.status}`);
        }

        const footerContainer = document.getElementById('footer-container');
        if (!footerContainer) {
            throw new Error('Không tìm thấy vùng chèn component #footer-container');
        }
        footerContainer.innerHTML = await footerResponse.text();
    } catch (error) {
        console.error('Không thể tải giao diện dashboard:', error);
        return;
    }

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
