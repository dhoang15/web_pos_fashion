document.addEventListener("DOMContentLoaded", function() {
    
    // Xử lý nút ẩn/hiện mật khẩu
    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eyeIcon');

    if(togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', function () {
            // Thay đổi type của input
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Đổi icon của Bootstrap (bi-eye / bi-eye-slash)
            if (type === 'password') {
                eyeIcon.classList.remove('bi-eye-slash');
                eyeIcon.classList.add('bi-eye');
            } else {
                eyeIcon.classList.remove('bi-eye');
                eyeIcon.classList.add('bi-eye-slash');
            }
        });
    }

});