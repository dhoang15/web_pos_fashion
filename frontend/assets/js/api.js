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
    let csrfToken = "";
    let csrfRequest = null;

    async function getCsrfToken() {
        if (csrfToken) return csrfToken;
        if (!csrfRequest) {
            csrfRequest = fetch(new URL("auth/csrf-token", baseUrl), {
                method: "GET",
                headers: { Accept: "application/json" },
                credentials: "same-origin"
            }).then(async function (response) {
                let payload;
                try {
                    payload = await response.json();
                } catch (error) {
                    throw new ApiError("Không thể khởi tạo mã bảo mật CSRF.", response.status, error);
                }
                const data = payload && payload.data;
                if (!response.ok || !data || typeof data.csrf_token !== "string" || !data.csrf_token) {
                    throw new ApiError(getErrorMessage(payload) || "Không thể khởi tạo mã bảo mật CSRF.", response.status, payload);
                }
                csrfToken = data.csrf_token;
                return csrfToken;
            }).finally(function () {
                csrfRequest = null;
            });
        }
        return csrfRequest;
    }

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
        const csrfRetry = settings._csrfRetry === true;
        const allowedDuringFirstLogin = /^auth\/(?:login|logout|me|first-login)(?:[/?]|$)/.test(normalizedPath);
        if (sessionStorage.getItem("pos-first-login") === "1" && !allowedDuringFirstLogin) {
            throw new ApiError("Bạn cần đổi mật khẩu lần đầu trước khi sử dụng ứng dụng.", 403, {
                code: "PASSWORD_CHANGE_REQUIRED"
            });
        }

        const headers = new Headers(settings.headers || {});
        headers.set("Accept", "application/json");
        const csrfMeta = document.querySelector("meta[name='csrf-token']");
        const method = String(settings.method || "GET").toUpperCase();
        if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
            headers.set("X-CSRF-TOKEN", csrfMeta && csrfMeta.content ? csrfMeta.content : await getCsrfToken());
        }

        const requestOptions = {
            method: method,
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
        const endpoint = normalizedPath.split(/[?#]/)[0];
        const missingApiMessage = "Không tìm thấy API " + endpoint + " (404). Kiểm tra đường dẫn API hoặc trạng thái triển khai backend.";
        let payload = null;
        if (responseText) {
            try {
                payload = JSON.parse(responseText);
            } catch (error) {
                if (response.status === 404) {
                    throw new ApiError(missingApiMessage, 404, { code: "API_NOT_FOUND", endpoint: endpoint });
                }
                throw new ApiError("Máy chủ trả về dữ liệu không đúng định dạng JSON.", response.status, error);
            }
        }

        if (!response.ok) {
            if (!csrfRetry && response.status === 403 && payload && payload.error && payload.error.code === "CSRF_TOKEN_MISMATCH") {
                csrfToken = "";
                await getCsrfToken();
                return request(path, Object.assign({}, settings, { _csrfRetry: true }));
            }
            if (response.status === 401 || normalizedPath === "auth/logout") csrfToken = "";
            if (response.status === 401 && !/^auth\/(login|logout|invitations\/validate|first-login)/.test(normalizedPath)) {
                window.dispatchEvent(new CustomEvent("pos:unauthorized", { detail: { path: path } }));
            }
            throw new ApiError(getErrorMessage(payload) || (response.status === 404 ? missingApiMessage : "Yêu cầu không thành công. Vui lòng thử lại."), response.status, payload);
        }

        if (normalizedPath === "auth/logout") csrfToken = "";
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
