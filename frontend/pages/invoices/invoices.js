(function () {
    "use strict";

        const table = document.getElementById("invoices-table");
        const status = document.getElementById("invoice-status");
        const searchInput = document.getElementById("invoice-search");
        const paymentSelect = document.getElementById("invoice-payment-method");
        const dateFrom = document.getElementById("invoice-date-from");
        const dateTo = document.getElementById("invoice-date-to");
        const exportButton = document.getElementById("export-invoices");
        const detailModal = window.PosCommon.createModal(document.getElementById("invoice-detail-modal"));
        const currentOrders = new Map();
        let currentInvoice = null;
        let isLoaded = false;
        let todayStats = null;
        let invoiceRequestSequence = 0;

        function localDate(date) {
            return [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, "0"),
                String(date.getDate()).padStart(2, "0")
            ].join("-");
        }

        function setStatus(message, isError) {
            status.textContent = message || "";
            status.classList.toggle("is-error", Boolean(isError));
        }

        function getData(payload) {
            if (payload && payload.data && !Array.isArray(payload.data)) return payload.data;
            return payload;
        }

        function getOrders(payload) {
            const data = getData(payload);
            if (Array.isArray(data)) return data;
            if (data && Array.isArray(data.orders)) return data.orders;
            if (data && Array.isArray(data.items)) return data.items;
            if (data && Array.isArray(data.data)) return data.data;
            throw new Error("Dữ liệu hóa đơn từ máy chủ không đúng định dạng.");
        }

        function getCustomer(order) {
            return order.customer || order.customers || {};
        }

        function getCashier(order) {
            return order.user || order.cashier || order.users || {};
        }

        function fullName(record) {
            return record.full_name || record.name ||
                [record.first_name, record.last_name].filter(Boolean).join(" ") || "";
        }

        function formatDate(value) {
            if (!value) return "—";
            const normalized = /^\d{4}-\d{2}-\d{2} \d/.test(String(value))
                ? String(value).replace(" ", "T")
                : value;
            const date = new Date(normalized);
            return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("vi-VN");
        }

        function paymentLabel(method) {
            const labels = { cash: "Tiền mặt", card: "Thẻ", qr_code: "Chuyển khoản / QR" };
            return labels[method] || method || "—";
        }

        function paymentBadge(method) {
            const badge = document.createElement("span");
            badge.className = "invoice-payment-badge " +
                (method === "cash" ? "invoice-payment-cash" :
                    method === "card" ? "invoice-payment-card" :
                        method === "qr_code" ? "invoice-payment-qr" : "invoice-payment-other");
            const icon = document.createElement("i");
            icon.className = method === "cash" ? "bi bi-cash-coin" :
                method === "card" ? "bi bi-credit-card" :
                    method === "qr_code" ? "bi bi-qr-code" : "bi bi-wallet2";
            icon.setAttribute("aria-hidden", "true");
            badge.append(icon, document.createTextNode(paymentLabel(method)));
            return badge;
        }

        function addCell(row, text, className) {
            const cell = document.createElement("td");
            cell.textContent = text == null || text === "" ? "—" : String(text);
            if (className) cell.className = className;
            row.append(cell);
            return cell;
        }

        function renderOrders(orders) {
            table.replaceChildren();
            currentOrders.clear();
            orders.forEach(function (order) {
                currentOrders.set(String(order.id), order);
                const row = document.createElement("tr");
                row.dataset.orderRowId = String(order.id);
                row.tabIndex = 0;
                row.setAttribute("aria-label", "Mở hóa đơn " + (order.order_number || order.id));

                const numberCell = document.createElement("td");
                const numberButton = document.createElement("button");
                numberButton.className = "invoice-number-button";
                numberButton.type = "button";
                numberButton.dataset.orderAction = "view";
                numberButton.dataset.orderId = String(order.id);
                numberButton.textContent = order.order_number || "ORD-" + order.id;
                numberCell.append(numberButton);
                row.append(numberCell);

                addCell(row, formatDate(order.created_at), "text-nowrap");

                const customer = getCustomer(order);
                const customerCell = document.createElement("td");
                const customerName = document.createElement("span");
                customerName.className = "invoice-customer-name";
                customerName.textContent = fullName(customer) || order.customer_name || order.customer_snapshot_name || "Khách lẻ";
                const customerPhone = document.createElement("span");
                customerPhone.className = "invoice-customer-phone";
                customerPhone.textContent = customer.phone || order.customer_phone || order.customer_snapshot_phone || "";
                customerCell.append(customerName, customerPhone);
                row.append(customerCell);

                const cashier = getCashier(order);
                addCell(row, fullName(cashier) || order.cashier_name || order.user_name || "—");

                const methodCell = document.createElement("td");
                methodCell.append(paymentBadge(order.payment_method));
                row.append(methodCell);

                const paymentAmounts = document.createElement("td");
                paymentAmounts.className = "text-nowrap";
                const received = document.createElement("span");
                received.className = "d-block small";
                received.textContent = window.PosCommon.formatCurrency(order.amount_received);
                const change = document.createElement("span");
                change.className = "invoice-muted";
                change.textContent = "Thối: " + window.PosCommon.formatCurrency(order.change_amount);
                paymentAmounts.append(received, change);
                row.append(paymentAmounts);

                addCell(row, window.PosCommon.formatCurrency(order.total_amount), "invoice-total text-end");

                const actionCell = document.createElement("td");
                const actionGroup = document.createElement("div");
                actionGroup.className = "invoice-action-group";
                const actions = order.status === "pending"
                    ? [
                        ["view", "bi-eye", "Xem đơn nháp " + (order.order_number || order.id)],
                        ["resume", "bi-play-circle", "Tiếp tục đơn " + (order.order_number || order.id)]
                    ]
                    : [
                        ["view", "bi-eye", "Xem chi tiết đơn " + (order.order_number || order.id)],
                        ["print", "bi-printer", "In lại hóa đơn " + (order.order_number || order.id)]
                    ];
                actions.forEach(function (action) {
                    const button = document.createElement("button");
                    button.className = "invoice-action-button";
                    button.type = "button";
                    button.dataset.orderAction = action[0];
                    button.dataset.orderId = String(order.id);
                    button.setAttribute("aria-label", action[2]);
                    const icon = document.createElement("i");
                    icon.className = "bi " + action[1];
                    icon.setAttribute("aria-hidden", "true");
                    button.append(icon);
                    actionGroup.append(button);
                });
                actionCell.append(actionGroup);
                row.append(actionCell);
                table.append(row);
            });

            if (!orders.length) {
                const row = document.createElement("tr");
                const cell = document.createElement("td");
                cell.colSpan = 8;
                cell.className = "invoice-empty";
                cell.textContent = "Không tìm thấy hóa đơn phù hợp với bộ lọc.";
                row.append(cell);
                table.append(row);
            }
            document.getElementById("invoice-result-count").textContent = orders.length + " hóa đơn";
            exportButton.disabled = false;
            isLoaded = true;
        }

        function renderTodayStats(summary, orders) {
            const completedOrders = orders.filter(function (order) {
                return order.status === "completed";
            });
            const reportedOrderCount = summary.order_count ?? summary.total_orders ?? summary.total_count;
            const reportedRevenue = summary.total_received ?? summary.total_revenue ?? summary.revenue;
            const orderCount = Number(reportedOrderCount ?? completedOrders.length);
            const received = reportedRevenue == null
                ? completedOrders.reduce(function (sum, order) {
                    return sum + (Number(order.total_amount) || 0);
                }, 0)
                : Number(reportedRevenue) || 0;
            document.getElementById("today-order-count").textContent = orderCount.toLocaleString("vi-VN") + " đơn";
            document.getElementById("today-revenue").textContent = window.PosCommon.formatCurrency(received);
            document.getElementById("today-average").textContent = window.PosCommon.formatCurrency(orderCount ? received / orderCount : 0) + "/đơn";
            todayStats = { orderCount: orderCount, received: received };
        }

        function rangeFor(name) {
            const today = new Date();
            const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const end = new Date(start);
            if (name === "yesterday") {
                start.setDate(start.getDate() - 1);
                end.setDate(end.getDate() - 1);
            } else if (name === "7days") {
                start.setDate(start.getDate() - 6);
            } else if (name === "this_month") {
                start.setDate(1);
            }
            return { from: localDate(start), to: localDate(end) };
        }

        function activateRange(button) {
            document.querySelectorAll("[data-range]").forEach(function (item) {
                const active = item === button;
                item.classList.toggle("is-active", active);
                item.setAttribute("aria-pressed", String(active));
            });
        }

        async function loadInvoices() {
            const requestSequence = ++invoiceRequestSequence;
            const from = dateFrom.value;
            const to = dateTo.value;
            const applyButton = document.getElementById("apply-invoice-filters");
            if (!from || !to || from > to) {
                setStatus("Vui lòng chọn khoảng ngày hợp lệ.", true);
                applyButton.disabled = false;
                dateFrom.focus();
                return;
            }

            applyButton.disabled = true;
            exportButton.disabled = true;
            table.innerHTML = '<tr><td class="invoice-loading" colspan="8">Đang tải danh sách hóa đơn...</td></tr>';
            setStatus("Đang tải hóa đơn...", false);
            document.getElementById("invoice-period-label").textContent = from + " — " + to;

            const query = new URLSearchParams({ from: from, to: to });
            const search = searchInput.value.trim();
            const method = paymentSelect.value;
            if (search) query.set("search", search);
            if (method) query.set("payment_method", method);

            try {
                const isTodayRange = from === localDate(new Date()) && to === localDate(new Date());
                const summaryRequest = todayStats || isTodayRange
                    ? Promise.resolve(null)
                    : window.PosApi.get("reports/sales?" + new URLSearchParams({
                        from: localDate(new Date()),
                        to: localDate(new Date())
                    }).toString()).catch(function () { return null; });
                const [listPayload, summaryPayload] = await Promise.all([
                    window.PosApi.get("orders?" + query.toString()),
                    summaryRequest
                ]);
                if (requestSequence !== invoiceRequestSequence) return;
                const orders = getOrders(listPayload);
                renderOrders(orders);

                if (summaryPayload) {
                    const summaryData = getData(summaryPayload);
                    renderTodayStats(summaryData.summary || {}, getOrders(summaryData));
                } else if (!todayStats) {
                    const listData = getData(listPayload);
                    if (listData.today_summary) renderTodayStats(listData.today_summary, []);
                    else if (isTodayRange) renderTodayStats(listData.summary || {}, orders);
                }

                setStatus("Đã tải " + orders.length + " hóa đơn.", false);
            } catch (error) {
                if (requestSequence !== invoiceRequestSequence) return;
                table.innerHTML = '<tr><td class="invoice-empty" colspan="8">Không thể tải hóa đơn.</td></tr>';
                document.getElementById("invoice-result-count").textContent = "";
                currentOrders.clear();
                exportButton.disabled = false;
                isLoaded = false;
                setStatus(error.message, true);
                window.PosCommon.notify("Không tải được danh sách hóa đơn: " + error.message, "danger");
            } finally {
                if (requestSequence === invoiceRequestSequence) applyButton.disabled = false;
            }
        }

        function appendDetailTile(parent, label, value, emphasize) {
            const tile = document.createElement("div");
            tile.className = "invoice-detail-tile";
            const title = document.createElement("span");
            title.className = "invoice-detail-label";
            title.textContent = label;
            const content = document.createElement("span");
            content.className = "invoice-detail-value" + (emphasize ? " invoice-detail-total" : "");
            content.textContent = value == null || value === "" ? "—" : String(value);
            tile.append(title, content);
            parent.append(tile);
        }

        function appendTotal(parent, label, value, emphasize) {
            const line = document.createElement("div");
            line.className = "d-flex justify-content-between gap-3 border-bottom py-2" + (emphasize ? " invoice-detail-total" : "");
            const title = document.createElement("span");
            title.textContent = label;
            const amount = document.createElement("strong");
            amount.textContent = window.PosCommon.formatCurrency(value);
            line.append(title, amount);
            parent.append(line);
        }

        function renderDetail(order) {
            currentInvoice = order;
            const customer = getCustomer(order);
            const cashier = getCashier(order);
            const summary = document.getElementById("invoice-detail-summary");
            const itemsBody = document.getElementById("invoice-detail-items");
            const totals = document.getElementById("invoice-detail-totals");
            summary.replaceChildren();
            itemsBody.replaceChildren();
            totals.replaceChildren();
            document.getElementById("invoice-detail-title").textContent =
                "Hóa đơn " + (order.order_number || "ORD-" + order.id);

            appendDetailTile(summary, "Trạng thái", order.status === "completed" ? "Đã hoàn thành" : order.status || "—");
            appendDetailTile(summary, "Ngày giờ giao dịch", formatDate(order.created_at));
            appendDetailTile(summary, "Thu ngân", fullName(cashier) || order.cashier_name || order.user_name || "—");
            appendDetailTile(summary, "Khách hàng", fullName(customer) || order.customer_name || order.customer_snapshot_name || "Khách lẻ");
            appendDetailTile(summary, "Số điện thoại", customer.phone || order.customer_phone || order.customer_snapshot_phone || "—");
            appendDetailTile(summary, "Địa chỉ", customer.address || order.customer_address || order.customer_snapshot_address || "—");
            appendDetailTile(summary, "Phương thức thanh toán", paymentLabel(order.payment_method));

            const items = order.items || order.order_items || [];
            items.forEach(function (item, index) {
                const product = item.product || item.products || {};
                const row = document.createElement("tr");
                addCell(row, String(index + 1));
                addCell(row, product.name || item.product_name || "Sản phẩm");
                addCell(row, product.size || item.size || "—");
                addCell(row, product.color || item.color || "—");
                addCell(row, String(item.quantity || 0), "text-end");
                addCell(row, window.PosCommon.formatCurrency(item.unit_price), "text-end text-nowrap");
                addCell(row, window.PosCommon.formatCurrency(item.total_price ?? Number(item.unit_price || 0) * Number(item.quantity || 0)), "text-end text-nowrap");
                itemsBody.append(row);
            });
            if (!items.length) {
                const row = document.createElement("tr");
                const cell = document.createElement("td");
                cell.colSpan = 7;
                cell.className = "invoice-empty";
                cell.textContent = "Hóa đơn không có dữ liệu chi tiết sản phẩm.";
                row.append(cell);
                itemsBody.append(row);
            }

            appendTotal(totals, "Tạm tính", order.subtotal);
            appendTotal(totals, "Chiết khấu", order.discount_amount);
            appendTotal(totals, "Thuế", order.tax_amount);
            appendTotal(totals, "Tổng thanh toán", order.total_amount, true);
            appendTotal(totals, "Tiền khách đưa", order.amount_received);
            appendTotal(totals, "Tiền thối", order.change_amount);
        }

        async function openOrder(orderId, actionButton, printAfterOpen) {
            let order = currentOrders.get(String(orderId));
            if (!order) return;
            const needsDetails = !Array.isArray(order.items) && !Array.isArray(order.order_items);
            if (needsDetails) {
                if (actionButton) actionButton.disabled = true;
                document.getElementById("invoice-detail-status").textContent = "Đang tải chi tiết hóa đơn...";
                try {
                    const payload = await window.PosApi.get("orders/" + encodeURIComponent(orderId));
                    const data = getData(payload);
                    order = data.order || data;
                    currentOrders.set(String(orderId), order);
                } catch (error) {
                    document.getElementById("invoice-detail-status").textContent = "";
                    window.PosCommon.notify("Không tải được chi tiết hóa đơn: " + error.message, "danger");
                    return;
                } finally {
                    if (actionButton) actionButton.disabled = false;
                }
            }
            document.getElementById("invoice-detail-status").textContent = "";
            renderDetail(order);
            if (printAfterOpen) {
                document.getElementById("invoice-detail-modal").addEventListener("shown.bs.modal", function () {
                    window.print();
                }, { once: true });
            }
            detailModal.show();
        }

        function csvValue(value) {
            const text = value == null ? "" : String(value);
            return '"' + text.replace(/"/g, '""') + '"';
        }

        function exportCsv() {
            const headings = ["Mã hóa đơn", "Thời gian", "Khách hàng", "Số điện thoại", "Thu ngân", "Phương thức thanh toán", "Tiền khách đưa", "Tiền thối", "Tổng tiền", "Trạng thái"];
            const rows = [headings];
            if (isLoaded) {
                currentOrders.forEach(function (order) {
                    const customer = getCustomer(order);
                    const cashier = getCashier(order);
                    rows.push([
                        order.order_number || order.id,
                        formatDate(order.created_at),
                        fullName(customer) || order.customer_name || order.customer_snapshot_name || "Khách lẻ",
                        customer.phone || order.customer_phone || order.customer_snapshot_phone || "",
                        fullName(cashier) || order.cashier_name || order.user_name || "",
                        paymentLabel(order.payment_method),
                        order.amount_received,
                        order.change_amount,
                        order.total_amount,
                        order.status
                    ]);
                });
            }
            const csv = "\uFEFF" + rows.map(function (row) {
                return row.map(csvValue).join(",");
            }).join("\r\n");
            const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = "bt-pos-invoices-" + dateFrom.value + "-to-" + dateTo.value + ".csv";
            document.body.append(link);
            link.click();
            link.remove();
            window.setTimeout(function () {
                URL.revokeObjectURL(url);
            }, 1000);
            if (!isLoaded) {
                window.PosCommon.notify("Chưa tải được dữ liệu hóa đơn. Tệp CSV chỉ có hàng tiêu đề để bạn kiểm tra định dạng.", "warning");
            } else if (!currentOrders.size) {
                window.PosCommon.notify("Không có hóa đơn trong kết quả lọc; đã tải tệp CSV rỗng.", "info");
            }
        }

        document.getElementById("invoice-filter-form").addEventListener("submit", function (event) {
            event.preventDefault();
            document.querySelectorAll("[data-range]").forEach(function (button) {
                button.classList.remove("is-active");
                button.setAttribute("aria-pressed", "false");
            });
            loadInvoices();
        });

        document.querySelectorAll("[data-range]").forEach(function (button) {
            button.addEventListener("click", function () {
                activateRange(button);
                if (button.dataset.range === "custom") {
                    dateFrom.focus();
                    return;
                }
                const range = rangeFor(button.dataset.range);
                dateFrom.value = range.from;
                dateTo.value = range.to;
                loadInvoices();
            });
        });

        table.addEventListener("click", function (event) {
            const actionButton = event.target.closest("[data-order-action]");
            if (actionButton) {
                if (actionButton.dataset.orderAction === "resume") {
                    window.location.href = "../../pages/pos/index.html?resume_order=" + encodeURIComponent(actionButton.dataset.orderId);
                    return;
                }
                openOrder(actionButton.dataset.orderId, actionButton, actionButton.dataset.orderAction === "print");
                return;
            }
            const row = event.target.closest("[data-order-row-id]");
            if (row) openOrder(row.dataset.orderRowId, null, false);
        });

        table.addEventListener("keydown", function (event) {
            if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-order-row-id]")) {
                event.preventDefault();
                openOrder(event.target.dataset.orderRowId, null, false);
            }
        });

        exportButton.addEventListener("click", exportCsv);
        document.getElementById("print-invoice").addEventListener("click", function () {
            window.print();
        });
        document.getElementById("download-invoice").addEventListener("click", async function () {
            if (!currentInvoice) return;
            this.disabled = true;
            try {
                if (!window.PosReportPdf) throw new Error("Không tải được chức năng PDF. Hãy tải lại trang.");
                await window.PosReportPdf.downloadInvoice(currentInvoice);
            } catch (error) {
                window.PosCommon.notify("Không thể tải hóa đơn PDF: " + error.message, "danger");
            } finally {
                this.disabled = false;
            }
        });

        const today = localDate(new Date());
        dateFrom.value = today;
        dateTo.value = today;
        loadInvoices();
}());
