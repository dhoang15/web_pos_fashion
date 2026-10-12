(function () {
    "use strict";

    const businessForm = document.getElementById("business-settings-form");
    if (!businessForm) return;
    const currentRole = sessionStorage.getItem("pos-role");
    if (currentRole !== "admin") {
        window.location.replace(currentRole ? "../pos/index.html" : "../auth/login.html");
        return;
    }

    const invoiceForm = document.getElementById("invoice-settings-form");
    const securityForm = document.getElementById("security-settings-form");
    const passwordForm = document.getElementById("admin-password-form");
    const qrForm = document.getElementById("payment-qr-form");
    const qrFile = document.getElementById("payment-qr-file");
    const qrPreview = document.getElementById("payment-qr-preview");
    const qrPlaceholder = document.getElementById("payment-qr-placeholder");
    const qrDescription = document.getElementById("payment-qr-description");
    const qrMethod = document.getElementById("payment-qr-method");
    const qrToggle = document.getElementById("payment-qr-enabled");
    const qrStatus = document.getElementById("payment-status");
    const settingsStatus = document.getElementById("settings-status");
    const settingsByKey = new Map();
    let currentQr = null;
    let previewUrl = null;

    function readSettings(payload) {
        const data = payload && payload.data && !Array.isArray(payload.data) ? payload.data : payload;
        const settings = data && (data.settings || data);
        if (Array.isArray(settings)) {
            settings.forEach(function (setting) {
                settingsByKey.set(setting.setting_key, setting.setting_value);
            });
            return;
        }
        if (settings && typeof settings === "object") {
            Object.keys(settings).forEach(function (key) {
                settingsByKey.set(key, settings[key]);
            });
        }
    }

    function setFormValues(form, keys) {
        keys.forEach(function (key) {
            if (settingsByKey.has(key) && form.elements[key]) {
                form.elements[key].value = settingsByKey.get(key);
            }
        });
    }

    function formValues(form) {
        const values = {};
        new FormData(form).forEach(function (value, key) {
            values[key] = value;
        });
        return values;
    }

    async function saveSettings(form, submitButton, successMessage) {
        if (!form.reportValidity()) return;
        submitButton.disabled = true;
        try {
            const values = formValues(form);
            const payload = await window.PosApi.put("store_settings", values);
            readSettings(payload);
            window.PosCommon.notify(successMessage, "success");
            settingsStatus.textContent = "Cài đặt đã được cập nhật.";
            settingsStatus.classList.remove("is-error");
        } catch (error) {
            window.PosCommon.notify("Không lưu được cài đặt: " + error.message, "danger");
            settingsStatus.textContent = error.message;
            settingsStatus.classList.add("is-error");
        } finally {
            submitButton.disabled = false;
        }
    }

    function setQrPreview(src, description) {
        if (!src) {
            qrPreview.hidden = true;
            qrPlaceholder.hidden = false;
            qrDescription.textContent = description || "";
            return;
        }
        qrPreview.src = src;
        qrPreview.hidden = false;
        qrPlaceholder.hidden = true;
        qrDescription.textContent = description || "";
    }

    async function loadSettings() {
        settingsStatus.textContent = "Đang tải cài đặt...";
        settingsStatus.classList.remove("is-error");
        try {
            const results = await Promise.all([
                window.PosApi.get("store_settings"),
                window.PosApi.get("payment_qrcodes")
            ]);
            readSettings(results[0]);
            setFormValues(businessForm, ["store_name", "store_address", "store_phone", "store_email", "store_tax_code"]);
            setFormValues(invoiceForm, ["order_prefix", "tax_rate", "receipt_thank_you", "return_policy_days"]);
            setFormValues(securityForm, ["invitation_link_expiry_seconds"]);
            if (!securityForm.elements.invitation_link_expiry_seconds.value) {
                securityForm.elements.invitation_link_expiry_seconds.value = "60";
            }
            const data = results[1] && results[1].data;
            const qrs = Array.isArray(data) ? data : data && (data.payment_qrcodes || data.qrcodes || data.items) || [];
            currentQr = qrs.find(function (item) {
                return Number(item.is_active) === 1 || item.is_active === true;
            }) || qrs[0] || null;
            if (currentQr) {
                qrToggle.checked = Number(currentQr.is_active) === 1 || currentQr.is_active === true;
                qrMethod.value = currentQr.payment_method || "vnpay";
                setQrPreview(currentQr.qr_code_path, currentQr.description);
            }
            settingsStatus.textContent = "Đã tải cài đặt cửa hàng.";
        } catch (error) {
            settingsStatus.textContent = error.message;
            settingsStatus.classList.add("is-error");
            window.PosCommon.notify("Không tải được cài đặt: " + error.message, "danger");
        }
    }

    businessForm.addEventListener("submit", function (event) {
        event.preventDefault();
        saveSettings(businessForm, businessForm.querySelector("[type='submit']"), "Đã lưu thông tin cửa hàng.");
    });
    invoiceForm.addEventListener("submit", function (event) {
        event.preventDefault();
        saveSettings(invoiceForm, invoiceForm.querySelector("[type='submit']"), "Đã lưu cấu hình hóa đơn.");
    });
    securityForm.addEventListener("submit", function (event) {
        event.preventDefault();
        saveSettings(securityForm, securityForm.querySelector("[type='submit']"), "Đã lưu cấu hình bảo mật.");
    });

    qrFile.addEventListener("change", function () {
        const file = qrFile.files[0];
        if (!file) return;
        if (!["image/png", "image/jpeg"].includes(file.type)) {
            qrFile.value = "";
            window.PosCommon.notify("Vui lòng chọn ảnh PNG hoặc JPG.", "warning");
            return;
        }
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(file);
        setQrPreview(previewUrl, file.name + " — bản xem trước");
    });

    qrToggle.addEventListener("change", async function () {
        if (!currentQr) {
            qrToggle.checked = false;
            window.PosCommon.notify("Hãy tải lên mã QR trước khi bật thanh toán QR.", "warning");
            return;
        }
        qrToggle.disabled = true;
        try {
            const result = await window.PosApi.put("payment_qrcodes/" + encodeURIComponent(currentQr.id), {
                is_active: qrToggle.checked ? 1 : 0
            });
            currentQr = result && result.data && (result.data.qrcode || result.data) || currentQr;
            qrStatus.textContent = qrToggle.checked ? "Đã bật thanh toán QR tại quầy." : "Đã tắt thanh toán QR tại quầy.";
            window.PosCommon.notify(qrStatus.textContent, "success");
        } catch (error) {
            qrToggle.checked = !qrToggle.checked;
            qrStatus.textContent = error.message;
            window.PosCommon.notify("Không cập nhật được trạng thái QR: " + error.message, "danger");
        } finally {
            qrToggle.disabled = false;
        }
    });

    qrForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!qrForm.reportValidity()) return;
        const file = qrFile.files[0];
        if (!file || !["image/png", "image/jpeg"].includes(file.type)) {
            window.PosCommon.notify("Vui lòng chọn tệp ảnh PNG hoặc JPG hợp lệ.", "warning");
            return;
        }
        const button = document.getElementById("save-payment-qr");
        button.disabled = true;
        qrStatus.textContent = "Đang tải ảnh mã QR...";
        try {
            const formData = new FormData();
            formData.append("qr_code", file);
            formData.append("payment_method", qrMethod.value);
            formData.append("description", "Mã QR thanh toán " + qrMethod.selectedOptions[0].text);
            const result = await window.PosApi.upload("payment_qrcodes", formData);
            const data = result && result.data;
            currentQr = data && (data.qrcode || data.payment_qrcode || data) || currentQr;
            if (currentQr && currentQr.id != null) {
                qrToggle.checked = Number(currentQr.is_active) === 1 || currentQr.is_active === true;
            }
            qrStatus.textContent = "Đã tải lên mã QR.";
            window.PosCommon.notify(qrStatus.textContent, "success");
        } catch (error) {
            qrStatus.textContent = error.message;
            window.PosCommon.notify("Không tải lên được mã QR: " + error.message, "danger");
        } finally {
            button.disabled = false;
        }
    });

    passwordForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!passwordForm.reportValidity()) return;
        const currentPassword = passwordForm.elements.current_password;
        const password = passwordForm.elements.password;
        const confirmation = passwordForm.elements.password_confirmation;
        if (password.value !== confirmation.value) {
            confirmation.setCustomValidity("Mật khẩu xác nhận không khớp.");
            confirmation.reportValidity();
            confirmation.setCustomValidity("");
            return;
        }
        const button = document.getElementById("change-admin-password");
        button.disabled = true;
        try {
            await window.PosApi.post("auth/change-password", {
                current_password: currentPassword.value,
                password: password.value,
                password_confirmation: confirmation.value
            });
            passwordForm.reset();
            window.PosCommon.notify("Đã đổi mật khẩu Admin.", "success");
        } catch (error) {
            window.PosCommon.notify("Không đổi được mật khẩu: " + error.message, "danger");
        } finally {
            button.disabled = false;
        }
    });

    window.addEventListener("beforeunload", function () {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    });

    loadSettings();
}());
