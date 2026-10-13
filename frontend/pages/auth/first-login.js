(function () {
    "use strict";

    const form = document.getElementById("first-login-form");
    if (!form) return;

    const newPassword = document.getElementById("new-password");
    const confirmPassword = document.getElementById("confirm-password");
    const errorBox = document.getElementById("password-error");
    const submit = document.getElementById("change-password-submit");
    const logout = document.getElementById("first-login-logout");
    let currentUser = null;

    function clearSessionState() {
        ["pos-role", "pos-user-name", "pos-user-id", "pos-first-login", "pos-first-login-role"].forEach(function (key) {
            sessionStorage.removeItem(key);
        });
    }

    function showError(message) {
        errorBox.textContent = message;
        form.querySelectorAll("input, button[type='submit']").forEach(function (control) {
            control.disabled = true;
        });
    }

    function userFromResponse(response) {
        const data = response && response.data && typeof response.data === "object" ? response.data : response;
        return data && (data.user || data);
    }

    function landingPage(user) {
        return user && user.role === "admin" ? "../../index.html" : "../pos/index.html";
    }

    form.querySelectorAll("input, button[type='submit']").forEach(function (control) {
        control.disabled = true;
    });

    if (sessionStorage.getItem("pos-first-login") !== "1") {
        window.location.replace("login.html");
        return;
    }

    window.PosApi.get("auth/me").then(function (response) {
        currentUser = userFromResponse(response);
        if (!currentUser || !["admin", "staff", "cashier"].includes(currentUser.role)) {
            throw new Error("Không xác định được phiên đăng nhập. Vui lòng đăng nhập lại.");
        }

        sessionStorage.setItem("pos-role", currentUser.role);
        sessionStorage.setItem("pos-user-name", [currentUser.first_name, currentUser.last_name].filter(Boolean).join(" ") || currentUser.name || currentUser.username || "Người dùng");
        if (currentUser.id != null) sessionStorage.setItem("pos-user-id", String(currentUser.id));

        const firstLoginRequired = currentUser.is_first_login === true || Number(currentUser.is_first_login) === 1;
        if (!firstLoginRequired) {
            sessionStorage.removeItem("pos-first-login");
            sessionStorage.removeItem("pos-first-login-role");
            window.location.replace(landingPage(currentUser));
            return;
        }

        form.querySelectorAll("input, button[type='submit']").forEach(function (control) {
            control.disabled = false;
        });
    }).catch(function (error) {
        showError((error && error.status === 401)
            ? "Phiên đăng nhập đã hết hạn. Vui lòng mở lại liên kết trong email và đăng nhập lại."
            : error.message || "Không thể xác nhận phiên đăng nhập.");
    });

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
                password: newPassword.value,
                password_confirmation: confirmPassword.value
            });
            sessionStorage.removeItem("pos-first-login");
            sessionStorage.removeItem("pos-first-login-role");
            window.location.replace(landingPage(currentUser));
        } catch (error) {
            errorBox.textContent = error.message;
            submit.disabled = false;
            submit.textContent = "Lưu mật khẩu";
        }
    });
}());
