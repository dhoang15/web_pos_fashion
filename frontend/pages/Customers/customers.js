(function () {
    "use strict";

    const table = document.getElementById("customers-table");
    if (!table) return;

    const status = document.getElementById("customers-status");
    const search = document.getElementById("search-customers");
    const historyModalElement = document.getElementById("customer-history-modal");
    const historyModal = new window.bootstrap.Modal(historyModalElement);
    const historyStatus = document.getElementById("customer-history-status");
    const historyTable = document.getElementById("customer-orders-table");
    const orderDetail = document.getElementById("customer-order-detail");
    const customersById = new Map();
    let customers = [];
    let historyRequestSequence = 0;

    function customerName(customer) {
        return customer.full_name || customer.name ||
            [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Khách hàng";
    }

    function dateText(value, includeTime) {
        if (!value) return "—";
        const normalized = /^\d{4}-\d{2}-\d{2} \d/.test(String(value))
            ? String(value).replace(" ", "T")
            : value;
        const date = new Date(normalized);
        if (Number.isNaN(date.getTime())) return String(value);
        return includeTime ? date.toLocaleString("vi-VN") : date.toLocaleDateString("vi-VN");
    }

    function addCell(row, value, className) {
        const cell = document.createElement("td");
        cell.textContent = value == null || value === "" ? "—" : String(value);
        if (className) cell.className = className;
        row.append(cell);
        return cell;
    }

    function ordersFrom(payload) {
        try {
            return window.PosCommon.unwrapList(payload);
        } catch (error) {
            const data = payload && payload.data && typeof payload.data === "object" ? payload.data : payload;
            if (data && Array.isArray(data.orders)) return data.orders;
            throw error;
        }
    }

    function itemsOf(order) {
        return Array.isArray(order.items) ? order.items : Array.isArray(order.order_items) ? order.order_items : [];
    }

    function itemCount(order) {
        const reported = order.items_sold ?? order.total_items ?? order.product_count;
        if (reported != null && Number.isFinite(Number(reported))) return Number(reported);
        return itemsOf(order).reduce(function (sum, item) {
            return sum + (Number(item.quantity) || 0);
        }, 0);
    }

    function renderCustomers() {
        const query = search.value.trim().toLocaleLowerCase("vi");
        const visibleCustomers = customers.filter(function (customer) {
            return [customerName(customer), customer.phone, customer.address]
                .join(" ").toLocaleLowerCase("vi").includes(query);
        });

        table.replaceChildren();
        visibleCustomers.forEach(function (customer) {
            customersById.set(String(customer.id), customer);
            const row = document.createElement("tr");
            addCell(row, customerName(customer));
            addCell(row, customer.phone);
            addCell(row, customer.address);
            addCell(row, dateText(customer.created_at, false));
            const orderCount = customer.order_count ?? customer.purchase_count ?? customer.total_orders;
            addCell(row, orderCount == null ? "—" : Number(orderCount).toLocaleString("vi-VN"), "text-end");
            const totalSpent = customer.total_spent ?? customer.total_purchases ?? customer.amount_spent;
            addCell(row, totalSpent == null ? "—" : window.PosCommon.formatCurrency(totalSpent), "text-end text-nowrap");

            const actionCell = document.createElement("td");
            actionCell.className = "text-end text-nowrap";
            const historyButton = document.createElement("button");
            historyButton.className = "btn btn-sm btn-outline-primary";
            historyButton.type = "button";
            historyButton.dataset.customerHistoryId = String(customer.id);
            historyButton.textContent = "Xem lịch sử";
            actionCell.append(historyButton);
            row.append(actionCell);
            table.append(row);
        });

        if (!visibleCustomers.length) {
            const row = document.createElement("tr");
            const empty = document.createElement("td");
            empty.colSpan = 7;
            empty.className = "empty-state";
            empty.textContent = query ? "Không có khách hàng phù hợp." : "Chưa có khách hàng. Khách hàng được tạo khi thanh toán tại POS.";
            row.append(empty);
            table.append(row);
        }
    }

    function renderOrderDetails(order) {
        orderDetail.replaceChildren();
        orderDetail.hidden = false;
        const heading = document.createElement("h3");
        heading.className = "h6 fw-bold";
        heading.textContent = "Chi tiết đơn " + (order.order_number || "ORD-" + order.id);
        const items = itemsOf(order);
        const detailTable = document.createElement("table");
        detailTable.className = "table table-sm mb-2";
        const head = document.createElement("thead");
        const headRow = document.createElement("tr");
        ["Sản phẩm", "Số lượng", "Đơn giá", "Thành tiền"].forEach(function (label) {
            const cell = document.createElement("th");
            cell.scope = "col";
            cell.textContent = label;
            headRow.append(cell);
        });
        head.append(headRow);
        const body = document.createElement("tbody");
        items.forEach(function (item) {
            const row = document.createElement("tr");
            const product = item.product || item.products || {};
            addCell(row, product.name || item.product_name || "Sản phẩm");
            addCell(row, Number(item.quantity) || 0, "text-end");
            addCell(row, window.PosCommon.formatCurrency(item.unit_price ?? item.price), "text-end");
            addCell(row, window.PosCommon.formatCurrency(item.total_price ?? Number(item.unit_price || 0) * Number(item.quantity || 0)), "text-end");
            body.append(row);
        });
        if (!items.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 4;
            cell.textContent = "API chưa trả về các mặt hàng của đơn này.";
            row.append(cell);
            body.append(row);
        }
        detailTable.append(head, body);
        orderDetail.append(heading, detailTable);
    }

    async function openHistory(customer) {
        const requestSequence = ++historyRequestSequence;
        document.getElementById("customer-history-title").textContent = "Lịch sử mua hàng — " + customerName(customer);
        document.getElementById("customer-history-summary").textContent =
            [customer.phone, customer.address].filter(Boolean).join(" · ") || "Chưa có thông tin liên hệ";
        historyStatus.textContent = "Đang tải lịch sử giao dịch...";
        historyStatus.classList.remove("is-error");
        historyTable.replaceChildren();
        orderDetail.replaceChildren();
        orderDetail.hidden = true;
        historyModal.show();

        try {
            const payload = await window.PosApi.get("customers/" + encodeURIComponent(customer.id) + "/orders");
            if (requestSequence !== historyRequestSequence) return;
            const orders = ordersFrom(payload);
            historyTable.replaceChildren();
            orders.slice().sort(function (left, right) {
                return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime();
            }).forEach(function (order) {
                const row = document.createElement("tr");
                addCell(row, order.order_number || "ORD-" + order.id);
                addCell(row, dateText(order.created_at, true));
                addCell(row, itemCount(order).toLocaleString("vi-VN"), "text-end");
                addCell(row, window.PosCommon.formatCurrency(order.total_amount ?? order.total), "text-end text-nowrap");
                addCell(row, window.PosCommon.formatCurrency(order.amount_received), "text-end text-nowrap");
                addCell(row, window.PosCommon.formatCurrency(order.change_amount), "text-end text-nowrap");
                const actionCell = document.createElement("td");
                actionCell.className = "text-end";
                const detailButton = document.createElement("button");
                detailButton.className = "btn btn-sm btn-outline-secondary";
                detailButton.type = "button";
                detailButton.dataset.orderId = String(order.id);
                detailButton.textContent = "Chi tiết";
                actionCell.append(detailButton);
                row.append(actionCell);
                historyTable.append(row);
            });
            if (!orders.length) {
                const row = document.createElement("tr");
                const cell = document.createElement("td");
                cell.colSpan = 7;
                cell.className = "empty-state";
                cell.textContent = "Khách hàng chưa có đơn hàng.";
                row.append(cell);
                historyTable.append(row);
            }
            historyStatus.textContent = orders.length + " đơn hàng";
        } catch (error) {
            if (requestSequence !== historyRequestSequence) return;
            historyStatus.textContent = "Không tải được lịch sử: " + error.message;
            historyStatus.classList.add("is-error");
        }
    }

    async function openOrderDetail(orderId, button) {
        button.disabled = true;
        orderDetail.hidden = false;
        orderDetail.textContent = "Đang tải chi tiết đơn hàng...";
        try {
            const payload = await window.PosApi.get("orders/" + encodeURIComponent(orderId));
            const data = payload && payload.data && !Array.isArray(payload.data) ? payload.data : payload;
            const order = data && (data.order || data);
            if (!order || !order.id) throw new Error("Máy chủ không trả về chi tiết đơn hợp lệ.");
            renderOrderDetails(order);
        } catch (error) {
            orderDetail.textContent = "Không tải được chi tiết đơn: " + error.message;
        } finally {
            button.disabled = false;
        }
    }

    async function loadCustomers() {
        status.textContent = "Đang tải danh sách...";
        status.classList.remove("is-error");
        try {
            customers = window.PosCommon.unwrapList(await window.PosApi.get("customers"));
            status.textContent = customers.length + " khách hàng";
            renderCustomers();
        } catch (error) {
            customers = [];
            status.textContent = "Không tải được danh sách khách hàng: " + error.message;
            status.classList.add("is-error");
            renderCustomers();
        }
    }

    search.addEventListener("input", renderCustomers);
    table.addEventListener("click", function (event) {
        const button = event.target.closest("[data-customer-history-id]");
        if (!button) return;
        const customer = customersById.get(button.dataset.customerHistoryId);
        if (customer) openHistory(customer);
    });
    historyTable.addEventListener("click", function (event) {
        const button = event.target.closest("[data-order-id]");
        if (button) openOrderDetail(button.dataset.orderId, button);
    });

    loadCustomers();
}());
