(function () {
    "use strict";

    const form = document.getElementById("first-login-form");
    if (!form) return;

    const newPassword = document.getElementById("new-password");
    const confirmPassword = document.getElementById("confirm-password");
    const errorBox = document.getElementById("password-error");
    const submit = document.getElementById("change-password-submit");
    const token = new URLSearchParams(window.location.search).get("token") ||
        sessionStorage.getItem("pos-first-login-token");
    const logout = document.getElementById("first-login-logout");

    if (token) {
        sessionStorage.setItem("pos-first-login", "1");
        sessionStorage.setItem("pos-first-login-token", token);
        ["pos-role", "pos-user-name", "pos-user-id"].forEach(function (key) {
            sessionStorage.removeItem(key);
        });
    }

    function showError(message) {
        errorBox.textContent = message;
        form.querySelectorAll("input, button[type='submit']").forEach(function (control) {
            control.disabled = true;
        });
    }

    function clearSessionState() {
        ["pos-role", "pos-user-name", "pos-user-id", "pos-first-login", "pos-first-login-role", "pos-first-login-token"].forEach(function (key) {
            sessionStorage.removeItem(key);
        });
    }

    form.querySelectorAll("input, button[type='submit']").forEach(function (control) {
        control.disabled = true;
    });

    if (!token) {
        showError("Liên kết kích hoạt không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu quản trị viên gửi lại email.");
    } else {
        window.PosApi.get("auth/invitations/validate?token=" + encodeURIComponent(token)).then(function (result) {
            const data = result && result.data && typeof result.data === "object" ? result.data : result;
            if (data && data.valid === false) {
                showError("Liên kết kích hoạt không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu quản trị viên gửi lại email.");
                return;
            }
            form.querySelectorAll("input, button[type='submit']").forEach(function (control) {
                control.disabled = false;
            });
        }).catch(function (error) {
            showError(error.message || "Liên kết kích hoạt không hợp lệ hoặc đã hết hạn.");
        });
    }

    logout.addEventListener("click", async function () {
        logout.disabled = true;
        try {
            await window.PosApi.post("auth/logout", {});
        } catch (error) {
            errorBox.textContent = "Phiên đăng nhập cục bộ đã được xóa. Máy chủ chưa xác nhận đăng xuất: " + error.message;
        } finally {
            clearSessionState();
            window.location.replace("login.html");
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
            clearSessionState();
            sessionStorage.setItem("pos-password-updated", "1");
            window.location.replace("login.html");
        } catch (error) {
            errorBox.textContent = error.message;
            submit.disabled = false;
            submit.textContent = "Lưu mật khẩu";
        }
    });
}());
