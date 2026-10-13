(function () {
    "use strict";

    const form = document.getElementById("login-form");
    if (!form) return;

    const password = document.getElementById("password");
    const toggle = document.getElementById("toggle-password");
    const errorBox = document.getElementById("login-error");
    const submit = document.getElementById("login-submit");

    document.querySelectorAll("[data-demo-user]").forEach(function (button) {
        button.addEventListener("click", function () {
            const isAdmin = button.dataset.demoUser === "admin";
            sessionStorage.setItem("pos-demo-mode", "1");
            form.elements.username.value = isAdmin ? "admin.demo" : "staff.demo";
            form.elements.password.value = isAdmin ? "Admin123!" : "Staff123!";
            errorBox.textContent = "";
            form.requestSubmit();
        });
    });

    toggle.addEventListener("click", function () {
        const visible = password.type === "password";
        password.type = visible ? "text" : "password";
        toggle.setAttribute("aria-label", visible ? "Ẩn mật khẩu" : "Hiện mật khẩu");
        toggle.querySelector("i").className = visible ? "bi bi-eye-slash" : "bi bi-eye";
    });

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        errorBox.textContent = "";
        submit.disabled = true;
        submit.textContent = "Đang đăng nhập...";

        try {
            const result = await window.PosApi.post("auth/login", {
                username: form.elements.username.value.trim(),
                password: form.elements.password.value
            });
            const user = result && (result.user || result.data && (result.data.user || result.data));
            const role = user && user.role;
            if (!["admin", "staff", "cashier"].includes(role)) {
                throw new Error("Máy chủ không trả về role hợp lệ cho tài khoản.");
            }

            sessionStorage.setItem("pos-role", role);
            sessionStorage.setItem("pos-user-name", [user.first_name, user.last_name].filter(Boolean).join(" ") || user.name || user.username || "");
            if (user.id != null) sessionStorage.setItem("pos-user-id", String(user.id));
            const firstLogin = Boolean(user && (user.is_first_login === true || Number(user.is_first_login) === 1));
            const landingPage = role === "admin" ? "../../index.html" : "../pos/index.html";
            const activationToken = result && (result.activation_token || result.invitation_token);
            if (firstLogin && activationToken) {
                window.location.href = "first-login.html?token=" + encodeURIComponent(activationToken);
                return;
            }
            if (firstLogin) {
                sessionStorage.removeItem("pos-role");
                sessionStorage.removeItem("pos-user-name");
                sessionStorage.removeItem("pos-user-id");
                errorBox.textContent = "Tài khoản chưa kích hoạt. Hãy mở liên kết trong email còn hiệu lực 1 phút hoặc yêu cầu quản trị viên gửi lại.";
                submit.disabled = false;
                submit.textContent = "Đăng nhập";
                return;
            }
            window.location.href = landingPage;
        } catch (error) {
            const payload = error.details && (error.details.error || error.details.code);
            errorBox.textContent = payload === "INVITE_LINK_REQUIRED" || payload === "INVITATION_EXPIRED"
                ? "Tài khoản nhân viên cần được kích hoạt bằng liên kết email còn hiệu lực (1 phút). Vui lòng yêu cầu quản trị viên gửi lại liên kết."
                : error.message;
            submit.disabled = false;
            submit.textContent = "Đăng nhập";
        }
    });
}());
