document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-custom-link');
    const mainFrame = document.getElementById('mainFrame');
    const defaultDashboardContent = document.getElementById('defaultDashboardContent');
    const breadcrumbPage = document.getElementById('breadcrumbPage');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Active menu
            navLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');

            const page = this.getAttribute('data-page');
            if (breadcrumbPage) breadcrumbPage.textContent = page;

            if (page === 'POS / Sales') {
                // Ẩn nội dung dashboard mặc định
                if (defaultDashboardContent) defaultDashboardContent.style.display = 'none';
                
                // Hiện iframe POS trong ô Workspace to bên phải
                if (mainFrame) {
                    mainFrame.style.display = 'block';
                    mainFrame.src = '../components/pos.html'; // Đi từ pages/ sang components/pos.html
                }
            } else if (page === 'Dashboard') {
                if (mainFrame) {
                    mainFrame.style.display = 'none';
                    mainFrame.src = '';
                }
                if (defaultDashboardContent) {
                    defaultDashboardContent.style.display = 'block';
                }
            }
        });
    });
});