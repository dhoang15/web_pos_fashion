(function () {
    "use strict";

    const form = document.getElementById("login-form");
    if (!form) return;

    const password = document.getElementById("password");
    const toggle = document.getElementById("toggle-password");
    const errorBox = document.getElementById("login-error");
    const submit = document.getElementById("login-submit");

    function clearFirstLoginState() {
        ["pos-first-login", "pos-first-login-role", "pos-first-login-token"].forEach(function (key) {
            sessionStorage.removeItem(key);
        });
    }

    function clearUserSession() {
        ["pos-role", "pos-user-name", "pos-user-id"].forEach(function (key) {
            sessionStorage.removeItem(key);
        });
    }

    if (sessionStorage.getItem("pos-password-updated") === "1") {
        errorBox.className = "alert alert-success auth-error";
        errorBox.textContent = "Mật khẩu đã được cập nhật. Hãy đăng nhập bằng mật khẩu mới.";
        sessionStorage.removeItem("pos-password-updated");
    }

    toggle.addEventListener("click", function () {
        const visible = password.type === "password";
        password.type = visible ? "text" : "password";
        toggle.setAttribute("aria-label", visible ? "Ẩn mật khẩu" : "Hiện mật khẩu");
        toggle.querySelector("i").className = visible ? "bi bi-eye-slash" : "bi bi-eye";
    });

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        errorBox.classList.remove("alert-success");
        errorBox.classList.add("alert-danger");
        errorBox.textContent = "";
        submit.disabled = true;
        submit.textContent = "Đang đăng nhập...";

        try {
            const result = await window.PosApi.post("auth/login", {
                username: form.elements.username.value.trim(),
                password: form.elements.password.value
            });
            const responseData = result && result.data && typeof result.data === "object"
                ? result.data
                : result;
            const user = result && (result.user || responseData && (responseData.user || responseData));
            const role = user && user.role;
            if (!["admin", "staff", "cashier"].includes(role)) {
                throw new Error("Máy chủ không trả về role hợp lệ cho tài khoản.");
            }

            const userName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.name || user.username || "";
            const firstLogin = Boolean(user && (user.is_first_login === true || Number(user.is_first_login) === 1));
            const landingPage = role === "admin" ? "../../index.html" : "../pos/index.html";
            const activationToken = result && (
                result.activation_token || result.invitation_token ||
                responseData && (responseData.activation_token || responseData.invitation_token)
            );
            if (firstLogin) {
                sessionStorage.setItem("pos-first-login", "1");
                sessionStorage.setItem("pos-first-login-role", role);
                clearUserSession();
                if (activationToken) {
                    sessionStorage.setItem("pos-first-login-token", String(activationToken));
                    window.location.href = "first-login.html?token=" + encodeURIComponent(activationToken);
                    return;
                }
                sessionStorage.removeItem("pos-first-login-token");
                errorBox.textContent = "Tài khoản chưa kích hoạt. Hãy mở liên kết trong email còn hiệu lực 1 phút hoặc yêu cầu quản trị viên gửi lại.";
                submit.disabled = false;
                submit.textContent = "Đăng nhập";
                return;
            }
            clearFirstLoginState();
            sessionStorage.setItem("pos-role", role);
            sessionStorage.setItem("pos-user-name", userName);
            if (user.id != null) sessionStorage.setItem("pos-user-id", String(user.id));
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
