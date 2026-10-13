(function () {
    "use strict";

    const profileForm = document.getElementById("profile-form");
    if (!profileForm) return;
    const avatarInput = document.getElementById("profile-avatar");
    const avatarPreview = document.getElementById("avatar-preview");
    const avatarPlaceholder = document.getElementById("avatar-placeholder");
    let savedAvatarUrl = "";
    let previewUrl = "";

    function setAvatar(url) {
        const source = url || "";
        avatarPreview.hidden = !source;
        avatarPlaceholder.hidden = Boolean(source);
        if (source) avatarPreview.src = source;
    }

    async function loadProfile() {
        try {
            const response = await window.PosApi.get("auth/me");
            const user = response && (response.user || response.data && (response.data.user || response.data)) || {};
            document.getElementById("profile-name").value = user.name || [user.first_name, user.last_name].filter(Boolean).join(" ");
            document.getElementById("profile-phone").value = user.phone || "";
            savedAvatarUrl = user.avatar || user.avatar_url || "";
            setAvatar(savedAvatarUrl);
        } catch (error) {
            window.PosCommon.notify(error.message, "danger");
        }
    }

    avatarInput.addEventListener("change", function () {
        const file = avatarInput.files && avatarInput.files[0];
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = "";
        if (!file) {
            setAvatar(savedAvatarUrl);
            return;
        }
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
            avatarInput.value = "";
            window.PosCommon.notify("Chọn ảnh PNG, JPG hoặc WebP tối đa 5 MB.", "warning");
            setAvatar(savedAvatarUrl);
            return;
        }
        previewUrl = URL.createObjectURL(file);
        setAvatar(previewUrl);
    });

    profileForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const button = document.getElementById("save-profile");
        button.disabled = true;
        const data = {
            name: document.getElementById("profile-name").value.trim(),
            phone: document.getElementById("profile-phone").value.trim() || null
        };
        try {
            if (avatarInput.files && avatarInput.files[0]) {
                const formData = new FormData();
                formData.set("name", data.name);
                formData.set("phone", data.phone || "");
                formData.set("avatar", avatarInput.files[0]);
                const result = await window.PosApi.upload("auth/profile", formData);
                const user = result && (result.user || result.data && (result.data.user || result.data)) || {};
                if (user.avatar || user.avatar_url) {
                    savedAvatarUrl = user.avatar || user.avatar_url;
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    previewUrl = "";
                    setAvatar(savedAvatarUrl);
                }
            } else {
                const result = await window.PosApi.put("auth/profile", data);
                const user = result && (result.user || result.data && (result.data.user || result.data)) || {};
                if (user.avatar || user.avatar_url) {
                    savedAvatarUrl = user.avatar || user.avatar_url;
                    setAvatar(savedAvatarUrl);
                }
            }
            sessionStorage.setItem("pos-user-name", data.name);
            document.querySelectorAll(".topbar-user-name").forEach(function (element) {
                element.textContent = data.name;
            });
            window.PosCommon.notify("Đã cập nhật hồ sơ.", "success");
            avatarInput.value = "";
        } catch (error) {
            window.PosCommon.notify(error.message, "danger");
        } finally {
            button.disabled = false;
        }
    });

    window.addEventListener("beforeunload", function () {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    });

    document.getElementById("password-form").addEventListener("submit", async function (event) {
        event.preventDefault();
        const form = event.currentTarget;
        if (form.elements.password.value !== form.elements.password_confirmation.value) {
            window.PosCommon.notify("Mật khẩu xác nhận không khớp.", "warning");
            form.elements.password_confirmation.focus();
            return;
        }
        const button = document.getElementById("change-profile-password");
        button.disabled = true;
        try {
            await window.PosApi.post("auth/change-password", {
                current_password: form.elements.current_password.value,
                password: form.elements.password.value,
                password_confirmation: form.elements.password_confirmation.value
            });
            form.reset();
            window.PosCommon.notify("Đã đổi mật khẩu.", "success");
        } catch (error) {
            window.PosCommon.notify(error.message, "danger");
        } finally {
            button.disabled = false;
        }
    });

    loadProfile();
}());
