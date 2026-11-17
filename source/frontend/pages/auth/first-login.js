(function () {
    "use strict";

    const form = document.getElementById("first-login-form");
    if (!form) return;

    const newPassword = document.getElementById("new-password");
    const confirmPassword = document.getElementById("confirm-password");
    const errorBox = document.getElementById("password-error");
    const submit = document.getElementById("change-password-submit");
    const logout = document.getElementById("first-login-logout");
    const title = document.getElementById("first-login-title");
    const description = document.getElementById("first-login-description");
    let currentUser = null;

    function clearSessionState() {
        ["pos-role", "pos-user-name", "pos-user-id", "pos-first-login", "pos-first-login-role"].forEach(function (key) {
            sessionStorage.removeItem(key);
        });
    }

    function setFormEnabled(enabled) {
        form.querySelectorAll("input, button[type='submit']").forEach(function (control) {
            control.disabled = !enabled;
        });
    }

    function showError(message) {
        errorBox.textContent = message;
        setFormEnabled(false);
    }

    function userFromResponse(response) {
        const data = response && response.data && typeof response.data === "object" ? response.data : response;
        return data && (data.user || data);
    }

    function landingPage(user) {
        return user && user.role === "admin" ? "../../index.html" : "../pos/index.html";
    }

    function storeUser(user) {
        sessionStorage.setItem("pos-role", user.role);
        sessionStorage.setItem("pos-user-name", [user.first_name, user.last_name].filter(Boolean).join(" ") || user.name || user.username || "");
        if (user.id != null) sessionStorage.setItem("pos-user-id", String(user.id));
        sessionStorage.removeItem("pos-first-login");
        sessionStorage.removeItem("pos-first-login-role");
    }

    setFormEnabled(false);

    if (sessionStorage.getItem("pos-first-login") !== "1") {
        window.location.replace("login.html");
        return;
    }

    window.PosApi.get("auth/me").then(function (response) {
        currentUser = userFromResponse(response);
        if (!currentUser || !["admin", "staff", "cashier"].includes(currentUser.role)) {
            throw new Error("Không xác định được tài khoản. Vui lòng đăng nhập lại.");
        }

        const firstLoginRequired = currentUser.is_first_login === true || Number(currentUser.is_first_login) === 1;
        if (!firstLoginRequired) {
            storeUser(currentUser);
            window.location.replace(landingPage(currentUser));
            return;
        }
        title.textContent = "Đổi mật khẩu lần đầu";
        description.textContent = "Tạo mật khẩu riêng để tiếp tục sử dụng ứng dụng.";
        errorBox.textContent = "";
        setFormEnabled(true);
    }).catch(function (error) {
        showError((error && error.status === 401)
            ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
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
            storeUser(currentUser);
            window.location.replace(landingPage(currentUser));
        } catch (error) {
            errorBox.textContent = error.message || "Không thể cập nhật mật khẩu.";
            submit.disabled = false;
            submit.textContent = "Lưu mật khẩu";
        }
    });
}());
