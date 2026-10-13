(function () {
    "use strict";

    function init() {
        const form = document.getElementById("report-filter");
        if (!form) return;

        const table = document.getElementById("report-table");
        const status = document.getElementById("report-status");
        const dateFrom = document.getElementById("date-from");
        const dateTo = document.getElementById("date-to");
        const isAdmin = sessionStorage.getItem("pos-role") === "admin";
        const profitCard = document.getElementById("profit-card");
        const exportButton = document.getElementById("export-report-pdf");
        const detailModalElement = document.getElementById("order-detail-modal");
        const detailModal = detailModalElement && window.bootstrap
            ? new window.bootstrap.Modal(detailModalElement)
            : null;
        let chartPoints = [];
        let currentOrders = [];
        let reportLoaded = false;
        let reportRequestSequence = 0;

        if (profitCard) profitCard.hidden = !isAdmin;
        if (document.getElementById("dashboard-user-name")) {
            document.getElementById("dashboard-user-name").textContent =
                sessionStorage.getItem("pos-user-name") || "nhân viên";
        }
        if (document.getElementById("dashboard-greeting")) {
            const hour = new Date().getHours();
            document.getElementById("dashboard-greeting").textContent =
                hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
        }

        function localDate(value) {
            return [
                value.getFullYear(),
                String(value.getMonth() + 1).padStart(2, "0"),
                String(value.getDate()).padStart(2, "0")
            ].join("-");
        }

        function responseData(payload) {
            if (payload && payload.data && !Array.isArray(payload.data)) return payload.data;
            return payload || {};
        }

        function unwrapOrders(payload) {
            const data = responseData(payload);
            const source = data.orders || data.items || (Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []);
            return window.PosCommon.unwrapList(source);
        }

        function addCell(row, value, className) {
            const cell = document.createElement("td");
            cell.textContent = value == null || value === "" ? "—" : String(value);
            if (className) cell.className = className;
            row.append(cell);
            return cell;
        }

        function customerName(order) {
            const customer = order.customer || {};
            return customer.full_name || customer.name || order.customer_name || "Khách lẻ";
        }

        function cashierName(order) {
            const user = order.user || order.cashier || {};
            return user.name || [user.first_name, user.last_name].filter(Boolean).join(" ") ||
                order.cashier_name || order.user_name || "—";
        }

        function statusText(value) {
            const labels = {
                completed: "Hoàn tất",
                pending: "Đang xử lý",
                cancelled: "Đã hủy"
            };
            return labels[value] || value || "—";
        }

        function renderRows(orders) {
            currentOrders = orders.slice().sort(function (left, right) {
                return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime();
            });
            table.replaceChildren();
            currentOrders.forEach(function (order) {
                const row = document.createElement("tr");
                addCell(row, order.order_number || order.id, "fw-semibold");
                addCell(row, customerName(order));
                addCell(row, cashierName(order));
                addCell(row, order.created_at ? new Date(order.created_at).toLocaleString("vi-VN") : "");
                addCell(row, window.PosCommon.formatCurrency(order.total_amount), "text-nowrap fw-semibold");

                const stateCell = document.createElement("td");
                const badge = document.createElement("span");
                badge.className = "badge " + (order.status === "completed" ? "text-bg-success" : order.status === "cancelled" ? "text-bg-secondary" : "text-bg-warning");
                badge.textContent = statusText(order.status);
                stateCell.append(badge);
                row.append(stateCell);

                const actionCell = document.createElement("td");
                actionCell.className = "text-end";
                const detailButton = document.createElement("button");
                detailButton.className = "btn btn-sm btn-outline-secondary";
                detailButton.type = "button";
                detailButton.dataset.orderId = String(order.id);
                detailButton.setAttribute("aria-label", "Xem đơn " + (order.order_number || order.id));
                detailButton.innerHTML = '<i class="bi bi-eye" aria-hidden="true"></i><span class="visually-hidden">Chi tiết</span>';
                actionCell.append(detailButton);
                row.append(actionCell);
                table.append(row);
            });

            if (!orders.length) {
                const row = document.createElement("tr");
                const empty = document.createElement("td");
                empty.colSpan = 7;
                empty.className = "empty-state";
                empty.textContent = "Không có đơn hàng trong khoảng thời gian này.";
                row.append(empty);
                table.append(row);
            }
            const countLabel = document.getElementById("order-count-label");
            if (countLabel) countLabel.textContent = orders.length + " đơn hàng";
        }

        function trendFromOrders(orders) {
            const totals = new Map();
            orders.forEach(function (order) {
                if (order.status && order.status !== "completed") return;
                if (!order.created_at) return;
                const date = /^\d{4}-\d{2}-\d{2}/.test(String(order.created_at))
                    ? String(order.created_at).slice(0, 10)
                    : localDate(new Date(order.created_at));
                totals.set(date, (totals.get(date) || 0) + (Number(order.total_amount) || 0));
            });
            return Array.from(totals, function (entry) {
                return { date: entry[0], revenue: entry[1] };
            }).sort(function (left, right) {
                return left.date.localeCompare(right.date);
            });
        }

        function drawChart(points) {
            const canvas = document.getElementById("report-chart");
            if (!canvas) return;
            const bounds = canvas.getBoundingClientRect();
            const cssWidth = Math.max(300, bounds.width || canvas.parentElement.clientWidth);
            const cssHeight = 250;
            const ratio = Math.max(1, window.devicePixelRatio || 1);
            canvas.width = Math.round(cssWidth * ratio);
            canvas.height = Math.round(cssHeight * ratio);
            canvas.style.height = cssHeight + "px";
            const context = canvas.getContext("2d");
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            context.clearRect(0, 0, cssWidth, cssHeight);

            const padding = { top: 18, right: 18, bottom: 44, left: 78 };
            const width = cssWidth - padding.left - padding.right;
            const height = cssHeight - padding.top - padding.bottom;
            const max = Math.max(1, ...points.map(function (point) {
                return Number(point.revenue ?? point.total_revenue ?? point.amount) || 0;
            }));

            context.font = "11px system-ui, sans-serif";
            context.strokeStyle = "#e7eaf0";
            context.fillStyle = "#718096";
            context.lineWidth = 1;
            for (let step = 0; step <= 4; step += 1) {
                const y = padding.top + height * step / 4;
                const amount = max * (4 - step) / 4;
                context.beginPath();
                context.moveTo(padding.left, y);
                context.lineTo(cssWidth - padding.right, y);
                context.stroke();
                context.textAlign = "right";
                context.fillText(window.PosCommon.formatCurrency(amount), padding.left - 9, y + 4);
            }

            if (!points.length) {
                context.textAlign = "center";
                context.fillText("Chưa có dữ liệu trong khoảng thời gian này", cssWidth / 2, cssHeight / 2);
                context.textAlign = "start";
                return;
            }

            const coordinates = points.map(function (point, index) {
                const revenue = Number(point.revenue ?? point.total_revenue ?? point.amount) || 0;
                return {
                    x: padding.left + (points.length === 1 ? width / 2 : width * index / (points.length - 1)),
                    y: padding.top + height * (1 - revenue / max),
                    label: String(point.date || point.period || "").slice(5)
                };
            });
            context.beginPath();
            context.strokeStyle = "#4f46e5";
            context.lineWidth = 3;
            coordinates.forEach(function (point, index) {
                if (index === 0) context.moveTo(point.x, point.y);
                else context.lineTo(point.x, point.y);
            });
            context.stroke();
            coordinates.forEach(function (point) {
                context.beginPath();
                context.fillStyle = "#fff";
                context.arc(point.x, point.y, 4, 0, Math.PI * 2);
                context.fill();
                context.strokeStyle = "#4f46e5";
                context.lineWidth = 2;
                context.stroke();
                context.fillStyle = "#718096";
                context.textAlign = "center";
                context.fillText(point.label || "—", point.x, cssHeight - 16);
            });
            context.textAlign = "start";
        }

        function setEmptyStats() {
            ["report-revenue", "report-orders", "report-items", "report-profit"].forEach(function (id) {
                const element = document.getElementById(id);
                if (element) element.textContent = "—";
            });
            renderRows([]);
            chartPoints = [];
            drawChart(chartPoints);
            reportLoaded = false;
            if (exportButton) exportButton.disabled = true;
        }

        function reportMessage(message, isError) {
            if (!status) return;
            status.textContent = message;
            status.classList.toggle("is-error", Boolean(isError));
        }

        function renderReportData(data, from, to) {
            const summary = data.summary || {};
            const orders = unwrapOrders(data);
            const completedOrders = orders.filter(function (order) {
                return !order.status || order.status === "completed";
            });
            const receivedTotal = summary.total_received ?? summary.total_revenue ?? summary.revenue ??
                completedOrders.reduce(function (sum, order) {
                    return sum + (Number(order.total_amount) || 0);
                }, 0);
            const orderCount = summary.order_count ?? summary.total_orders ?? completedOrders.length;
            const soldQuantity = summary.items_sold ?? summary.total_items_sold ?? summary.product_count ?? summary.total_items ??
                completedOrders.reduce(function (sum, order) {
                    const reported = order.items_sold ?? order.total_items ?? order.quantity_sold;
                    if (reported != null && Number.isFinite(Number(reported))) return sum + Number(reported);
                    const items = Array.isArray(order.items) ? order.items : Array.isArray(order.order_items) ? order.order_items : [];
                    return sum + items.reduce(function (quantity, item) {
                        return quantity + (Number(item.quantity) || 0);
                    }, 0);
                }, 0);

            document.getElementById("report-revenue").textContent = window.PosCommon.formatCurrency(receivedTotal);
            document.getElementById("report-orders").textContent = String(orderCount);
            document.getElementById("report-items").textContent = String(soldQuantity);
            if (isAdmin) {
                const profit = summary.total_profit ?? summary.profit;
                document.getElementById("report-profit").textContent = profit == null
                    ? "Chưa có dữ liệu"
                    : window.PosCommon.formatCurrency(profit);
            }

            renderRows(orders);
            chartPoints = Array.isArray(data.trend) ? data.trend : Array.isArray(data.daily_revenue) ? data.daily_revenue : trendFromOrders(orders);
            drawChart(chartPoints);
            const periodLabel = document.getElementById("chart-period-label");
            if (periodLabel) periodLabel.textContent = from + " — " + to;
            const printRange = document.getElementById("print-date-range");
            if (printRange) printRange.textContent = from + " — " + to;
            reportLoaded = true;
            if (exportButton) exportButton.disabled = false;
            return orders;
        }

        async function loadReport() {
            const requestSequence = ++reportRequestSequence;
            const from = dateFrom.value;
            const to = dateTo.value;
            if (!from || !to || from > to) {
                reportMessage("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.", true);
                setEmptyStats();
                const invalidRangeButton = document.getElementById("load-report");
                if (invalidRangeButton) invalidRangeButton.disabled = false;
                return;
            }

            const loadButton = document.getElementById("load-report");
            if (loadButton) loadButton.disabled = true;
            if (exportButton) exportButton.disabled = true;
            reportMessage("Đang tải báo cáo...", false);

            try {
                const query = new URLSearchParams({ from: from, to: to });
                const payload = await window.PosApi.get("reports/sales?" + query.toString());
                if (requestSequence !== reportRequestSequence) return;
                const data = responseData(payload);
                const orders = renderReportData(data, from, to);
                reportMessage(orders.length + " đơn hàng trong khoảng thời gian đã chọn.", false);
            } catch (error) {
                if (requestSequence !== reportRequestSequence) return;
                setEmptyStats();
                reportMessage("Không tải được báo cáo: " + error.message, true);
                window.PosCommon.notify("Không tải được báo cáo: " + error.message, "danger");
            } finally {
                if (requestSequence === reportRequestSequence && loadButton) loadButton.disabled = false;
            }
        }

        function appendDetailLine(parent, label, value) {
            const row = document.createElement("div");
            row.className = "d-flex justify-content-between gap-3 border-bottom py-2";
            const key = document.createElement("span");
            key.className = "text-muted";
            key.textContent = label;
            const content = document.createElement("strong");
            content.className = "text-end";
            content.textContent = value == null || value === "" ? "—" : String(value);
            row.append(key, content);
            parent.append(row);
        }

        function renderOrderDetail(order) {
            const body = document.getElementById("order-detail-content");
            body.replaceChildren();
            const heading = document.createElement("h3");
            heading.className = "h6 fw-bold";
            heading.textContent = "Đơn " + (order.order_number || order.id || "");
            body.append(heading);
            appendDetailLine(body, "Khách hàng", customerName(order));
            appendDetailLine(body, "Số điện thoại", order.customer && order.customer.phone || order.customer_phone);
            appendDetailLine(body, "Thu ngân", cashierName(order));
            appendDetailLine(body, "Ngày lập", order.created_at ? new Date(order.created_at).toLocaleString("vi-VN") : "");
            appendDetailLine(body, "Phương thức", order.payment_method);
            appendDetailLine(body, "Trạng thái", statusText(order.status));

            const items = order.items || order.order_items || [];
            if (items.length) {
                const subheading = document.createElement("h4");
                subheading.className = "h6 fw-bold mt-4";
                subheading.textContent = "Sản phẩm";
                body.append(subheading);
                items.forEach(function (item) {
                    const product = item.product || {};
                    appendDetailLine(
                        body,
                        (product.name || item.product_name || "Sản phẩm") + " × " + (item.quantity || 0),
                        window.PosCommon.formatCurrency(item.total_price ?? Number(item.unit_price || 0) * Number(item.quantity || 0))
                    );
                });
            }
            appendDetailLine(body, "Tạm tính", window.PosCommon.formatCurrency(order.subtotal));
            appendDetailLine(body, "Chiết khấu", window.PosCommon.formatCurrency(order.discount_amount));
            appendDetailLine(body, "Tổng thanh toán", window.PosCommon.formatCurrency(order.total_amount));
            appendDetailLine(body, "Tiền khách đưa", window.PosCommon.formatCurrency(order.amount_received));
            appendDetailLine(body, "Tiền thừa", window.PosCommon.formatCurrency(order.change_amount));
        }

        table.addEventListener("click", async function (event) {
            const button = event.target.closest("[data-order-id]");
            if (!button || !detailModal) return;
            const order = currentOrders.find(function (item) {
                return String(item.id) === button.dataset.orderId;
            });
            if (!order) return;
            if (!order.items && !order.order_items) {
                button.disabled = true;
                try {
                    const response = await window.PosApi.get("orders/" + encodeURIComponent(order.id));
                    const detail = responseData(response);
                    renderOrderDetail(detail.order || detail);
                } catch (error) {
                    window.PosCommon.notify("Không tải được chi tiết đơn hàng: " + error.message, "danger");
                    return;
                } finally {
                    button.disabled = false;
                }
            } else {
                renderOrderDetail(order);
            }
            detailModal.show();
        });

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            loadReport();
        });

        document.querySelectorAll("[data-range]").forEach(function (button) {
            button.addEventListener("click", function () {
                if (button.dataset.range === "custom") {
                    document.querySelectorAll("[data-range]").forEach(function (rangeButton) {
                        rangeButton.classList.toggle("is-active", rangeButton === button);
                    });
                    dateFrom.focus();
                    return;
                }
                const today = new Date();
                const end = new Date(today);
                const start = new Date(today);
                if (button.dataset.range === "yesterday") {
                    start.setDate(today.getDate() - 1);
                    end.setDate(today.getDate() - 1);
                } else if (button.dataset.range === "7days") {
                    start.setDate(today.getDate() - 6);
                } else if (button.dataset.range === "this_month") {
                    start.setDate(1);
                }
                dateFrom.value = localDate(start);
                dateTo.value = localDate(end);
                document.querySelectorAll("[data-range]").forEach(function (rangeButton) {
                    rangeButton.classList.toggle("is-active", rangeButton === button);
                });
                loadReport();
            });
        });

        if (exportButton) {
            exportButton.addEventListener("click", function () {
                if (!reportLoaded) return;
                const previousTitle = document.title;
                document.title = "bao-cao-ban-hang-" + dateFrom.value + "-den-" + dateTo.value;
                window.addEventListener("afterprint", function () {
                    document.title = previousTitle;
                }, { once: true });
                window.print();
            });
        }

        window.addEventListener("resize", function () {
            if (reportLoaded) drawChart(chartPoints);
        });

        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 6);
        dateFrom.value = localDate(weekStart);
        dateTo.value = localDate(today);
        const initialTodayButton = document.querySelector("[data-range='7days']");
        if (initialTodayButton) initialTodayButton.classList.add("is-active");
        loadReport();
    }

    init();
}());
