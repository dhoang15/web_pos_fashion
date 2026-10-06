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
    const mainFrame = document.getElementById('mainFrame');
    const mainWorkspace = document.getElementById('mainWorkspace');
    const defaultDashboardContent = document.getElementById('defaultDashboardContent');
    const breadcrumbPage = document.getElementById('breadcrumbPage');

    function showPage(page) {
        const isPos = page === 'POS / Sales';

        if (breadcrumbPage) breadcrumbPage.textContent = page;
        if (defaultDashboardContent) defaultDashboardContent.classList.add('d-none');
        if (mainWorkspace) {
            mainWorkspace.classList.toggle('d-none', !isPos);
        }
        if (mainFrame) {
            if (isPos && !mainFrame.src.endsWith('/components/pos.html')) {
                mainFrame.src = '../components/pos.html';
            }
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Active menu
            navLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');

            const page = this.getAttribute('data-page');
            showPage(page);
        });
    });
});
