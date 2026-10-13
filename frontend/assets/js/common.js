(function () {
    "use strict";

    const body = document.body;
    const pageRoot = body.dataset.appRoot || "../..";
    const routes = {
        dashboard: "index.html",
        pos: "pages/pos/index.html",
        invoices: "pages/invoices/index.html",
        categories: "pages/products/index.html#categories",
        products: "pages/products/index.html",
        customers: "pages/Customers/index.html",
        users: "pages/users/index.html",
        reports: "pages/reports/index.html",
        settings: "pages/settings/index.html",
        profile: "pages/profile/index.html"
    };
    const roleRoutes = {
        admin: ["dashboard", "pos", "invoices", "products", "categories", "customers", "reports", "users", "settings", "profile"],
        staff: ["dashboard", "pos", "invoices", "products", "customers", "reports", "profile"],
        cashier: ["pos", "reports", "profile"]
    };
    const components = [
        ["#header-container", "components/header.html"],
        ["#sidebar-container", "components/sidebar.html"],
        ["#footer-container", "components/footer.html"]
    ];

    function notify(message, variant) {
        const container = document.getElementById("toast-container");
        if (!container || !window.bootstrap) {
            window.alert(message);
            return;
        }

        const toast = document.createElement("div");
        toast.className = "toast align-items-center text-bg-" + (variant || "danger") + " border-0";
        toast.setAttribute("role", "alert");
        toast.setAttribute("aria-live", "assertive");
        toast.setAttribute("aria-atomic", "true");

        const row = document.createElement("div");
        row.className = "d-flex";
        const messageBody = document.createElement("div");
        messageBody.className = "toast-body";
        messageBody.textContent = message;
        const close = document.createElement("button");
        close.className = "btn-close btn-close-white me-2 m-auto";
        close.type = "button";
        close.setAttribute("data-bs-dismiss", "toast");
        close.setAttribute("aria-label", "Đóng");
        row.append(messageBody, close);
        toast.append(row);
        container.append(toast);

        const instance = new window.bootstrap.Toast(toast, { delay: 4500 });
        toast.addEventListener("hidden.bs.toast", function () {
            toast.remove();
        }, { once: true });
        instance.show();
    }

    window.PosCommon = Object.freeze({
        notify: notify,
        errorMessage: function (error) {
            return error && error.message ? error.message : "Đã xảy ra lỗi không xác định.";
        },
        unwrapList: function (payload) {
            const listKeys = ["items", "products", "categories", "customers", "users", "orders", "invoices", "payment_qrcodes", "data"];
            let current = payload;
            for (let depth = 0; depth < 4 && current; depth += 1) {
                if (Array.isArray(current)) return current;
                if (typeof current !== "object") break;
                const listKey = listKeys.find(function (key) {
                    return Array.isArray(current[key]);
                });
                if (listKey) return current[listKey];
                const nestedKey = listKeys.find(function (key) {
                    return current[key] && typeof current[key] === "object";
                });
                if (!nestedKey) break;
                current = current[nestedKey];
            }
            throw new Error("Dữ liệu danh sách từ máy chủ không đúng định dạng.");
        },
        formatCurrency: function (amount) {
            return new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
                maximumFractionDigits: 0
            }).format(Number(amount) || 0);
        }
    });

    async function loadComponent(selector, path, componentRoot) {
        const target = document.querySelector(selector);
        if (!target) return;
        const response = await fetch(new URL(path, componentRoot));
        if (!response.ok) {
            throw new Error("Không tải được giao diện dùng chung (" + response.status + ").");
        }
        target.innerHTML = await response.text();
    }

    async function initializeLayout() {
        const componentRoot = new URL(pageRoot.replace(/\/?$/, "/"), window.location.href);
        await Promise.all(components.map(function (component) {
            return loadComponent(component[0], component[1], componentRoot);
        }));

        const role = sessionStorage.getItem("pos-role");
        const allowedRoutes = roleRoutes[role];
        const currentPage = body.dataset.page;
        if (!allowedRoutes) {
            window.location.replace(new URL("pages/auth/login.html", componentRoot).href);
            return;
        }

        const requestedRoute = currentPage === "products" && window.location.hash === "#categories"
            ? "categories"
            : currentPage;
        if (!allowedRoutes.includes(requestedRoute)) {
            if (currentPage === "products" && role !== "admin") {
                window.location.replace(new URL(routes.products, componentRoot).href);
                return;
            }
            const fallback = role === "admin" ? routes.dashboard : routes.pos;
            window.location.replace(new URL(fallback, componentRoot).href);
            return;
        }

        const userName = sessionStorage.getItem("pos-user-name") || "Người dùng";
        document.querySelectorAll(".topbar-user-name").forEach(function (element) {
            element.textContent = userName;
        });
        const activePage = currentPage === "products" && window.location.hash === "#categories"
            ? "categories"
            : currentPage;
        document.querySelectorAll(".sidebar-link[data-route]").forEach(function (link) {
            const key = link.dataset.route;
            link.hidden = !allowedRoutes.includes(key);
            if (routes[key]) link.href = new URL(routes[key], componentRoot).href;
            if (key === activePage) {
                link.classList.add("is-active");
                link.setAttribute("aria-current", "page");
            }
        });
        document.querySelectorAll("[data-route='profile']").forEach(function (link) {
            link.href = new URL(routes.profile, componentRoot).href;
        });
        document.querySelectorAll("[data-admin-only]").forEach(function (element) {
            element.hidden = role !== "admin";
        });
        document.querySelectorAll(".role-admin-only").forEach(function (element) {
            element.hidden = role !== "admin";
        });
        document.querySelectorAll(".topbar-page-title").forEach(function (element) {
            element.textContent = body.dataset.title || "Bảng điều khiển";
        });

    }

    document.addEventListener("click", function (event) {
        const pendingRoute = event.target.closest("[data-pending-route]");
        if (pendingRoute) {
            event.preventDefault();
            const label = pendingRoute.querySelector("span");
            notify("Màn hình " + (label ? label.textContent.trim() : "") + " chưa được kết nối.", "info");
            return;
        }

        const logoutButton = event.target.closest("[data-action='logout']");
        if (!logoutButton) return;
        logoutButton.disabled = true;
        window.PosApi.post("auth/logout", {}).then(function () {
            finishLogout();
        }).catch(function (error) {
            notify("Đã xóa phiên đăng nhập trên trình duyệt. Máy chủ chưa xác nhận đăng xuất: " +
                (error && error.message ? error.message : "lỗi kết nối."), "warning");
            finishLogout();
        });
    });

    function finishLogout() {
        ["pos-role", "pos-user-name", "pos-user-id", "pos-first-login", "pos-first-login-role"].forEach(function (key) {
            sessionStorage.removeItem(key);
        });
        window.location.replace(new URL("pages/auth/login.html", new URL(pageRoot.replace(/\/?$/, "/"), window.location.href)).href);
    }

    function redirectToFirstLoginIfRequired() {
        if (sessionStorage.getItem("pos-first-login") !== "1") return false;

        body.hidden = true;
        const componentRoot = new URL(pageRoot.replace(/\/?$/, "/"), window.location.href);
        const firstLoginUrl = new URL("pages/auth/first-login.html", componentRoot);
        window.location.replace(firstLoginUrl.href);
        return true;
    }

    window.addEventListener("pos:unauthorized", function () {
        finishLogout();
    });

    if (!redirectToFirstLoginIfRequired()) {
        initializeLayout().catch(function (error) {
            console.error(error);
            notify(error.message, "danger");
        });
    }
}());
