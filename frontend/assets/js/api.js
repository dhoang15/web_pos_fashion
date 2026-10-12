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

    const baseUrl = new URL("/api/", window.location.href);

    async function request(path, options) {
        const settings = options || {};
        const headers = new Headers(settings.headers || {});
        headers.set("Accept", "application/json");

        const requestOptions = {
            method: settings.method || "GET",
            headers: headers,
            credentials: "same-origin"
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
            response = await fetch(new URL(path.replace(/^\/+/, ""), baseUrl), requestOptions);
        } catch (error) {
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
            const error = payload && payload.error;
            const message = payload && typeof payload.message === "string"
                ? payload.message
                : typeof error === "string"
                    ? error
                    : error && typeof error.message === "string"
                        ? error.message
                        : null;
            throw new ApiError(message || "Yêu cầu không thành công. Vui lòng thử lại.", response.status, payload);
        }

        return payload;
    }

    window.PosApi = Object.freeze({
        ApiError: ApiError,
        request: request,
        get: function (path) {
            return request(path);
        },
        post: function (path, body) {
            return request(path, { method: "POST", body: body });
        },
        upload: function (path, body, method) {
            return request(path, { method: method || "POST", body: body });
        },
        put: function (path, body) {
            return request(path, { method: "PUT", body: body });
        },
        delete: function (path) {
            return request(path, { method: "DELETE" });
        }
    });
}());
