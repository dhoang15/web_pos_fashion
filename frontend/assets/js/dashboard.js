document.addEventListener('DOMContentLoaded', function() {
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
