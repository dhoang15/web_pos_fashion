(function () {
    "use strict";

    const form = document.getElementById("first-login-form");
    if (!form) return;

    const newPassword = document.getElementById("new-password");
    const confirmPassword = document.getElementById("confirm-password");
    const errorBox = document.getElementById("password-error");
    const submit = document.getElementById("change-password-submit");
    const token = new URLSearchParams(window.location.search).get("token");
    const logout = document.getElementById("first-login-logout");

    function showError(message) {
        errorBox.textContent = message;
        form.querySelectorAll("input, button[type='submit']").forEach(function (control) {
            control.disabled = true;
        });
    }

    if (!token) {
        showError("Liên kết kích hoạt không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu quản trị viên gửi lại email.");
    } else {
        window.PosApi.get("auth/invitations/validate?token=" + encodeURIComponent(token)).catch(function (error) {
            showError(error.message || "Liên kết kích hoạt không hợp lệ hoặc đã hết hạn.");
        });
    }

    logout.addEventListener("click", async function () {
        logout.disabled = true;
        try {
            await window.PosApi.post("auth/logout", {});
            sessionStorage.removeItem("pos-role");
            sessionStorage.removeItem("pos-user-name");
            sessionStorage.removeItem("pos-user-id");
            window.location.href = "login.html";
        } catch (error) {
            logout.disabled = false;
            errorBox.textContent = error.message;
        }
    });

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        errorBox.textContent = "";
        if (newPassword.value !== confirmPassword.value) {
            errorBox.textContent = "Mật khẩu xác nhận không khớp.";
            confirmPassword.focus();
            return;
        }

        submit.disabled = true;
        submit.textContent = "Đang cập nhật...";
        try {
            await window.PosApi.post("auth/first-login", {
                token: token,
                password: newPassword.value,
                password_confirmation: confirmPassword.value
            });
            window.location.href = sessionStorage.getItem("pos-role") === "admin" ? "../../index.html" : "../pos/index.html";
        } catch (error) {
            errorBox.textContent = error.message;
            submit.disabled = false;
            submit.textContent = "Lưu mật khẩu";
        }
    });
}());
