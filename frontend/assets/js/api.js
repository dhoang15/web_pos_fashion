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
    const demoUsers = [
        {
            id: 1,
            username: "admin.demo",
            email: "admin.demo@example.test",
            password: "Admin123!",
            role: "admin",
            first_name: "Quản trị",
            last_name: "Demo",
            status: "active",
            is_first_login: 0
        },
        {
            id: 2,
            username: "staff.demo",
            email: "staff.demo@example.test",
            password: "Staff123!",
            role: "staff",
            first_name: "Nhân viên",
            last_name: "Demo",
            status: "active",
            is_first_login: 0
        }
    ];
    const demoCollections = {
        products: [
            {
                id: 1,
                name: "Áo thun Basic Demo",
                sku: "DEMO-TS-01",
                barcode: "DEMO0001",
                price: 199000,
                import_price: 90000,
                stock_quantity: 25,
                low_stock_threshold: 5,
                size: "M",
                color: "Trắng",
                material: "Cotton",
                category_id: 1,
                category_name: "Áo",
                status: "active",
                created_at: "2026-01-10T09:00:00+07:00",
                has_orders: false
            },
            {
                id: 2,
                name: "Quần jeans Demo",
                sku: "DEMO-JN-01",
                barcode: "DEMO0002",
                price: 399000,
                import_price: 180000,
                stock_quantity: 12,
                low_stock_threshold: 3,
                size: "L",
                color: "Xanh",
                material: "Denim",
                category_id: 2,
                category_name: "Quần",
                status: "active",
                created_at: "2026-01-11T09:00:00+07:00",
                has_orders: false
            }
        ],
        categories: [
            { id: 1, name: "Áo", description: "Danh mục demo", created_at: "2026-01-10T09:00:00+07:00", created_by_name: "Quản trị Demo" },
            { id: 2, name: "Quần", description: "Danh mục demo", created_at: "2026-01-11T09:00:00+07:00", created_by_name: "Quản trị Demo" }
        ],
        customers: [
            { id: 1, full_name: "Khách hàng Demo", phone: "0900000001", address: "Địa chỉ mẫu" }
        ],
        orders: [],
        payment_qrcodes: []
    };

    function getBodyValues(body) {
        const values = {};
        if (body instanceof FormData) {
            body.forEach(function (value, key) {
                values[key] = value;
            });
            return values;
        }
        return body || values;
    }

    function nextId(items) {
        return items.reduce(function (maximum, item) {
            return Math.max(maximum, Number(item.id) || 0);
        }, 0) + 1;
    }

    function mutateDemoCollection(collectionName, method, id, body) {
        if (sessionStorage.getItem("pos-role") !== "admin") {
            throw new ApiError("Bạn không có quyền thay đổi dữ liệu quản lý.", 403);
        }
        const items = demoCollections[collectionName];
        const index = id == null ? -1 : items.findIndex(function (item) {
            return String(item.id) === String(id);
        });
        if (id != null && index < 0) {
            throw new ApiError("Không tìm thấy dữ liệu cần cập nhật.", 404);
        }

        if (method === "DELETE") {
            if (collectionName === "products" && items[index].has_orders) {
                throw new ApiError("Không thể xóa sản phẩm đã nằm trong đơn hàng.", 409);
            }
            if (collectionName === "categories" && demoCollections.products.some(function (product) {
                return String(product.category_id) === String(id);
            })) {
                throw new ApiError("Không thể xóa danh mục đang được sản phẩm sử dụng.", 409);
            }
            items.splice(index, 1);
            return { success: true };
        }

        const values = getBodyValues(body);
        const file = values.image_file;
        delete values._method;
        delete values.image_file;
        if (file instanceof File && file.size > 0) {
            values.image = URL.createObjectURL(file);
        }
        if (collectionName === "products" && items.some(function (product) {
            return product.barcode === values.barcode && String(product.id) !== String(id);
        })) {
            throw new ApiError("Barcode đã được sử dụng cho sản phẩm khác.", 409);
        }

        if (method === "POST") {
            const item = Object.assign({
                id: nextId(items),
                created_at: new Date().toISOString(),
                has_orders: false
            }, values);
            if (collectionName === "categories") {
                item.created_by = Number(sessionStorage.getItem("pos-user-id")) || null;
                item.created_by_name = sessionStorage.getItem("pos-user-name") || "Quản trị viên";
            }
            items.push(item);
            return { success: true, item: item };
        }

        const item = Object.assign({}, items[index], values);
        items[index] = item;
        return { success: true, item: item };
    }

    function demoRequest(path, options) {
        const settings = options || {};
        const body = settings.body;
        const bodyValues = getBodyValues(body);
        const method = settings.method === "POST" && bodyValues._method
            ? String(bodyValues._method).toUpperCase()
            : settings.method || "GET";
        const normalizedPath = path.replace(/^\/+/, "").split("?")[0].replace(/\/+$/, "");

        if (method === "POST" && normalizedPath === "auth/login") {
            const userInput = settings.body || {};
            const user = demoUsers.find(function (item) {
                return item.username === userInput.username && item.password === userInput.password;
            });
            if (!user) {
                throw new ApiError("Tên đăng nhập hoặc mật khẩu demo không đúng.", 401);
            }
            return { user: user };
        }

        if (method === "POST" && normalizedPath === "auth/logout") return { success: true };
        if (method === "GET" && normalizedPath === "auth/me") {
            const currentUser = demoUsers.find(function (item) {
                return String(item.id) === sessionStorage.getItem("pos-user-id");
            });
            return { user: currentUser || demoUsers.find(function (item) {
                return item.role === sessionStorage.getItem("pos-role");
            }) || demoUsers[0] };
        }
        if (method === "GET" && normalizedPath === "users") {
            return { items: demoUsers.map(function (user) {
                const copy = Object.assign({}, user);
                delete copy.password;
                return copy;
            }) };
        }
        if (method === "GET" && normalizedPath === "store_settings") {
            return { data: { settings: { store_name: "B'TRIPLE POS — Demo", tax_rate: 10, order_prefix: "DEMO" } } };
        }
        if (method === "GET" && normalizedPath === "reports/sales") {
            return { data: { items: [], summary: {}, trend: [] } };
        }
        if (method === "GET" && Object.prototype.hasOwnProperty.call(demoCollections, normalizedPath)) {
            const items = demoCollections[normalizedPath];
            if (normalizedPath === "products" && sessionStorage.getItem("pos-role") !== "admin") {
                return { items: items.map(function (item) {
                    const copy = Object.assign({}, item);
                    delete copy.import_price;
                    return copy;
                }) };
            }
            return { items: items };
        }
        if (method === "GET" && normalizedPath === "customers/lookup") {
            return { customer: null };
        }
        const collectionMatch = normalizedPath.match(/^(products|categories)(?:\/(\d+))?$/);
        if (collectionMatch && ["POST", "PUT", "DELETE"].includes(method)) {
            return mutateDemoCollection(collectionMatch[1], method, collectionMatch[2] || null, body);
        }
        if (["POST", "PUT", "DELETE"].includes(method) &&
            (/^(auth\/(profile|change-password)|store_settings|payment_qrcodes|users(?:\/\d+(?:\/(?:status|resend-invitation))?)?|products(?:\/\d+)?|categories(?:\/\d+)?|customers(?:\/\d+)?|orders)$/.test(normalizedPath))) {
            return { success: true };
        }

        throw new ApiError("API này chưa được mô phỏng trong chế độ demo: " + method + " " + normalizedPath, 501);
    }

    async function request(path, options) {
        const settings = options || {};
        if (sessionStorage.getItem("pos-demo-mode") === "1") {
            return demoRequest(path, settings);
        }

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
