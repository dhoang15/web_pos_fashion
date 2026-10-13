(function () {
    "use strict";

    const PAGE_WIDTH = 794;
    const PAGE_HEIGHT = 1123;
    const PAGE_SCALE = 2;
    const MARGIN = 44;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
    const TABLE_BOTTOM = PAGE_HEIGHT - 78;
    const FONT = 'Arial, "Segoe UI", sans-serif';
    const COLORS = {
        ink: "#202d40",
        muted: "#65738a",
        line: "#e1e6ee",
        light: "#f5f7fb",
        accent: "#58413a",
        notice: "#fff4da",
        noticeInk: "#805714"
    };
    const COLUMNS = [
        { label: "Mã hóa đơn", width: 82 },
        { label: "Khách hàng", width: 138 },
        { label: "Thu ngân", width: 118 },
        { label: "Thời gian", width: 122 },
        { label: "Tổng tiền", width: 124, align: "right" },
        { label: "Trạng thái", width: 122 }
    ];

    function text(value, fallback) {
        return value == null || value === "" ? (fallback || "—") : String(value);
    }

    function money(value) {
        if (value == null || value === "") return "—";
        const amount = Number(value);
        return Number.isFinite(amount)
            ? amount.toLocaleString("vi-VN", { maximumFractionDigits: 0 }) + " đ"
            : text(value);
    }

    function count(value) {
        if (value == null || value === "") return "—";
        const amount = Number(value);
        return Number.isFinite(amount) ? amount.toLocaleString("vi-VN") : text(value);
    }

    function dateText(value, includeTime) {
        if (!value) return "—";
        const date = new Date(String(value).replace(/^(\d{4}-\d{2}-\d{2})\s/, "$1T"));
        if (!Number.isFinite(date.getTime())) return String(value);
        return includeTime
            ? date.toLocaleDateString("vi-VN") + "\n" + date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
            : date.toLocaleDateString("vi-VN");
    }

    function font(context, size, weight) {
        context.font = (weight || "normal") + " " + size + "px " + FONT;
    }

    function wrap(context, value, width, maxLines) {
        const lines = [];
        String(value).split(/\r?\n/).forEach(function (paragraph) {
            let line = "";
            paragraph.split(/\s+/).filter(Boolean).forEach(function (word) {
                const proposed = line ? line + " " + word : word;
                if (context.measureText(proposed).width <= width) {
                    line = proposed;
                    return;
                }
                if (line) lines.push(line);
                line = "";
                Array.from(word).forEach(function (character) {
                    if (line && context.measureText(line + character).width > width) {
                        lines.push(line);
                        line = "";
                    }
                    line += character;
                });
            });
            lines.push(line || "—");
        });
        if (maxLines && lines.length > maxLines) {
            const limited = lines.slice(0, maxLines);
            let last = limited[maxLines - 1];
            while (last && context.measureText(last + "…").width > width) last = last.slice(0, -1);
            limited[maxLines - 1] = last + "…";
            return limited;
        }
        return lines;
    }

    function drawLines(context, lines, x, y, lineHeight, align) {
        context.textAlign = align || "left";
        lines.forEach(function (line, index) {
            context.fillText(line, x, y + index * lineHeight);
        });
        context.textAlign = "left";
    }

    function customerName(order) {
        const customer = order.customer || {};
        return customer.full_name || customer.name || order.customer_name || order.customer_snapshot_name || "Khách lẻ";
    }

    function cashierName(order) {
        const cashier = order.user || order.cashier || {};
        return cashier.name || [cashier.first_name, cashier.last_name].filter(Boolean).join(" ") ||
            order.cashier_name || order.user_name || order.cashier_snapshot_name || "—";
    }

    function statusText(value) {
        return ({ completed: "Hoàn tất", pending: "Đang xử lý", cancelled: "Đã hủy", canceled: "Đã hủy" })[value] || text(value);
    }

    function makeRows(context, orders) {
        font(context, 11);
        return orders.map(function (order) {
            const values = [
                text(order.order_number || order.invoice_number || order.id),
                customerName(order),
                cashierName(order),
                dateText(order.created_at || order.sold_at, true),
                money(order.total_amount ?? order.total),
                statusText(order.status)
            ];
            const cells = values.map(function (value, index) {
                return wrap(context, value, COLUMNS[index].width - 18, 3);
            });
            return {
                cells: cells,
                height: Math.max(42, Math.max.apply(null, cells.map(function (cell) { return cell.length; })) * 15 + 18)
            };
        });
    }

    function drawHeader(context, report, generatedAt, pageNumber, pageCount) {
        context.fillStyle = COLORS.accent;
        font(context, 12, "bold");
        context.fillText("B'TRIPLE POS", MARGIN, 46);
        context.fillStyle = COLORS.ink;
        font(context, 25, "bold");
        context.fillText(text(report.title, "Báo cáo doanh thu"), MARGIN, 79, CONTENT_WIDTH);
        context.fillStyle = COLORS.muted;
        font(context, 12);
        context.fillText("Kỳ báo cáo: " + dateText(report.from) + " — " + dateText(report.to), MARGIN, 103);
        context.fillText("Ngày xuất: " + generatedAt.toLocaleString("vi-VN"), MARGIN, 124);
        context.strokeStyle = COLORS.line;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(MARGIN, 139);
        context.lineTo(PAGE_WIDTH - MARGIN, 139);
        context.moveTo(MARGIN, PAGE_HEIGHT - 57);
        context.lineTo(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 57);
        context.stroke();
        font(context, 10);
        context.fillText("B'TRIPLE POS · Báo cáo từ dữ liệu đang hiển thị", MARGIN, PAGE_HEIGHT - 34);
        context.textAlign = "right";
        context.fillText("Trang " + pageNumber + " / " + pageCount, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 34);
        context.textAlign = "left";
    }

    function drawSummary(context, summary, y) {
        const metrics = [
            ["Tổng tiền đã nhận", money(summary.revenue)],
            ["Số lượng đơn hàng", count(summary.orderCount)],
            ["Sản phẩm đã bán", count(summary.itemsSold)]
        ];
        if (Object.prototype.hasOwnProperty.call(summary, "profit")) {
            metrics.push(["Lợi nhuận", money(summary.profit)]);
        }
        const gap = 10;
        const width = (CONTENT_WIDTH - gap * (metrics.length - 1)) / metrics.length;
        metrics.forEach(function (metric, index) {
            const x = MARGIN + index * (width + gap);
            context.fillStyle = COLORS.light;
            context.fillRect(x, y, width, 86);
            context.fillStyle = COLORS.muted;
            font(context, 10.5, "bold");
            const label = wrap(context, metric[0], width - 24, 2);
            drawLines(context, label, x + 12, y + 22, 14);
            context.fillStyle = COLORS.ink;
            font(context, 19, "bold");
            context.fillText(metric[1], x + 12, y + 67, width - 24);
        });
        return y + 86;
    }

    function drawTrend(context, trend, y) {
        font(context, 15, "bold");
        context.fillStyle = COLORS.ink;
        context.fillText("Doanh thu theo ngày", MARGIN, y + 25);
        const chartTop = y + 46;
        const chartHeight = 145;
        const chartLeft = MARGIN + 81;
        const chartWidth = CONTENT_WIDTH - 100;
        const points = trend.map(function (point) {
            return { label: point.date || point.period || "", amount: Number(point.revenue ?? point.total_revenue ?? point.amount) };
        }).filter(function (point) { return Number.isFinite(point.amount); });
        if (!points.length) {
            context.fillStyle = COLORS.light;
            context.fillRect(MARGIN, chartTop, CONTENT_WIDTH, chartHeight);
            context.fillStyle = COLORS.muted;
            font(context, 12);
            context.textAlign = "center";
            context.fillText("Chưa có dữ liệu doanh thu trong khoảng thời gian này.", PAGE_WIDTH / 2, chartTop + 77);
            context.textAlign = "left";
            return chartTop + chartHeight + 26;
        }
        const max = Math.max(1, ...points.map(function (point) { return point.amount; }));
        font(context, 10);
        context.lineWidth = 1;
        for (let step = 0; step <= 4; step += 1) {
            const gridY = chartTop + chartHeight * step / 4;
            context.strokeStyle = COLORS.line;
            context.beginPath();
            context.moveTo(chartLeft, gridY);
            context.lineTo(chartLeft + chartWidth, gridY);
            context.stroke();
            context.textAlign = "right";
            context.fillStyle = COLORS.muted;
            context.fillText(money(max * (4 - step) / 4), chartLeft - 9, gridY + 4, 74);
        }
        const coordinates = points.map(function (point, index) {
            return {
                x: chartLeft + (points.length === 1 ? chartWidth / 2 : chartWidth * index / (points.length - 1)),
                y: chartTop + chartHeight * (1 - Math.max(0, point.amount) / max),
                label: dateText(point.label)
            };
        });
        context.beginPath();
        context.strokeStyle = COLORS.accent;
        context.lineWidth = 2.5;
        coordinates.forEach(function (point, index) {
            if (index === 0) context.moveTo(point.x, point.y);
            else context.lineTo(point.x, point.y);
        });
        context.stroke();
        const labelStep = Math.max(1, Math.ceil(coordinates.length / 6));
        coordinates.forEach(function (point, index) {
            if (coordinates.length <= 40) {
                context.beginPath();
                context.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
                context.fillStyle = COLORS.accent;
                context.fill();
            }
            if (index % labelStep === 0 || index === coordinates.length - 1) {
                context.fillStyle = COLORS.muted;
                context.textAlign = "center";
                context.fillText(point.label, point.x, chartTop + chartHeight + 18, 82);
            }
        });
        context.textAlign = "left";
        return chartTop + chartHeight + 26;
    }

    function firstTableTop(context, report, draw) {
        let y = 157;
        if (report.notice) {
            font(context, 11);
            const lines = wrap(context, report.notice, CONTENT_WIDTH - 28, 5);
            const height = lines.length * 16 + 26;
            if (draw) {
                context.fillStyle = COLORS.notice;
                context.fillRect(MARGIN, y, CONTENT_WIDTH, height);
                context.fillStyle = COLORS.noticeInk;
                drawLines(context, lines, MARGIN + 14, y + 22, 16);
            }
            y += height + 14;
        }
        if (draw) {
            y = drawSummary(context, report.summary || {}, y);
            y = drawTrend(context, Array.isArray(report.trend) ? report.trend : [], y + 10);
        } else {
            y += 86 + 10 + 46 + 145 + 26;
        }
        return y + 46;
    }

    function paginate(rows, firstTop) {
        const pages = [{ top: firstTop, rows: [] }];
        let used = firstTop + 37;
        rows.forEach(function (row) {
            if (used + row.height > TABLE_BOTTOM) {
                pages.push({ top: 188, rows: [] });
                used = 225;
            }
            pages[pages.length - 1].rows.push(row);
            used += row.height;
        });
        return pages;
    }

    function drawTable(context, page, orderCount, unavailable) {
        context.fillStyle = COLORS.ink;
        font(context, 15, "bold");
        context.fillText("Danh sách giao dịch", MARGIN, page.top - 17);
        context.textAlign = "right";
        font(context, 11);
        context.fillStyle = COLORS.muted;
        context.fillText(unavailable ? "Danh sách chưa được tải" : orderCount.toLocaleString("vi-VN") + " đơn hàng", PAGE_WIDTH - MARGIN, page.top - 17);
        context.textAlign = "left";
        context.fillStyle = COLORS.accent;
        context.fillRect(MARGIN, page.top, CONTENT_WIDTH, 37);
        let x = MARGIN;
        font(context, 10.5, "bold");
        context.fillStyle = "#ffffff";
        COLUMNS.forEach(function (column) {
            drawLines(context, [column.label], column.align === "right" ? x + column.width - 9 : x + 9, page.top + 24, 15, column.align);
            x += column.width;
        });
        let y = page.top + 37;
        if (!page.rows.length) {
            context.fillStyle = COLORS.light;
            context.fillRect(MARGIN, y, CONTENT_WIDTH, 62);
            context.fillStyle = COLORS.muted;
            font(context, 12);
            context.textAlign = "center";
            context.fillText(unavailable ? "Chưa tải được dữ liệu đơn hàng từ máy chủ." : "Không có dữ liệu đơn hàng trong khoảng thời gian này.", PAGE_WIDTH / 2, y + 35);
            context.textAlign = "left";
        }
        page.rows.forEach(function (row, rowIndex) {
            context.fillStyle = rowIndex % 2 === 0 ? "#ffffff" : COLORS.light;
            context.fillRect(MARGIN, y, CONTENT_WIDTH, row.height);
            x = MARGIN;
            font(context, 11);
            context.fillStyle = COLORS.ink;
            row.cells.forEach(function (cell, index) {
                const column = COLUMNS[index];
                drawLines(context, cell, column.align === "right" ? x + column.width - 9 : x + 9, y + 21, 15, column.align);
                x += column.width;
            });
            context.strokeStyle = COLORS.line;
            context.lineWidth = 0.75;
            context.beginPath();
            context.moveTo(MARGIN, y + row.height);
            context.lineTo(PAGE_WIDTH - MARGIN, y + row.height);
            context.stroke();
            y += row.height;
        });
    }

    function jpegBytes(canvas) {
        return new Promise(function (resolve, reject) {
            canvas.toBlob(function (blob) {
                if (!blob) {
                    reject(new Error("Không thể tạo trang PDF từ báo cáo."));
                    return;
                }
                blob.arrayBuffer().then(function (buffer) {
                    resolve(new Uint8Array(buffer));
                }, reject);
            }, "image/jpeg", 0.92);
        });
    }

    function assemblePdf(images, imageWidth, imageHeight) {
        const encoder = new TextEncoder();
        const chunks = [];
        const offsets = [0];
        let length = 0;
        function append(value) {
            const bytes = typeof value === "string" ? encoder.encode(value) : value;
            chunks.push(bytes);
            length += bytes.length;
        }
        function beginObject(id) {
            offsets[id] = length;
            append(id + " 0 obj\n");
        }
        append("%PDF-1.4\n%âãÏÓ\n");
        beginObject(1);
        append("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
        beginObject(2);
        append("<< /Type /Pages /Count " + images.length + " /Kids [" + images.map(function (_, index) {
            return (3 + index * 3) + " 0 R";
        }).join(" ") + "] >>\nendobj\n");
        images.forEach(function (bytes, index) {
            const pageId = 3 + index * 3;
            const imageId = pageId + 1;
            const contentId = pageId + 2;
            beginObject(pageId);
            append("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /ReportImage " + imageId + " 0 R >> >> /Contents " + contentId + " 0 R >>\nendobj\n");
            beginObject(imageId);
            append("<< /Type /XObject /Subtype /Image /Width " + imageWidth + " /Height " + imageHeight + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + bytes.length + " >>\nstream\n");
            append(bytes);
            append("\nendstream\nendobj\n");
            const drawing = "q\n595.28 0 0 841.89 0 0 cm\n/ReportImage Do\nQ\n";
            beginObject(contentId);
            append("<< /Length " + encoder.encode(drawing).length + " >>\nstream\n" + drawing + "endstream\nendobj\n");
        });
        const xrefOffset = length;
        append("xref\n0 " + offsets.length + "\n0000000000 65535 f \n");
        for (let id = 1; id < offsets.length; id += 1) {
            append(String(offsets[id]).padStart(10, "0") + " 00000 n \n");
        }
        append("trailer\n<< /Size " + offsets.length + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF\n");
        return new Blob(chunks, { type: "application/pdf" });
    }

    function savePdf(blob, filename, pageCount, canvas) {
        const safeName = String(filename || "bao-cao-doanh-thu.pdf").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-");
        const downloadName = /\.pdf$/i.test(safeName) ? safeName : safeName + ".pdf";
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = downloadName;
        anchor.hidden = true;
        document.body.append(anchor);
        try {
            anchor.click();
        } finally {
            anchor.remove();
            window.setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
            canvas.width = 0;
            canvas.height = 0;
        }
        return { filename: downloadName, pageCount: pageCount, blob: blob };
    }

    function invoiceItemRows(context, items) {
        const widths = [34, 302, 64, 144, 162];
        font(context, 12);
        return items.map(function (item, index) {
            const product = item.product || {};
            const quantity = item.quantity;
            const unitPrice = item.unit_price ?? item.price ?? product.price ?? product.selling_price;
            const computedTotal = unitPrice != null && quantity != null && Number.isFinite(Number(unitPrice)) && Number.isFinite(Number(quantity))
                ? Number(unitPrice) * Number(quantity)
                : null;
            const variant = [item.size || product.size, item.color || product.color].filter(Boolean).join(" · ");
            const values = [
                String(index + 1),
                text(item.product_name || item.product_snapshot_name || product.name, "Sản phẩm") + (variant ? "\n" + variant : ""),
                count(quantity),
                money(unitPrice),
                money(item.total_price ?? item.line_total ?? computedTotal)
            ];
            const cells = values.map(function (value, columnIndex) {
                return wrap(context, value, widths[columnIndex] - 20, columnIndex === 1 ? 4 : 3);
            });
            return {
                cells: cells,
                height: Math.max(46, Math.max.apply(null, cells.map(function (cell) { return cell.length; })) * 17 + 20)
            };
        });
    }

    function invoiceHeader(context, order, store, pageNumber, pageCount) {
        const storeName = text(store.store_name || store.name, "B'TRIPLE Fashion Store");
        context.fillStyle = COLORS.accent;
        font(context, 13, "bold");
        context.fillText(text(store.logo_text, "B'TRIPLE POS"), MARGIN, 45, CONTENT_WIDTH);
        context.fillStyle = COLORS.ink;
        font(context, 20, "bold");
        context.fillText(storeName, MARGIN, 73, CONTENT_WIDTH);
        context.fillStyle = COLORS.muted;
        font(context, 11);
        const address = store.store_address || store.address;
        if (address) drawLines(context, wrap(context, address, CONTENT_WIDTH, 2), MARGIN, 94, 15);
        const phone = store.store_phone || store.phone || store.hotline;
        if (phone) context.fillText("Điện thoại: " + phone, MARGIN, 124, CONTENT_WIDTH);
        context.strokeStyle = COLORS.line;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(MARGIN, 139);
        context.lineTo(PAGE_WIDTH - MARGIN, 139);
        context.moveTo(MARGIN, PAGE_HEIGHT - 57);
        context.lineTo(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 57);
        context.stroke();
        context.fillStyle = COLORS.ink;
        font(context, 24, "bold");
        context.fillText("HÓA ĐƠN BÁN LẺ", MARGIN, 176);
        font(context, 12, "bold");
        context.fillText("Mã hóa đơn: " + text(order.order_number || order.invoice_number || order.id), MARGIN, 201, CONTENT_WIDTH / 2);
        context.textAlign = "right";
        font(context, 11);
        const issuedAt = order.created_at || order.sold_at;
        context.fillText("Ngày lập: " + dateText(issuedAt, true).replace("\n", " "), PAGE_WIDTH - MARGIN, 201, CONTENT_WIDTH / 2 - 15);
        context.textAlign = "left";
        font(context, 10);
        context.fillStyle = COLORS.muted;
        context.fillText(storeName, MARGIN, PAGE_HEIGHT - 34, CONTENT_WIDTH - 100);
        context.textAlign = "right";
        context.fillText("Trang " + pageNumber + " / " + pageCount, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 34);
        context.textAlign = "left";
    }

    function invoiceCustomerBlock(context, order, draw) {
        const customer = order.customer || {};
        const leftWidth = 404;
        const rightWidth = CONTENT_WIDTH - leftWidth - 44;
        font(context, 12);
        const left = [
            wrap(context, "Khách hàng: " + customerName(order), leftWidth, 2),
            wrap(context, "SĐT: " + text(customer.phone || order.customer_phone || order.customer_snapshot_phone), leftWidth, 2),
            wrap(context, "Địa chỉ: " + text(customer.address || order.customer_address || order.customer_snapshot_address), leftWidth, 3)
        ];
        const right = [
            wrap(context, "Thu ngân: " + cashierName(order), rightWidth, 3),
            wrap(context, "Trạng thái: " + statusText(order.status), rightWidth, 2)
        ];
        function blockHeight(lines) {
            return lines.reduce(function (height, entry) { return height + entry.length * 17 + 8; }, 0);
        }
        const height = Math.max(106, blockHeight(left), blockHeight(right)) + 20;
        if (draw) {
            context.fillStyle = COLORS.light;
            context.fillRect(MARGIN, 222, CONTENT_WIDTH, height);
            context.fillStyle = COLORS.ink;
            let y = 246;
            left.forEach(function (lines) {
                drawLines(context, lines, MARGIN + 14, y, 17);
                y += lines.length * 17 + 8;
            });
            y = 246;
            right.forEach(function (lines) {
                drawLines(context, lines, MARGIN + leftWidth + 30, y, 17);
                y += lines.length * 17 + 8;
            });
        }
        return 222 + height + 28;
    }

    function invoiceTable(context, page) {
        const columns = [
            { label: "STT", width: 34 },
            { label: "Sản phẩm", width: 302 },
            { label: "SL", width: 64, align: "right" },
            { label: "Đơn giá", width: 144, align: "right" },
            { label: "Thành tiền", width: 162, align: "right" }
        ];
        context.fillStyle = COLORS.accent;
        context.fillRect(MARGIN, page.top, CONTENT_WIDTH, 37);
        context.fillStyle = "#ffffff";
        font(context, 11, "bold");
        let x = MARGIN;
        columns.forEach(function (column) {
            drawLines(context, [column.label], column.align === "right" ? x + column.width - 10 : x + 9, page.top + 24, 17, column.align);
            x += column.width;
        });
        let y = page.top + 37;
        page.rows.forEach(function (row, index) {
            context.fillStyle = index % 2 === 0 ? "#ffffff" : COLORS.light;
            context.fillRect(MARGIN, y, CONTENT_WIDTH, row.height);
            context.fillStyle = COLORS.ink;
            font(context, 12);
            x = MARGIN;
            row.cells.forEach(function (lines, columnIndex) {
                const column = columns[columnIndex];
                drawLines(context, lines, column.align === "right" ? x + column.width - 10 : x + 9, y + 23, 17, column.align);
                x += column.width;
            });
            y += row.height;
            context.strokeStyle = COLORS.line;
            context.lineWidth = 0.75;
            context.beginPath();
            context.moveTo(MARGIN, y);
            context.lineTo(PAGE_WIDTH - MARGIN, y);
            context.stroke();
        });
        return y;
    }

    function invoiceTotals(context, order, store, y) {
        const totals = order.totals || {};
        const paymentLabels = { cash: "Tiền mặt", card: "Thẻ", qr_code: "Chuyển khoản / QR", transfer: "Chuyển khoản" };
        const entries = [
            ["Tạm tính", money(order.subtotal ?? totals.subtotal)],
            ["Chiết khấu", money(order.discount_amount ?? totals.discount_amount)],
            ["Thuế", money(order.tax_amount ?? totals.tax_amount)],
            ["TỔNG THANH TOÁN", money(order.total_amount ?? totals.total_amount), true],
            ["Phương thức", paymentLabels[order.payment_method] || text(order.payment_method)],
            ["Tiền khách đưa", money(order.amount_received)],
            ["Tiền thừa", money(order.change_amount)]
        ];
        const startX = MARGIN + 275;
        entries.forEach(function (entry) {
            if (entry[2]) {
                context.fillStyle = COLORS.light;
                context.fillRect(startX - 12, y - 19, CONTENT_WIDTH - 263, 34);
            }
            context.fillStyle = entry[2] ? COLORS.accent : COLORS.ink;
            font(context, entry[2] ? 13 : 12, entry[2] ? "bold" : "normal");
            context.fillText(entry[0], startX, y);
            context.textAlign = "right";
            context.fillText(entry[1], PAGE_WIDTH - MARGIN - 12, y, 196);
            context.textAlign = "left";
            y += entry[2] ? 39 : 28;
        });
        context.fillStyle = COLORS.muted;
        font(context, 12);
        context.textAlign = "center";
        context.fillText(text(store.receipt_thank_you, "Cảm ơn quý khách đã mua hàng!"), PAGE_WIDTH / 2, y + 22, CONTENT_WIDTH);
        if (store.return_policy_days != null && Number.isFinite(Number(store.return_policy_days))) {
            font(context, 10);
            context.fillText("Hỗ trợ đổi hàng trong " + Math.max(0, Number(store.return_policy_days)) + " ngày theo điều kiện cửa hàng.", PAGE_WIDTH / 2, y + 42, CONTENT_WIDTH);
        }
        context.textAlign = "left";
    }

    async function downloadInvoice(order, filename, storeSettings) {
        if (!order || typeof order !== "object") throw new Error("Thiếu thông tin hóa đơn để xuất PDF.");
        const items = Array.isArray(order.items) ? order.items : Array.isArray(order.order_items) ? order.order_items : [];
        if (!items.length) throw new Error("Hóa đơn chưa có chi tiết sản phẩm. Vui lòng tải lại dữ liệu.");
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        const store = storeSettings || {};
        const canvas = document.createElement("canvas");
        canvas.width = PAGE_WIDTH * PAGE_SCALE;
        canvas.height = PAGE_HEIGHT * PAGE_SCALE;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Trình duyệt không hỗ trợ xuất hóa đơn PDF.");
        context.setTransform(PAGE_SCALE, 0, 0, PAGE_SCALE, 0, 0);
        const rows = invoiceItemRows(context, items);
        const firstTop = invoiceCustomerBlock(context, order, false);
        const pages = [{ top: firstTop, rows: [] }];
        let bottom = firstTop + 37;
        rows.forEach(function (row) {
            if (bottom + row.height > TABLE_BOTTOM) {
                pages.push({ top: 240, rows: [] });
                bottom = 277;
            }
            pages[pages.length - 1].rows.push(row);
            bottom += row.height;
        });
        const totalsHeight = 296;
        if (bottom + totalsHeight > TABLE_BOTTOM) {
            pages.push({ top: 240, rows: [], totalsOnly: true });
        }
        const images = [];
        for (let index = 0; index < pages.length; index += 1) {
            const page = pages[index];
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
            invoiceHeader(context, order, store, index + 1, pages.length);
            if (index === 0) invoiceCustomerBlock(context, order, true);
            const endY = page.totalsOnly ? page.top : invoiceTable(context, page);
            if (index === pages.length - 1) invoiceTotals(context, order, store, endY + 30);
            images.push(await jpegBytes(canvas));
        }
        const blob = assemblePdf(images, canvas.width, canvas.height);
        return savePdf(blob, filename || "hoa-don-" + text(order.order_number || order.id, "ban-le") + ".pdf", pages.length, canvas);
    }

    async function download(report, filename) {
        if (!report || typeof report !== "object") throw new Error("Thiếu nội dung báo cáo để xuất PDF.");
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        const canvas = document.createElement("canvas");
        canvas.width = PAGE_WIDTH * PAGE_SCALE;
        canvas.height = PAGE_HEIGHT * PAGE_SCALE;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Trình duyệt không hỗ trợ xuất báo cáo PDF.");
        context.setTransform(PAGE_SCALE, 0, 0, PAGE_SCALE, 0, 0);
        const orders = Array.isArray(report.orders) ? report.orders : [];
        const rows = makeRows(context, orders);
        const firstTop = firstTableTop(context, report, false);
        const pages = paginate(rows, firstTop);
        const images = [];
        const generatedAt = new Date();
        for (let index = 0; index < pages.length; index += 1) {
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
            drawHeader(context, report, generatedAt, index + 1, pages.length);
            if (index === 0) firstTableTop(context, report, true);
            drawTable(context, pages[index], orders.length, Boolean(report.notice) && !orders.length);
            images.push(await jpegBytes(canvas));
        }
        const blob = assemblePdf(images, canvas.width, canvas.height);
        return savePdf(blob, filename, pages.length, canvas);
    }

    window.PosReportPdf = Object.freeze({ download: download, downloadInvoice: downloadInvoice });
}());
