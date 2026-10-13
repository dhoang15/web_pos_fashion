(function () {
    "use strict";

    const form = document.getElementById("login-form");
    if (!form) return;

    const password = document.getElementById("password");
    const toggle = document.getElementById("toggle-password");
    const errorBox = document.getElementById("login-error");
    const invitationStatus = document.getElementById("invitation-status");
    const temporaryPasswordHint = document.getElementById("temporary-password-hint");
    const submit = document.getElementById("login-submit");
    const hashQuery = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const invitationToken = hashQuery.get("invite");
    let invitationReady = !invitationToken;

    function clearFirstLoginState() {
        ["pos-first-login", "pos-first-login-role"].forEach(function (key) {
            sessionStorage.removeItem(key);
        });
    }

    function clearUserSession() {
        ["pos-role", "pos-user-name", "pos-user-id"].forEach(function (key) {
            sessionStorage.removeItem(key);
        });
    }

    function invitationIsValid(payload) {
        const data = payload && payload.data && typeof payload.data === "object" ? payload.data : payload;
        return Boolean(data && (data.valid === true || data.valid === 1 || data.valid === "1"));
    }

    function removeInvitationFromHistory() {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    function showInviteError(message) {
        invitationStatus.hidden = false;
        invitationStatus.className = "alert alert-danger auth-error";
        invitationStatus.textContent = message;
        submit.disabled = true;
    }

    if (invitationToken) {
        submit.disabled = true;
        invitationStatus.hidden = false;
        invitationStatus.textContent = "Đang kiểm tra liên kết đăng nhập...";
        window.PosApi.post("auth/invitations/validate", { token: invitationToken }).then(function (result) {
            if (!invitationIsValid(result)) {
                throw new Error("Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu quản trị viên gửi lại email.");
            }
            invitationReady = true;
            invitationStatus.className = "alert alert-success auth-error";
            invitationStatus.textContent = "Liên kết hợp lệ. Đăng nhập bằng tên đăng nhập và mật khẩu tạm được cấp trong email.";
            temporaryPasswordHint.hidden = false;
            submit.disabled = false;
        }).catch(function (error) {
            invitationReady = false;
            showInviteError(error.message || "Không thể kiểm tra liên kết. Vui lòng yêu cầu gửi lại email.");
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
        if (!invitationReady) {
            showInviteError("Liên kết chưa được xác thực. Vui lòng mở liên kết mới trong email.");
            return;
        }

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
            if (invitationToken) credentials.invitation_token = invitationToken;

            const result = await window.PosApi.post("auth/login", credentials);
            const responseData = result && result.data && typeof result.data === "object"
                ? result.data
                : result;
            const user = result && (result.user || responseData && (responseData.user || responseData));
            const role = user && user.role;
            if (!user || !["admin", "staff", "cashier"].includes(role)) {
                throw new Error("Máy chủ không trả về role hợp lệ cho tài khoản.");
            }
            if (invitationToken) removeInvitationFromHistory();

            const userName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.name || user.username || "";
            const firstLogin = user.is_first_login === true || Number(user.is_first_login) === 1;
            const landingPage = role === "admin" ? "../../index.html" : "../pos/index.html";

            if (firstLogin && !invitationToken) {
                try {
                    await window.PosApi.post("auth/logout", {});
                } catch (logoutError) {
                    console.warn("Không xác nhận được phiên đăng xuất sau lần đăng nhập thiếu liên kết.", logoutError);
                }
                clearUserSession();
                throw new Error("Nhân viên mới phải mở liên kết trong email để đăng nhập lần đầu.");
            }

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
            const payload = error.details && (error.details.error || error.details.code);
            errorBox.textContent = payload === "INVITE_LINK_REQUIRED" || payload === "INVITATION_EXPIRED"
                ? "Tài khoản nhân viên cần đăng nhập từ liên kết email còn hiệu lực 1 phút. Vui lòng yêu cầu quản trị viên gửi lại liên kết."
                : error.message;
            submit.disabled = false;
            submit.textContent = "Đăng nhập";
        }
    });
}());
