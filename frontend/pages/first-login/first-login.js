document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.toggle-pwd[data-target]').forEach(function(button) {
        button.addEventListener('click', function() {
            const input = document.getElementById(button.dataset.target);
            const icon = button.querySelector('i');
            if (!input || !icon) return;

            const showPassword = input.type === 'password';
            input.type = showPassword ? 'text' : 'password';
            icon.classList.toggle('bi-eye', !showPassword);
            icon.classList.toggle('bi-eye-slash', showPassword);
        });
    });
});
