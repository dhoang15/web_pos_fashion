(function () {
    "use strict";

    const table = document.getElementById("users-table");
    if (!table) return;
    if (sessionStorage.getItem("pos-role") !== "admin") {
        document.body.hidden = true;
        return;
    }

    const form = document.getElementById("user-form");
    const formStatus = document.getElementById("user-form-status");
    const testEmailForm = document.getElementById("test-email-form");
    const testEmailStatus = document.getElementById("test-email-status");
    const testEmailButton = document.getElementById("send-test-email");
    const modal = window.PosCommon.createModal(document.getElementById("user-modal"));
    const detailModal = window.PosCommon.createModal(document.getElementById("employee-detail-modal"));
    const status = document.getElementById("users-status");
    const search = document.getElementById("search-users");
    const salesFilter = document.getElementById("employee-sales-filter");
    const salesTable = document.getElementById("employee-sales-table");
    const salesStatus = document.getElementById("employee-sales-status");
    const salesLoadButton = document.getElementById("employee-sales-load");
    const currentUserId = sessionStorage.getItem("pos-user-id");
    let users = [];
    let activeDetailUser = null;
    let salesRequestSequence = 0;

    function fullName(user) {
        return user.name || [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || "Nhân viên";
    }

    function needsActivation(user) {
        return user.status === "pending" || user.is_first_login === true || Number(user.is_first_login) === 1;
    }

    function isUnactivated(user) {
        return user.status !== "locked" && needsActivation(user);
    }

    function isInactive(user) {
        return user.status === "inactive" && !needsActivation(user);
    }

    function statusLabel(user) {
        if (user.status === "locked") return ["Bị khóa", "text-bg-danger"];
        if (needsActivation(user)) return ["Chưa kích hoạt", "text-bg-warning"];
        if (isInactive(user)) return ["Ngừng hoạt động", "text-bg-secondary"];
        if (user.status === "active") return ["Đang hoạt động", "text-bg-success"];
        return ["Không xác định", "text-bg-light text-dark"];
    }

    function roleLabel(role) {
        if (role === "admin") return "Quản trị viên";
        if (role === "cashier") return "Thu ngân";
        return "Nhân viên";
    }

    function createAvatarFallback(user) {
        const fallback = document.createElement("span");
        fallback.className = "user-list-avatar user-list-avatar-fallback";
        fallback.setAttribute("aria-hidden", "true");
        fallback.textContent = fullName(user).trim().charAt(0).toLocaleUpperCase("vi") || "?";
        return fallback;
    }

    function appendTextCell(row, text, className) {
        const cell = document.createElement("td");
        cell.textContent = text || "—";
        if (className) cell.className = className;
        row.append(cell);
        return cell;
    }

    function renderSummary() {
        document.getElementById("total-users").textContent = String(users.length);
        document.getElementById("active-users").textContent = String(users.filter(function (user) {
            return user.status === "active" && !needsActivation(user);
        }).length);
        document.getElementById("pending-users").textContent = String(users.filter(isUnactivated).length);
        document.getElementById("inactive-users").textContent = String(users.filter(isInactive).length);
    }

    function render() {
        const query = search.value.trim().toLocaleLowerCase("vi");
        const visible = users.filter(function (user) {
            return (fullName(user) + " " + (user.email || "")).toLocaleLowerCase("vi").includes(query);
        });
        table.replaceChildren();
        visible.forEach(function (user) {
            const row = document.createElement("tr");
            const identity = document.createElement("td");
            identity.className = "staff-identity";
            const avatarUrl = user.avatar;
            if (avatarUrl && avatarUrl !== "default-avatar.png") {
                const image = document.createElement("img");
                image.className = "user-list-avatar";
                image.alt = "";
                image.src = avatarUrl;
                image.onerror = function () {
                    image.replaceWith(createAvatarFallback(user));
                };
                identity.append(image);
            } else {
                identity.append(createAvatarFallback(user));
            }
            const nameWrap = document.createElement("span");
            nameWrap.className = "staff-identity-name";
            nameWrap.textContent = fullName(user);
            identity.append(nameWrap);
            row.append(identity);

            appendTextCell(row, user.email || "");
            appendTextCell(row, roleLabel(user.role));

            const stateCell = document.createElement("td");
            const badge = document.createElement("span");
            const state = statusLabel(user);
            badge.className = "badge " + state[1];
            badge.textContent = state[0];
            stateCell.append(badge);
            row.append(stateCell);

            appendTextCell(row, user.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : "");

            const actions = document.createElement("td");
            actions.className = "text-end text-nowrap";
            const detail = document.createElement("button");
            detail.className = "btn btn-sm btn-outline-primary me-1";
            detail.type = "button";
            detail.dataset.detailId = String(user.id);
            detail.setAttribute("aria-label", "Xem chi tiết và doanh số của " + fullName(user));
            detail.innerHTML = '<i class="bi bi-eye" aria-hidden="true"></i><span class="visually-hidden">Chi tiết</span>';
            actions.append(detail);

            if (String(user.id) !== currentUserId) {
                const actionLabel = user.status === "locked"
                    ? "Mở khóa"
                    : user.status === "inactive" && !needsActivation(user) ? "Kích hoạt" : "Khóa";
                const toggle = document.createElement("button");
                toggle.className = "btn btn-sm " + (user.status === "active" ? "btn-outline-secondary" : "btn-outline-success");
                toggle.type = "button";
                toggle.dataset.toggleId = String(user.id);
                toggle.dataset.userId = String(user.id);
                toggle.dataset.userAction = "status";
                toggle.textContent = actionLabel;
                actions.append(toggle);
            }
            if (isUnactivated(user)) {
                const resend = document.createElement("button");
                resend.className = "btn btn-sm btn-outline-primary ms-1";
                resend.type = "button";
                resend.dataset.resendId = String(user.id);
                resend.dataset.userId = String(user.id);
                resend.dataset.userAction = "resend-invitation";
                resend.textContent = "Gửi lại link 1 phút";
                resend.title = "Gửi lại liên kết email có hiệu lực trong 1 phút.";
                actions.append(resend);
            }
            row.append(actions);
            table.append(row);
        });
        if (!visible.length) {
            const row = document.createElement("tr");
            const empty = document.createElement("td");
            empty.colSpan = 6;
            empty.className = "empty-state";
            empty.textContent = "Không có nhân viên phù hợp.";
            row.append(empty);
            table.append(row);
        }
    }

    async function loadUsers() {
        status.textContent = "Đang tải danh sách...";
        status.classList.remove("is-error");
        try {
            users = window.PosCommon.unwrapList(await window.PosApi.get("users"));
            status.textContent = users.length + " tài khoản";
            renderSummary();
            render();
        } catch (error) {
            status.textContent = error.message;
            status.classList.add("is-error");
        }
    }

    function localDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return year + "-" + month + "-" + day;
    }

    function displayDate(value, includeTime) {
        if (!value) return "—";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "—";
        return date.toLocaleString("vi-VN", includeTime
            ? { dateStyle: "short", timeStyle: "short" }
            : { dateStyle: "medium" });
    }

    function setDetailAvatar(user) {
        const avatar = document.getElementById("employee-detail-avatar");
        const initial = fullName(user).trim().charAt(0).toLocaleUpperCase("vi") || "?";
        avatar.className = "user-list-avatar user-list-avatar-fallback";
        avatar.replaceChildren(document.createTextNode(initial));

        const avatarUrl = user.avatar;
        if (!avatarUrl || avatarUrl === "default-avatar.png") return;

        const image = document.createElement("img");
        image.className = "user-list-avatar";
        image.alt = "";
        image.src = avatarUrl;
        image.onerror = function () {
            avatar.className = "user-list-avatar user-list-avatar-fallback";
            avatar.replaceChildren(document.createTextNode(initial));
        };
        avatar.className = "user-list-avatar";
        avatar.replaceChildren(image);
    }

    function showEmployeeDetail(user) {
        activeDetailUser = user;
        document.getElementById("employee-detail-title").textContent = "Chi tiết nhân viên — " + fullName(user);
        document.getElementById("employee-detail-name").textContent = fullName(user);
        document.getElementById("employee-detail-email").textContent = user.email || user.username || "Chưa có email";
        document.getElementById("employee-detail-phone").textContent = user.phone || user.phone_number || user.mobile || "—";
        document.getElementById("employee-detail-role").textContent = roleLabel(user.role);
        document.getElementById("employee-detail-account-status").textContent = statusLabel(user)[0];
        document.getElementById("employee-detail-created").textContent = displayDate(user.created_at, false);
        document.getElementById("employee-detail-status").textContent = "Thông tin tài khoản nhân viên.";
        setDetailAvatar(user);

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        salesFilter.elements.from.value = localDate(startOfMonth);
        salesFilter.elements.to.value = localDate(today);
        detailModal.show();
        loadEmployeeSales();
    }

    function reportOrders(payload) {
        const data = payload && payload.data && !Array.isArray(payload.data) ? payload.data : payload;
        if (Array.isArray(data)) return data;
        if (!data || typeof data !== "object") return [];
        if (Array.isArray(data.orders)) return data.orders;
        if (Array.isArray(data.items)) return data.items;
        if (Array.isArray(data.data)) return data.data;
        if (data.data && typeof data.data === "object") {
            if (Array.isArray(data.data.orders)) return data.data.orders;
            if (Array.isArray(data.data.items)) return data.data.items;
        }
        return [];
    }

    function lineItems(order) {
        if (Array.isArray(order.items)) return order.items;
        if (Array.isArray(order.order_items)) return order.order_items;
        return [];
    }

    function productQuantity(order) {
        const reportedQuantity = order.items_sold ?? order.total_items ?? order.quantity_sold;
        if (reportedQuantity != null && Number.isFinite(Number(reportedQuantity))) return Number(reportedQuantity);
        return lineItems(order).reduce(function (total, item) {
            return total + (Number(item.quantity) || 0);
        }, 0);
    }

    function appendSalesCell(row, value, className) {
        const cell = document.createElement("td");
        cell.textContent = value == null || value === "" ? "—" : String(value);
        if (className) cell.className = className;
        row.append(cell);
        return cell;
    }

    function renderSalesRows(orders) {
        salesTable.replaceChildren();
        const sortedOrders = orders.slice().sort(function (left, right) {
            return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime();
        });

        sortedOrders.forEach(function (order) {
            const row = document.createElement("tr");
            appendSalesCell(row, order.order_number || order.id);
            appendSalesCell(row, displayDate(order.created_at, true));
            const customer = order.customer || {};
            appendSalesCell(row, customer.full_name || customer.name || order.customer_name || order.customer_snapshot_name || "Khách lẻ");
            appendSalesCell(row, productQuantity(order).toLocaleString("vi-VN"), "text-end");
            appendSalesCell(row, window.PosCommon.formatCurrency(order.total_amount ?? order.total), "text-end text-nowrap");

            const stateCell = document.createElement("td");
            const badge = document.createElement("span");
            const isComplete = order.status === "completed";
            badge.className = "badge " + (isComplete ? "text-bg-success" : order.status === "cancelled" ? "text-bg-secondary" : "text-bg-warning");
            badge.textContent = isComplete ? "Hoàn tất" : order.status === "cancelled" ? "Đã hủy" : order.status || "Đang xử lý";
            stateCell.append(badge);
            row.append(stateCell);
            salesTable.append(row);
        });

        if (!sortedOrders.length) {
            const row = document.createElement("tr");
            const empty = document.createElement("td");
            empty.colSpan = 6;
            empty.className = "empty-state";
            empty.textContent = "Không có đơn hàng của nhân viên trong khoảng thời gian này.";
            row.append(empty);
            salesTable.append(row);
        }
    }

    async function loadEmployeeSales() {
        if (!activeDetailUser) return;

        const requestSequence = ++salesRequestSequence;
        const from = salesFilter.elements.from.value;
        const to = salesFilter.elements.to.value;
        if (!from || !to || from > to) {
            salesStatus.textContent = "Hãy chọn khoảng ngày hợp lệ.";
            salesStatus.classList.add("is-error");
            salesLoadButton.disabled = false;
            return;
        }

        const user = activeDetailUser;
        const query = new URLSearchParams({
            user_id: String(user.id),
            from: from,
            to: to
        });
        salesStatus.textContent = "Đang tải doanh số nhân viên...";
        salesStatus.classList.remove("is-error");
        salesLoadButton.disabled = true;
        document.getElementById("employee-sales-total").textContent = "—";
        document.getElementById("employee-sales-orders").textContent = "—";
        document.getElementById("employee-sales-items").textContent = "—";
        salesTable.replaceChildren();
        const loadingRow = document.createElement("tr");
        const loadingCell = document.createElement("td");
        loadingCell.colSpan = 6;
        loadingCell.className = "empty-state";
        loadingCell.textContent = "Đang tải đơn hàng...";
        loadingRow.append(loadingCell);
        salesTable.append(loadingRow);

        try {
            const response = await window.PosApi.get("reports/sales?" + query.toString());
            if (requestSequence !== salesRequestSequence) return;

            const data = response && response.data && !Array.isArray(response.data) ? response.data : response || {};
            const summary = data.summary || {};
            const orders = reportOrders(response).filter(function (order) {
                return !order.status || order.status === "completed";
            });
            const reportedRevenue = summary.total_received ?? summary.total_revenue ?? summary.revenue;
            const totalReceived = reportedRevenue == null
                ? orders.reduce(function (total, order) {
                    return total + (Number(order.total_amount ?? order.total) || 0);
                }, 0)
                : Number(reportedRevenue) || 0;
            const orderCount = summary.order_count ?? summary.total_orders ?? orders.length;
            const itemsSold = summary.items_sold ?? summary.total_items_sold ?? summary.product_count ?? summary.total_items ??
                orders.reduce(function (total, order) {
                    return total + productQuantity(order);
                }, 0);

            document.getElementById("employee-sales-total").textContent = window.PosCommon.formatCurrency(totalReceived);
            document.getElementById("employee-sales-orders").textContent = Number(orderCount).toLocaleString("vi-VN");
            document.getElementById("employee-sales-items").textContent = Number(itemsSold).toLocaleString("vi-VN");
            renderSalesRows(orders);
            salesStatus.textContent = Number(orderCount).toLocaleString("vi-VN") + " đơn hàng trong khoảng " + displayDate(from, false) + " – " + displayDate(to, false) + ".";
        } catch (error) {
            if (requestSequence !== salesRequestSequence) return;
            salesStatus.textContent = error.message || "Không tải được doanh số nhân viên.";
            salesStatus.classList.add("is-error");
            renderSalesRows([]);
        } finally {
            if (requestSequence === salesRequestSequence) salesLoadButton.disabled = false;
        }
    }

    document.getElementById("add-user").addEventListener("click", function () {
        form.reset();
        form.elements.name.setCustomValidity("");
        formStatus.textContent = "";
        formStatus.classList.remove("is-error");
        modal.show();
    });
    search.addEventListener("input", render);
    testEmailForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        testEmailButton.disabled = true;
        testEmailStatus.textContent = "Đang kết nối SMTP và gửi email thử...";
        testEmailStatus.classList.remove("is-error");
        try {
            const response = await window.PosApi.post("users/test-email", {});
            testEmailStatus.textContent = response.data.message + " (" + response.data.recipient + ")";
            window.PosCommon.notify(testEmailStatus.textContent, "success");
        } catch (error) {
            testEmailStatus.textContent = "Không gửi được email thử: " + error.message;
            testEmailStatus.classList.add("is-error");
            window.PosCommon.notify(testEmailStatus.textContent, "danger");
        } finally {
            testEmailButton.disabled = false;
        }
    });
    salesFilter.addEventListener("submit", function (event) {
        event.preventDefault();
        loadEmployeeSales();
    });
    table.addEventListener("click", async function (event) {
        const detail = event.target.closest("[data-detail-id]");
        const toggle = event.target.closest("[data-toggle-id]");
        const resend = event.target.closest("[data-resend-id]");
        if (detail) {
            const user = users.find(function (item) {
                return String(item.id) === detail.dataset.detailId;
            });
            if (user) showEmployeeDetail(user);
            return;
        }
        if (!toggle && !resend) return;
        const button = toggle || resend;
        const user = users.find(function (item) {
            return String(item.id) === button.dataset[toggle ? "toggleId" : "resendId"];
        });
        if (!user) return;

        button.disabled = true;
        try {
            if (toggle) {
                const nextStatus = user.status === "locked"
                    ? needsActivation(user) ? "inactive" : "active"
                    : user.status === "inactive" && !needsActivation(user) ? "active" : "locked";
                await window.PosApi.put("users/" + encodeURIComponent(user.id) + "/status", {
                    status: nextStatus
                });
                window.PosCommon.notify(nextStatus === "locked"
                    ? "Đã khóa tài khoản."
                    : nextStatus === "active" ? "Đã kích hoạt/mở khóa tài khoản." : "Đã mở khóa; nhân viên vẫn cần kích hoạt qua email.", "success");
            } else {
                await window.PosApi.post("users/" + encodeURIComponent(user.id) + "/resend-invitation", {});
                window.PosCommon.notify("Đã gửi lại liên kết kích hoạt.", "success");
            }
            await loadUsers();
        } catch (error) {
            window.PosCommon.notify(error.message, "danger");
        } finally {
            button.disabled = false;
        }
    });
    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        form.elements.name.value = form.elements.name.value.trim().replace(/\s+/g, " ");
        form.elements.email.value = form.elements.email.value.trim().toLocaleLowerCase("en-US");
        form.elements.phone.value = form.elements.phone.value.trim().replace(/[\s.-]/g, "");
        form.elements.name.setCustomValidity(form.elements.name.value ? "" : "Nhập họ tên nhân viên.");
        if (!form.reportValidity()) return;
        const button = document.getElementById("save-user");
        const fullNameValue = form.elements.name.value.trim().replace(/\s+/g, " ");
        const emailValue = form.elements.email.value.trim().toLocaleLowerCase("en-US");
        if (!/^[^\s@]+@gmail\.com$/i.test(emailValue)) {
            window.PosCommon.notify("Email nhân viên phải là địa chỉ Gmail.", "warning");
            form.elements.email.focus();
            return;
        }
        const nameParts = fullNameValue.split(" ");
        const user = {
            first_name: nameParts.shift() || "",
            last_name: nameParts.join(" "),
            phone: form.elements.phone.value.trim(),
            email: emailValue
        };
        if (user.first_name.length > 50 || user.last_name.length > 50) {
            formStatus.textContent = "Phần họ và phần tên phải nằm trong giới hạn 50 ký tự của hệ thống.";
            formStatus.classList.add("is-error");
            return;
        }
        button.disabled = true;
        formStatus.textContent = "Đang tạo tài khoản nhân viên...";
        formStatus.classList.remove("is-error");
        try {
            await window.PosApi.post("users", user);
            modal.hide();
            window.PosCommon.notify("Đã tạo nhân viên và gửi liên kết kích hoạt.", "success");
            await loadUsers();
        } catch (error) {
            formStatus.textContent = "Không thể tạo nhân viên: " + error.message;
            formStatus.classList.add("is-error");
            window.PosCommon.notify(error.message, "danger");
            const details = error.details && error.details.error;
            if (details && details.code === "INVITATION_EMAIL_FAILED") {
                modal.hide();
                await loadUsers();
            }
        } finally {
            button.disabled = false;
        }
    });

    form.elements.name.addEventListener("input", function () { this.setCustomValidity(""); });

    loadUsers();
}());
