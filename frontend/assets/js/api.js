(function () {
    "use strict";

    class ApiError extends Error {
        constructor(message, status, details) {
            super(message);
            this.name = "ApiError";
            this.status = status;
            this.details = details;
        }
    }

    const configuredBaseUrl = window.POS_API_BASE_URL || "/api/";
    const normalizedBaseUrl = String(configuredBaseUrl).replace(/\/?$/, "/");
    const baseUrl = new URL(normalizedBaseUrl, window.location.href);

    function getErrorMessage(payload) {
        if (!payload || typeof payload !== "object") return null;
        if (typeof payload.message === "string" && payload.message.trim()) return payload.message;

        const error = payload.error;
        if (typeof error === "string" && error.trim()) return error;
        if (error && typeof error.message === "string" && error.message.trim()) return error.message;

        const validationErrors = payload.errors;
        if (validationErrors && typeof validationErrors === "object") {
            const firstError = Object.values(validationErrors).flat().find(function (message) {
                return typeof message === "string" && message.trim();
            });
            if (firstError) return firstError;
        }
        return null;
    }

    async function request(path, options) {
        const settings = options || {};
        const normalizedPath = String(path).replace(/^\/+/, "");
        const allowedDuringFirstLogin = /^auth\/(?:login|logout|first-login|invitations\/validate)(?:[/?]|$)/.test(normalizedPath);
        if (sessionStorage.getItem("pos-first-login") === "1" && !allowedDuringFirstLogin) {
            throw new ApiError("Bạn cần đổi mật khẩu lần đầu trước khi sử dụng ứng dụng.", 403, {
                code: "PASSWORD_CHANGE_REQUIRED"
            });
        }

        const headers = new Headers(settings.headers || {});
        headers.set("Accept", "application/json");
        const csrfMeta = document.querySelector("meta[name='csrf-token']");
        if (csrfMeta && csrfMeta.content) headers.set("X-CSRF-TOKEN", csrfMeta.content);

        const requestOptions = {
            method: settings.method || "GET",
            headers: headers,
            credentials: "same-origin",
            signal: settings.signal
        };

        if (settings.body !== undefined) {
            if (settings.body instanceof FormData) {
                requestOptions.body = settings.body;
            } else {
                headers.set("Content-Type", "application/json");
                requestOptions.body = JSON.stringify(settings.body);
            }
        }

        let response;
        try {
            response = await fetch(new URL(normalizedPath, baseUrl), requestOptions);
        } catch (error) {
            if (error && error.name === "AbortError") {
                throw new ApiError("Yêu cầu đã bị hủy.", 0, error);
            }
            throw new ApiError("Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.", 0, error);
        }

        const responseText = await response.text();
        let payload = null;
        if (responseText) {
            try {
                payload = JSON.parse(responseText);
            } catch (error) {
                throw new ApiError("Máy chủ trả về dữ liệu không đúng định dạng JSON.", response.status, error);
            }
        }

        if (!response.ok) {
            if (response.status === 401 && !/^auth\/(login|logout|invitations\/validate|first-login)/.test(normalizedPath)) {
                window.dispatchEvent(new CustomEvent("pos:unauthorized", { detail: { path: path } }));
            }
            throw new ApiError(getErrorMessage(payload) || "Yêu cầu không thành công. Vui lòng thử lại.", response.status, payload);
        }

        return payload;
    }

    window.PosApi = Object.freeze({
        ApiError: ApiError,
        request: request,
        get: function (path, options) {
            return request(path, options);
        },
        post: function (path, body, options) {
            return request(path, Object.assign({}, options, { method: "POST", body: body }));
        },
        upload: function (path, body, method) {
            return request(path, { method: method || "POST", body: body });
        },
        put: function (path, body, options) {
            return request(path, Object.assign({}, options, { method: "PUT", body: body }));
        },
        delete: function (path, options) {
            return request(path, Object.assign({}, options, { method: "DELETE" }));
        }
    });
}());
