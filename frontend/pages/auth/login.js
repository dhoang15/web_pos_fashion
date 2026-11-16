(function () {
    "use strict";

    const form = document.getElementById("login-form");
    if (!form) return;

    const password = document.getElementById("password");
    const toggle = document.getElementById("toggle-password");
    const errorBox = document.getElementById("login-error");
    const submit = document.getElementById("login-submit");
    const invitationToken = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("invite");

    if (invitationToken) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        errorBox.textContent = "Liên kết mời đã được mở. Nhập tên đăng nhập và mật khẩu tạm trong email.";
    }

    function clearFirstLoginState() {
        ["pos-first-login", "pos-first-login-role"].forEach(function (key) {
            sessionStorage.removeItem(key);
        });
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
            const credentials = {
                username: form.elements.username.value.trim(),
                password: form.elements.password.value
            };
            if (invitationToken) credentials.token = invitationToken;
            const result = await window.PosApi.post(
                invitationToken ? "auth/invitations/login" : "auth/login",
                credentials
            );
            const responseData = result && result.data && typeof result.data === "object"
                ? result.data
                : result;
            const user = result && (result.user || responseData && (responseData.user || responseData));
            const role = user && user.role;
            if (!user || !["admin", "staff", "cashier"].includes(role)) {
                throw new Error("Máy chủ không trả về role hợp lệ cho tài khoản.");
            }
            const userName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.name || user.username || "";
            const firstLogin = user.is_first_login === true || Number(user.is_first_login) === 1;
            const landingPage = role === "admin" ? "../../index.html" : "../pos/index.html";

            clearFirstLoginState();
            sessionStorage.setItem("pos-role", role);
            sessionStorage.setItem("pos-user-name", userName);
            if (user.id != null) sessionStorage.setItem("pos-user-id", String(user.id));

            if (firstLogin) {
                sessionStorage.setItem("pos-first-login", "1");
                sessionStorage.setItem("pos-first-login-role", role);
                window.location.href = "first-login.html";
                return;
            }

            window.location.href = landingPage;
        } catch (error) {
            const details = error.details && error.details.error;
            const errorCode = details && details.code;
            errorBox.textContent = errorCode === "INVITATION_REQUIRED"
                ? "Tài khoản mới phải mở liên kết mời trong email và dùng mật khẩu tạm để đăng nhập lần đầu."
                : error.message;
            submit.disabled = false;
            submit.textContent = "Đăng nhập";
        }
    });
}());
