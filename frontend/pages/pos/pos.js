(function () {
    "use strict";

    const productList = document.getElementById("product-list");
    if (!productList) return;

    const productStatus = document.getElementById("product-status");
    const productSearch = document.getElementById("product-search");
    const categoryFilter = document.getElementById("category-filter");
    const cartElement = document.getElementById("cart-items");
    const phoneInput = document.getElementById("customer-phone");
    const customerName = document.getElementById("customer-name");
    const customerAddress = document.getElementById("customer-address");
    const customerFields = document.getElementById("new-customer-fields");
    const customerStatus = document.getElementById("customer-status");
    const receivedInput = document.getElementById("amount-received");
    const discountInput = document.getElementById("discount-amount");
    const taxRateLabel = document.getElementById("tax-rate-label");
    const qrModal = createModal(document.getElementById("qr-modal"));
    const invoiceModal = createModal(document.getElementById("invoice-modal"));
    const customerHistoryModal = createModal(document.getElementById("pos-customer-history-modal"));
    if (!window.bootstrap || !window.bootstrap.Modal) {
        document.querySelectorAll(".modal [data-bs-dismiss='modal']").forEach(function (button) {
            button.addEventListener("click", function () {
                const modalElement = button.closest(".modal");
                modalElement.classList.remove("show");
                modalElement.style.display = "none";
                modalElement.setAttribute("aria-hidden", "true");
                document.body.classList.remove("modal-open");
            });
        });
        document.querySelectorAll(".modal .btn-close").forEach(function (button) {
            button.textContent = "×";
        });
    }
    const cart = new Map();
    const categoriesById = new Map();
    const cartState = { customerId: null, customerType: "guest", paymentConfirmed: false, qrLoaded: false, pendingOrderId: null };
    let customerLookupSequence = 0;
    let customerLookupTimer = null;
    let products = [];
    let storeSettings = {};
    let paymentQr = null;

    function createModal(element) {
        if (window.bootstrap && window.bootstrap.Modal) {
            return new window.bootstrap.Modal(element);
        }
        return {
            show: function () {
                element.classList.add("show");
                element.style.display = "block";
                element.removeAttribute("aria-hidden");
                document.body.classList.add("modal-open");
            },
            hide: function () {
                element.classList.remove("show");
                element.style.display = "none";
                element.setAttribute("aria-hidden", "true");
                document.body.classList.remove("modal-open");
            }
        };
    }

    function valueFromResponse(response, key) {
        if (!response) return null;
        if (response[key] !== undefined) return response[key];
        if (response.data && response.data[key] !== undefined) return response.data[key];
        return response.data || response;
    }

    function getCategoryName(product) {
        const category = categoriesById.get(String(product.category_id));
        return product.category_name || category && category.name || "Chưa phân loại";
    }

    function getCurrentCustomer() {
        const fullName = customerName.value.trim();
        return {
            id: cartState.customerId,
            phone: phoneInput.value.trim(),
            full_name: fullName,
            address: customerAddress.value.trim()
        };
    }

    function setCustomerType(iconClass, label) {
        const badge = document.getElementById("customer-type-label");
        const icon = document.createElement("i");
        icon.className = "bi " + iconClass;
        icon.setAttribute("aria-hidden", "true");
        badge.replaceChildren(icon, document.createTextNode(" " + label));
    }

    function getPaymentMethod() {
        const selected = document.querySelector("input[name='payment-method']:checked");
        return selected ? selected.value : "cash";
    }

    function invalidatePaymentConfirmation() {
        cartState.paymentConfirmed = false;
    }

    function getTotals() {
        const configuredTaxRate = Number(storeSettings.tax_rate);
        const taxRate = Number.isFinite(configuredTaxRate)
            ? Math.min(100, Math.max(0, configuredTaxRate))
            : 10;
        const paymentMethod = getPaymentMethod();
        const totals = window.PosDomain.calculateTotals(cart, {
            discountPercent: discountInput.value,
            taxRate: taxRate,
            paymentMethod: paymentMethod,
            amountReceived: receivedInput.value,
            paymentConfirmed: cartState.paymentConfirmed
        });

        document.getElementById("subtotal").textContent = window.PosCommon.formatCurrency(totals.subtotal);
        document.getElementById("discount-rate").textContent = String(totals.discountPercent);
        document.getElementById("discount-total").textContent = window.PosCommon.formatCurrency(totals.discountAmount);
        taxRateLabel.textContent = "Thuế VAT (" + totals.taxRate + "%)";
        document.getElementById("tax-total").textContent = window.PosCommon.formatCurrency(totals.taxAmount);
        document.getElementById("total-amount").textContent = window.PosCommon.formatCurrency(totals.totalAmount);
        document.getElementById("change-amount").textContent = window.PosCommon.formatCurrency(totals.changeAmount);
        document.getElementById("qr-payment-amount").textContent = window.PosCommon.formatCurrency(totals.totalAmount);
        document.getElementById("card-payment-confirmation").hidden = paymentMethod !== "card";
        document.getElementById("qr-payment-confirmation").hidden = paymentMethod !== "qr_code";
        document.getElementById("confirm-card-payment").disabled = !cart.size || cartState.paymentConfirmed;
        document.getElementById("confirm-qr-payment").disabled = !cart.size || cartState.paymentConfirmed;
        document.getElementById("open-qr-modal").disabled = !cart.size;
        document.getElementById("card-payment-status").textContent = cartState.paymentConfirmed
            ? "Đã xác nhận thanh toán thẻ cho số tiền hiện tại."
            : "Xác nhận sau khi thiết bị thẻ cho biết giao dịch đã thành công.";
        document.getElementById("qr-payment-confirmation-status").textContent = cartState.paymentConfirmed
            ? "Đã xác nhận thanh toán QR cho số tiền hiện tại. Nếu thay đổi giỏ hàng hoặc giảm giá, cần xác nhận lại."
            : "Cần xác nhận giao dịch cho số tiền hiện tại.";
        if (paymentMethod !== "cash") receivedInput.value = String(totals.amountReceived);
        return totals;
    }

    function createProductCard(product) {
        const column = document.createElement("div");
        column.className = "col-6 col-md-4 col-xl-4";

        const card = document.createElement("article");
        card.className = "pos-product-card";
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", "Thêm " + (product.name || "sản phẩm") + " vào giỏ");
        card.dataset.productCardId = String(product.id);

        const imageFrame = document.createElement("div");
        imageFrame.className = "pos-product-image";
        if (product.image) {
            const image = document.createElement("img");
            image.src = product.image;
            image.alt = product.name || "Sản phẩm thời trang";
            image.loading = "lazy";
            image.onerror = function () {
                image.remove();
                imageFrame.classList.add("is-image-missing");
                imageFrame.textContent = "B'TRIPLE";
            };
            imageFrame.append(image);
        } else {
            imageFrame.classList.add("is-image-missing");
            imageFrame.textContent = "B'TRIPLE";
        }

        const content = document.createElement("div");
        content.className = "pos-product-content";
        const name = document.createElement("h3");
        name.className = "pos-product-name";
        name.textContent = product.name || "Sản phẩm";
        const barcode = document.createElement("p");
        barcode.className = "pos-product-barcode";
        barcode.textContent = "Mã: " + (product.barcode || "—");

        const tags = document.createElement("div");
        tags.className = "pos-product-tags";
        [product.size, product.color].filter(Boolean).forEach(function (tagText) {
            const tag = document.createElement("span");
            tag.className = "pos-product-tag";
            tag.textContent = tagText;
            tags.append(tag);
        });
        if (!tags.childElementCount) {
            const material = document.createElement("span");
            material.className = "pos-product-tag";
            material.textContent = product.material || getCategoryName(product);
            tags.append(material);
        }

        const meta = document.createElement("div");
        meta.className = "pos-product-meta";
        const price = document.createElement("strong");
        price.className = "pos-product-price";
        price.textContent = window.PosCommon.formatCurrency(product.price);
        const stock = document.createElement("span");
        stock.className = "pos-product-stock";
        const quantity = Number(product.stock_quantity);
        stock.textContent = Number.isFinite(quantity) ? "Tồn: " + quantity : "Còn hàng";
        content.append(name, barcode, tags, meta);
        meta.append(price, stock);
        const categoryTag = document.createElement("span");
        categoryTag.className = "pos-product-tag";
        categoryTag.textContent = getCategoryName(product);
        categoryTag.setAttribute("aria-label", "Danh mục: " + getCategoryName(product));
        const categoryTagRow = document.createElement("div");
        categoryTagRow.className = "pos-product-tags mt-2";
        categoryTagRow.append(categoryTag);
        content.append(categoryTagRow);
        card.append(imageFrame, content);

        if (Number.isFinite(quantity) && quantity <= 0) {
            card.classList.add("is-out-of-stock");
            card.setAttribute("aria-disabled", "true");
        }
        column.append(card);
        return column;
    }

    function getVisibleProducts() {
        const query = productSearch.value.trim().toLocaleLowerCase("vi");
        const selectedCategory = categoryFilter.querySelector(".category-chip.is-active");
        const categoryId = selectedCategory ? selectedCategory.dataset.categoryId : "all";
        return products.filter(function (product) {
            const matchesQuery = [
                product.name,
                product.material,
                product.barcode,
                product.size,
                product.color
            ].join(" ").toLocaleLowerCase("vi").includes(query);
            const matchesCategory = categoryId === "all" || String(product.category_id) === categoryId;
            return matchesQuery && matchesCategory;
        });
    }

    function renderProducts() {
        const visibleProducts = getVisibleProducts();
        productList.replaceChildren();
        document.getElementById("product-count").textContent = visibleProducts.length + " sản phẩm";
        if (!visibleProducts.length) {
            const empty = document.createElement("div");
            empty.className = "col-12";
            const message = document.createElement("p");
            message.className = "empty-state";
            message.textContent = "Không tìm thấy sản phẩm phù hợp.";
            empty.append(message);
            productList.append(empty);
            return;
        }
        visibleProducts.forEach(function (product) {
            productList.append(createProductCard(product));
        });
    }

    function renderCategories() {
        categoryFilter.querySelectorAll("[data-category-id]:not([data-category-id='all'])").forEach(function (button) {
            button.remove();
        });
        categoriesById.forEach(function (category, id) {
            const button = document.createElement("button");
            button.className = "category-chip";
            button.type = "button";
            button.dataset.categoryId = id;
            button.setAttribute("aria-pressed", "false");
            button.textContent = category.name;
            categoryFilter.append(button);
        });
    }

    function addProduct(product) {
        if (!product) return;
        const result = window.PosDomain.addProduct(cart, product);
        if (!result.added && result.reason === "out-of-stock") {
            window.PosCommon.notify("Sản phẩm đã hết hàng.", "warning");
            return;
        }
        if (!result.added && result.reason === "stock-limit") {
            window.PosCommon.notify("Số lượng trong giỏ vượt quá tồn kho.", "warning");
            return;
        }
        if (!result.added) {
            window.PosCommon.notify("Không thể thêm sản phẩm: dữ liệu sản phẩm không hợp lệ.", "danger");
            return;
        }
        invalidatePaymentConfirmation();
        renderCart();
    }

    function createCartRow(item, id) {
        const row = document.createElement("article");
        row.className = "pos-cart-item";

        const description = document.createElement("div");
        description.className = "pos-cart-description";
        const name = document.createElement("h3");
        name.className = "pos-cart-name";
        name.textContent = item.product.name || "Sản phẩm";
        const variant = document.createElement("p");
        variant.className = "pos-cart-variant";
        variant.textContent = [item.product.size, item.product.color].filter(Boolean).join(" · ") || "Thời trang";
        const unitPrice = document.createElement("span");
        unitPrice.className = "pos-cart-unit-price";
        unitPrice.textContent = window.PosCommon.formatCurrency(item.product.price) + " / sản phẩm";
        description.append(name, variant, unitPrice);

        const controls = document.createElement("div");
        controls.className = "pos-cart-controls";
        const quantityControls = document.createElement("div");
        quantityControls.className = "pos-quantity-controls";
        [["decrease", "−", "Giảm số lượng"], ["increase", "+", "Tăng số lượng"]].forEach(function (entry) {
            const button = document.createElement("button");
            button.className = "pos-quantity-button";
            button.type = "button";
            button.dataset.cartAction = entry[0];
            button.dataset.productId = id;
            button.setAttribute("aria-label", entry[2]);
            button.textContent = entry[1];
            quantityControls.append(button);
        });
        const quantity = document.createElement("span");
        quantity.className = "pos-cart-quantity";
        quantity.textContent = String(item.quantity);
        quantityControls.insertBefore(quantity, quantityControls.lastChild);

        const lineTotal = document.createElement("strong");
        lineTotal.className = "pos-cart-line-total";
        lineTotal.textContent = window.PosCommon.formatCurrency(Number(item.product.price) * item.quantity);
        const remove = document.createElement("button");
        remove.className = "btn btn-link btn-sm text-danger p-0";
        remove.type = "button";
        remove.dataset.cartAction = "remove";
        remove.dataset.productId = id;
        remove.textContent = "Bỏ";
        controls.append(quantityControls, lineTotal, remove);
        row.append(description, controls);
        return row;
    }

    function renderCart() {
        cartElement.replaceChildren();
        let itemCount = 0;
        cart.forEach(function (item, id) {
            itemCount += item.quantity;
            cartElement.append(createCartRow(item, id));
        });
        document.getElementById("cart-item-count").textContent = itemCount
            ? itemCount + " sản phẩm"
            : "0 sản phẩm";
        if (!cart.size) {
            const empty = document.createElement("p");
            empty.className = "empty-state mb-0";
            empty.textContent = "Chưa có sản phẩm trong giỏ";
            cartElement.append(empty);
            invalidatePaymentConfirmation();
        }
        updatePaymentFields();
        getTotals();
    }

    function updatePaymentFields() {
        const paymentMethod = getPaymentMethod();
        const isCash = paymentMethod === "cash";
        receivedInput.readOnly = !isCash;
        receivedInput.setAttribute("aria-readonly", String(!isCash));
        if (!isCash) getTotals();
        document.getElementById("confirm-qr-payment").disabled = !cart.size || cartState.paymentConfirmed;
    }

    async function loadProducts() {
        productStatus.textContent = "Đang tải sản phẩm...";
        productStatus.classList.remove("is-error");
        try {
            products = window.PosCommon.unwrapList(await window.PosApi.get("products?status=active"));
            productStatus.textContent = products.length + " sản phẩm đang bán";
            renderProducts();
        } catch (error) {
            products = [];
            productStatus.textContent = "Không tải được sản phẩm: " + error.message;
            productStatus.classList.add("is-error");
            renderProducts();
            window.PosCommon.notify("Không tải được sản phẩm: " + error.message, "danger");
        }
    }

    async function loadCategories() {
        try {
            const response = await window.PosApi.get("categories");
            const categories = window.PosCommon.unwrapList(response);
            categories.forEach(function (category) {
                categoriesById.set(String(category.id), category);
            });
            renderCategories();
            renderProducts();
        } catch (error) {
            categoriesById.clear();
            renderCategories();
            renderProducts();
            window.PosCommon.notify("Không tải được danh mục: " + error.message, "danger");
        }
    }

    async function loadReceiptSettings() {
        try {
            const response = await window.PosApi.get("store_settings");
            const settings = valueFromResponse(response, "settings");
            if (Array.isArray(settings)) {
                settings.forEach(function (setting) {
                    storeSettings[setting.setting_key] = setting.setting_value;
                });
            } else if (settings && typeof settings === "object") {
                storeSettings = settings;
            }
        } catch (error) {
            window.PosCommon.notify("Không tải được thông tin cửa hàng: " + error.message, "warning");
        }
        getTotals();
    }

    async function loadPaymentQr() {
        const status = document.getElementById("qr-status");
        const image = document.getElementById("payment-qr-image");
        image.hidden = true;
        status.hidden = false;
        status.textContent = "Đang tải mã QR...";
        try {
            const response = await window.PosApi.get("payment_qrcodes?is_active=1");
            const records = window.PosCommon.unwrapList(response);
            paymentQr = records.find(function (record) {
                return record.is_active === true || Number(record.is_active) === 1;
            });
            if (!paymentQr || !paymentQr.qr_code_path) {
                throw new Error("Chưa cấu hình mã QR thanh toán đang hoạt động.");
            }
            image.src = paymentQr.qr_code_path;
            image.alt = paymentQr.description || "Mã QR thanh toán";
            image.hidden = false;
            status.hidden = true;
            document.getElementById("qr-payment-description").textContent = paymentQr.description || paymentQr.payment_method || "";
            cartState.qrLoaded = true;
        } catch (error) {
            status.textContent = error.message;
            cartState.qrLoaded = false;
            window.PosCommon.notify(error.message, "danger");
        }
    }

    async function lookupCustomer() {
        const phone = phoneInput.value.trim();
        resetCustomer(false);
        const lookupSequence = ++customerLookupSequence;
        if (!phone) {
            customerStatus.textContent = "Nhập số điện thoại để tra cứu hoặc đăng ký khách hàng mới.";
            return;
        }
        customerStatus.textContent = "Đang tra cứu khách hàng...";
        customerStatus.classList.remove("text-danger");
        try {
            const response = await window.PosApi.get("customers/lookup?phone=" + encodeURIComponent(phone));
            if (lookupSequence !== customerLookupSequence || phone !== phoneInput.value.trim()) return;
            const customer = valueFromResponse(response, "customer");
            if (!customer || customer.id == null) {
                cartState.customerType = "new";
                customerName.readOnly = false;
                customerAddress.readOnly = false;
                customerFields.hidden = false;
                customerStatus.textContent = "Khách mới — nhập họ tên và địa chỉ.";
                document.getElementById("customer-history").hidden = true;
                setCustomerType("bi-person-plus", "Khách mới");
                return;
            }
            cartState.customerId = customer.id;
            cartState.customerType = "existing";
            customerName.value = customer.full_name || "";
            customerAddress.value = customer.address || "";
            customerName.readOnly = true;
            customerAddress.readOnly = true;
            customerFields.hidden = false;
            customerStatus.textContent = "Khách hàng cũ: " + customerName.value;
            document.getElementById("customer-history").hidden = false;
            setCustomerType("bi-person-check", "Khách hàng cũ");
        } catch (error) {
            if (lookupSequence !== customerLookupSequence || phone !== phoneInput.value.trim()) return;
            if (error.status === 404) {
                cartState.customerType = "new";
                customerName.readOnly = false;
                customerAddress.readOnly = false;
                customerFields.hidden = false;
                customerStatus.textContent = "Khách mới — nhập họ tên và địa chỉ.";
                document.getElementById("customer-history").hidden = true;
                setCustomerType("bi-person-plus", "Khách mới");
                return;
            }
            customerStatus.textContent = error.message;
            customerStatus.classList.add("text-danger");
            throw error;
        }
    }

    function resetCustomer(clearPhone) {
        customerLookupSequence += 1;
        cartState.customerId = null;
        cartState.customerType = "guest";
        customerName.value = "";
        customerAddress.value = "";
        customerName.readOnly = false;
        customerAddress.readOnly = false;
        customerFields.hidden = true;
        document.getElementById("customer-history").hidden = true;
        customerStatus.classList.remove("text-danger");
        customerStatus.textContent = "Nhập số điện thoại để tra cứu hoặc đăng ký khách hàng mới.";
        setCustomerType("bi-person", "Chưa chọn khách");
        if (clearPhone) phoneInput.value = "";
    }

    function validateCheckout(totals, requirePayment) {
        const error = window.PosDomain.validateCheckout({
            cart: cart,
            customer: {
                phone: phoneInput.value,
                fullName: customerName.value,
                address: customerAddress.value,
                customerType: cartState.customerType,
                customerId: cartState.customerId
            },
            totals: totals,
            requirePayment: requirePayment,
            paymentConfirmed: cartState.paymentConfirmed
        });
        if (!error) return true;

        const messages = {
            "empty-cart": "Thêm ít nhất một sản phẩm vào giỏ hàng.",
            "lookup-required": "Tra cứu số điện thoại trước khi thanh toán.",
            "phone-required": "Nhập số điện thoại khách hàng.",
            "invalid-phone": "Số điện thoại khách hàng phải có từ 8 đến 15 chữ số.",
            "name-required": "Nhập họ tên khách hàng.",
            "address-required": "Nhập địa chỉ khách hàng mới.",
            "insufficient-cash": "Tiền khách đưa chưa đủ thanh toán.",
            "qr-not-confirmed": "Xác nhận đã nhận thanh toán QR cho số tiền hiện tại trước khi hoàn tất.",
            "card-not-confirmed": "Xác nhận thiết bị thẻ đã báo giao dịch thành công trước khi hoàn tất."
        };
        window.PosCommon.notify(messages[error] || "Thông tin thanh toán không hợp lệ.", "warning");
        if (["phone-required", "lookup-required", "invalid-phone"].includes(error)) {
            phoneInput.focus();
        } else if (error === "name-required") {
            customerName.focus();
        } else if (error === "address-required") {
            customerAddress.focus();
        } else if (error === "insufficient-cash") {
            receivedInput.focus();
        }
        return false;
    }

    function appendReceiptLine(parent, label, value, emphasized) {
        const line = document.createElement("div");
        line.className = "receipt-line" + (emphasized ? " is-emphasized" : "");
        const name = document.createElement("span");
        name.textContent = label;
        const amount = document.createElement("strong");
        amount.textContent = value;
        line.append(name, amount);
        parent.append(line);
    }

    function buildReceipt(orderResponse) {
        const order = valueFromResponse(orderResponse, "order") || {};
        const items = Array.isArray(order.items)
            ? order.items
            : Array.isArray(order.order_items) ? order.order_items : [];
        const customer = order.customer || {};
        if (order.id == null || !items.length) {
            throw new Error("Máy chủ chưa trả về đủ chi tiết đơn hàng để in hóa đơn.");
        }
        const receipt = document.getElementById("invoice-content");
        receipt.replaceChildren();

        const logo = document.createElement("div");
        logo.className = "receipt-logo";
        logo.textContent = storeSettings.logo_text || "B'TRIPLE";
        const storeName = document.createElement("h3");
        storeName.className = "receipt-store-name";
        storeName.textContent = storeSettings.store_name || storeSettings.name || "B'TRIPLE Fashion Store";
        const address = document.createElement("p");
        address.className = "receipt-store-address";
        address.textContent = storeSettings.store_address || storeSettings.address || "";
        const title = document.createElement("h4");
        title.className = "receipt-title";
        title.textContent = "HÓA ĐƠN BÁN LẺ";
        const meta = document.createElement("div");
        meta.className = "receipt-meta";
        const orderNo = document.createElement("p");
        orderNo.textContent = "Mã đơn: " + (order.order_number || orderResponse.order_number || order.id || "Đang cập nhật");
        const date = document.createElement("p");
        date.textContent = "Ngày: " + (order.created_at ? new Date(order.created_at).toLocaleString("vi-VN") : new Date().toLocaleString("vi-VN"));
        const cashier = document.createElement("p");
        const cashierInfo = order.cashier || order.user || {};
        cashier.textContent = "Thu ngân: " +
            ([cashierInfo.first_name, cashierInfo.last_name].filter(Boolean).join(" ") ||
                cashierInfo.name || order.cashier_name || sessionStorage.getItem("pos-user-name") || "Nhân viên bán hàng");
        const customerLine = document.createElement("p");
        customerLine.textContent = "Khách hàng: " + (customer.full_name || order.customer_name || order.customer_snapshot_name || "Khách lẻ");
        const customerPhoneLine = document.createElement("p");
        customerPhoneLine.textContent = "SĐT: " + (customer.phone || order.customer_phone || order.customer_snapshot_phone || "—");
        const customerAddressLine = document.createElement("p");
        customerAddressLine.textContent = "Địa chỉ: " + (customer.address || order.customer_address || order.customer_snapshot_address || "—");
        meta.append(orderNo, date, cashier, customerLine, customerPhoneLine, customerAddressLine);

        const divider = document.createElement("hr");
        divider.className = "receipt-divider";
        const itemList = document.createElement("div");
        itemList.className = "receipt-items";
        items.forEach(function (item) {
            const product = item.product || {};
            const quantity = Number(item.quantity) || 0;
            const unitPrice = Number(item.unit_price ?? product.price) || 0;
            const itemName = item.product_name || product.name || "Sản phẩm";
            const entry = document.createElement("div");
            entry.className = "receipt-item";
            const itemHeading = document.createElement("strong");
            itemHeading.textContent = itemName + " × " + quantity;
            const variant = document.createElement("small");
            variant.textContent = [item.size || product.size, item.color || product.color].filter(Boolean).join(" · ") || " ";
            const detail = document.createElement("div");
            detail.className = "receipt-line";
            const unitPriceLabel = document.createElement("span");
            unitPriceLabel.textContent = window.PosCommon.formatCurrency(unitPrice);
            const lineTotal = document.createElement("strong");
            lineTotal.textContent = window.PosCommon.formatCurrency(item.total_price ?? unitPrice * quantity);
            detail.append(unitPriceLabel, lineTotal);
            entry.append(itemHeading, variant, detail);
            itemList.append(entry);
        });

        const totalsBlock = document.createElement("div");
        totalsBlock.className = "receipt-totals";
        appendReceiptLine(totalsBlock, "Tạm tính", window.PosCommon.formatCurrency(order.subtotal));
        appendReceiptLine(totalsBlock, "Chiết khấu", window.PosCommon.formatCurrency(order.discount_amount));
        appendReceiptLine(totalsBlock, "Thuế", window.PosCommon.formatCurrency(order.tax_amount));
        appendReceiptLine(totalsBlock, "Tổng cộng", window.PosCommon.formatCurrency(order.total_amount), true);
        const paymentLabels = { cash: "Tiền mặt", card: "Thẻ", qr_code: "Chuyển khoản / QR" };
        appendReceiptLine(totalsBlock, "Phương thức", paymentLabels[order.payment_method] || order.payment_method);
        appendReceiptLine(totalsBlock, "Khách đưa", window.PosCommon.formatCurrency(order.amount_received));
        appendReceiptLine(totalsBlock, "Tiền thừa", window.PosCommon.formatCurrency(order.change_amount));
        const footerDivider = document.createElement("hr");
        footerDivider.className = "receipt-divider";
        const thanks = document.createElement("p");
        thanks.className = "receipt-thanks";
        thanks.textContent = storeSettings.receipt_thank_you || "Cảm ơn quý khách đã mua hàng!";
        const policy = document.createElement("p");
        policy.className = "receipt-policy";
        const returnDays = Math.max(0, Number(storeSettings.return_policy_days) || 7);
        policy.textContent = "Chính sách đổi trả: hỗ trợ đổi hàng trong " + returnDays + " ngày theo điều kiện cửa hàng.";
        receipt.append(logo, storeName, address, title, meta, divider, itemList, totalsBlock, footerDivider, thanks, policy);
    }

    function buildOrderPayload(status, totals, customer, cartItems) {
        return {
            customer_id: customer.id == null ? null : customer.id,
            customer: {
                phone: customer.phone || null,
                full_name: customer.full_name || "Khách vãng lai",
                address: customer.address || ""
            },
            discount_percent: totals.discountPercent,
            totals: {
                subtotal: totals.subtotal,
                discount_amount: totals.discountAmount,
                tax_amount: totals.taxAmount,
                total_amount: totals.totalAmount
            },
            payment_method: totals.paymentMethod,
            amount_received: totals.amountReceived,
            change_amount: totals.changeAmount,
            status: status,
            items: cartItems.map(function (item) {
                return {
                    product_id: item.product.id,
                    quantity: item.quantity
                };
            })
        };
    }

    function resetSaleForm() {
        window.clearTimeout(customerLookupTimer);
        cart.clear();
        cartState.pendingOrderId = null;
        receivedInput.value = "";
        discountInput.value = "0";
        document.getElementById("payment-cash").checked = true;
        resetCustomer(true);
        invalidatePaymentConfirmation();
        renderCart();
    }

    async function submitOrder(status, button) {
        const isComplete = status === "completed";
        const totals = getTotals();
        if (!validateCheckout(totals, isComplete)) return;

        button.disabled = true;
        const pendingOrderId = cartState.pendingOrderId;
        const cartItems = Array.from(cart.values()).map(function (item) {
            return { product_id: item.product.id, quantity: item.quantity, product: item.product };
        });
        const customer = getCurrentCustomer();
        try {
            const orderData = buildOrderPayload(status, totals, customer, cartItems);
            const orderPath = pendingOrderId
                ? "orders/" + encodeURIComponent(pendingOrderId)
                : "orders";
            const orderResponse = pendingOrderId
                ? await window.PosApi.put(orderPath, orderData)
                : await window.PosApi.post(orderPath, orderData);
            if (isComplete) {
                resetSaleForm();
                const createdOrder = valueFromResponse(orderResponse, "order") || {};
                try {
                    let receiptResponse = orderResponse;
                    const createdItems = Array.isArray(createdOrder.items) || Array.isArray(createdOrder.order_items);
                    if (!createdItems) {
                        if (createdOrder.id == null) {
                            throw new Error("Máy chủ chưa trả về mã đơn hàng để tải chi tiết hóa đơn.");
                        }
                        receiptResponse = await window.PosApi.get("orders/" + encodeURIComponent(createdOrder.id));
                    }
                    buildReceipt(receiptResponse);
                    invoiceModal.show();
                } catch (receiptError) {
                    const orderNumber = createdOrder.order_number || createdOrder.id || "vừa tạo";
                    window.PosCommon.notify("Đơn " + orderNumber + " đã được lưu, nhưng chưa tải được chi tiết hóa đơn. Bạn có thể mở lại đơn trong mục Hóa đơn.", "warning");
                }
            } else {
                resetSaleForm();
                window.PosCommon.notify("Đã lưu đơn bán hàng chờ xử lý.", "success");
            }
        } catch (error) {
            window.PosCommon.notify(error.message, "danger");
        } finally {
            button.disabled = false;
        }
    }

    async function resumePendingOrder() {
        const orderId = new URLSearchParams(window.location.search).get("resume_order");
        if (!orderId) return;

        try {
            const response = await window.PosApi.get("orders/" + encodeURIComponent(orderId));
            const order = valueFromResponse(response, "order") || response;
            const items = Array.isArray(order.items)
                ? order.items
                : Array.isArray(order.order_items) ? order.order_items : [];
            if (order.status !== "pending" || !items.length) {
                throw new Error("Đơn này không còn là đơn nháp có thể tiếp tục.");
            }

            cart.clear();
            items.forEach(function (item) {
                const productInfo = item.product || {};
                const productId = item.product_id ?? productInfo.id;
                const currentProduct = products.find(function (product) {
                    return String(product.id) === String(productId);
                }) || {};
                const price = Number(item.unit_price ?? productInfo.price ?? currentProduct.price);
                const quantity = Number(item.quantity);
                if (productId == null || !Number.isFinite(price) || !Number.isInteger(quantity) || quantity < 1) {
                    throw new Error("Chi tiết sản phẩm trong đơn nháp không hợp lệ.");
                }
                const product = Object.assign({}, currentProduct, productInfo, {
                    id: productId,
                    name: item.product_name || productInfo.name || currentProduct.name || "Sản phẩm",
                    price: price,
                    size: item.size || productInfo.size || currentProduct.size || "",
                    color: item.color || productInfo.color || currentProduct.color || ""
                });
                cart.set(String(productId), { product: product, quantity: quantity });
            });

            cartState.pendingOrderId = order.id;
            cartState.paymentConfirmed = false;
            discountInput.value = String(order.discount_percent || 0);
            const method = ["cash", "card", "qr_code"].includes(order.payment_method)
                ? order.payment_method
                : "cash";
            const methodInput = document.querySelector("input[name='payment-method'][value='" + method + "']");
            if (methodInput) methodInput.checked = true;
            receivedInput.value = method === "cash" ? String(order.amount_received || 0) : "";

            const customer = order.customer || {};
            const customerId = order.customer_id ?? customer.id;
            phoneInput.value = customer.phone || order.customer_phone || order.customer_snapshot_phone || "";
            customerName.value = customer.full_name || order.customer_name || order.customer_snapshot_name || "";
            customerAddress.value = customer.address || order.customer_address || order.customer_snapshot_address || "";
            cartState.customerId = customerId == null ? null : customerId;
            if (cartState.customerId != null) {
                cartState.customerType = "existing";
                customerName.readOnly = true;
                customerAddress.readOnly = true;
                customerFields.hidden = false;
                document.getElementById("customer-history").hidden = false;
                customerStatus.textContent = "Đơn nháp của khách hàng cũ.";
                setCustomerType("bi-person-check", "Khách hàng cũ");
            } else if (phoneInput.value.trim()) {
                cartState.customerType = "new";
                customerName.readOnly = false;
                customerAddress.readOnly = false;
                customerFields.hidden = false;
                document.getElementById("customer-history").hidden = true;
                customerStatus.textContent = "Khách mới trong đơn nháp.";
                setCustomerType("bi-person-plus", "Khách mới");
            } else {
                resetCustomer(false);
            }

            renderCart();
            getTotals();
            window.PosCommon.notify("Đã mở đơn nháp " + (order.order_number || order.id) + ". Hãy xác nhận thanh toán lại trước khi hoàn tất.", "info");
        } catch (error) {
            window.PosCommon.notify("Không thể tiếp tục đơn nháp: " + error.message, "danger");
        }
    }

    function setCurrentTime() {
        document.getElementById("pos-current-time").textContent = new Date().toLocaleString("vi-VN", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function customerOrderItems(order) {
        return Array.isArray(order.items) ? order.items : Array.isArray(order.order_items) ? order.order_items : [];
    }

    function customerOrderQuantity(order) {
        const reportedQuantity = order.items_sold ?? order.total_items ?? order.product_count;
        if (reportedQuantity != null && Number.isFinite(Number(reportedQuantity))) return Number(reportedQuantity);
        return customerOrderItems(order).reduce(function (total, item) {
            return total + (Number(item.quantity) || 0);
        }, 0);
    }

    function customerHistoryOrders(payload) {
        try {
            return window.PosCommon.unwrapList(payload);
        } catch (error) {
            const data = payload && payload.data && typeof payload.data === "object" ? payload.data : payload;
            if (data && Array.isArray(data.orders)) return data.orders;
            throw error;
        }
    }

    function renderCustomerOrderDetails(order) {
        const section = document.getElementById("pos-customer-order-detail");
        section.replaceChildren();
        section.hidden = false;
        const title = document.createElement("h3");
        title.className = "h6 fw-bold";
        title.textContent = "Chi tiết đơn " + (order.order_number || "ORD-" + order.id);
        const table = document.createElement("table");
        table.className = "table table-sm mb-0";
        const head = document.createElement("thead");
        const headRow = document.createElement("tr");
        ["Sản phẩm", "Số lượng", "Đơn giá", "Thành tiền"].forEach(function (label) {
            const cell = document.createElement("th");
            cell.textContent = label;
            cell.scope = "col";
            headRow.append(cell);
        });
        head.append(headRow);
        const body = document.createElement("tbody");
        customerOrderItems(order).forEach(function (item) {
            const product = item.product || item.products || {};
            const row = document.createElement("tr");
            [
                product.name || item.product_name || "Sản phẩm",
                Number(item.quantity) || 0,
                window.PosCommon.formatCurrency(item.unit_price ?? item.price),
                window.PosCommon.formatCurrency(item.total_price ?? Number(item.unit_price || 0) * Number(item.quantity || 0))
            ].forEach(function (value) {
                const cell = document.createElement("td");
                cell.textContent = String(value);
                row.append(cell);
            });
            body.append(row);
        });
        if (!body.childElementCount) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 4;
            cell.textContent = "Máy chủ chưa trả về chi tiết sản phẩm của đơn hàng.";
            row.append(cell);
            body.append(row);
        }
        table.append(head, body);
        section.append(title, table);
    }

    async function loadCustomerHistory() {
        if (cartState.customerType !== "existing" || cartState.customerId == null) return;
        const customer = getCurrentCustomer();
        const status = document.getElementById("pos-customer-history-status");
        const table = document.getElementById("pos-customer-orders");
        const detail = document.getElementById("pos-customer-order-detail");
        status.textContent = "Đang tải lịch sử giao dịch...";
        status.classList.remove("text-danger");
        table.replaceChildren();
        detail.replaceChildren();
        detail.hidden = true;
        document.getElementById("pos-customer-history-title").textContent = "Lịch sử mua hàng — " + (customer.full_name || "Khách hàng");
        document.getElementById("pos-customer-history-summary").textContent = [customer.phone, customer.address].filter(Boolean).join(" · ");
        customerHistoryModal.show();

        try {
            const payload = await window.PosApi.get("customers/" + encodeURIComponent(customer.id) + "/orders");
            const orders = customerHistoryOrders(payload).slice().sort(function (left, right) {
                return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime();
            });
            orders.forEach(function (order) {
                const row = document.createElement("tr");
                const values = [
                    order.order_number || "ORD-" + order.id,
                    order.created_at ? new Date(String(order.created_at).replace(" ", "T")).toLocaleString("vi-VN") : "—",
                    customerOrderQuantity(order).toLocaleString("vi-VN"),
                    window.PosCommon.formatCurrency(order.total_amount ?? order.total),
                    window.PosCommon.formatCurrency(order.amount_received),
                    window.PosCommon.formatCurrency(order.change_amount)
                ];
                values.forEach(function (value, index) {
                    const cell = document.createElement("td");
                    cell.textContent = String(value);
                    if (index >= 2) cell.className = "text-end text-nowrap";
                    row.append(cell);
                });
                const action = document.createElement("td");
                action.className = "text-end";
                const button = document.createElement("button");
                button.className = "btn btn-sm btn-outline-secondary";
                button.type = "button";
                button.dataset.customerOrderId = String(order.id);
                button.textContent = "Chi tiết";
                action.append(button);
                row.append(action);
                table.append(row);
            });
            if (!orders.length) {
                const row = document.createElement("tr");
                const cell = document.createElement("td");
                cell.colSpan = 7;
                cell.className = "empty-state";
                cell.textContent = "Khách hàng chưa có đơn hàng.";
                row.append(cell);
                table.append(row);
            }
            status.textContent = orders.length + " đơn hàng";
        } catch (error) {
            status.textContent = "Không tải được lịch sử: " + error.message;
            status.classList.add("text-danger");
        }
    }

    async function loadCustomerOrderDetails(orderId, button) {
        button.disabled = true;
        const section = document.getElementById("pos-customer-order-detail");
        section.hidden = false;
        section.textContent = "Đang tải chi tiết đơn hàng...";
        try {
            const response = await window.PosApi.get("orders/" + encodeURIComponent(orderId));
            const data = response && response.data && !Array.isArray(response.data) ? response.data : response;
            const order = data && (data.order || data);
            if (!order || order.id == null) throw new Error("Máy chủ không trả về chi tiết đơn hợp lệ.");
            renderCustomerOrderDetails(order);
        } catch (error) {
            section.textContent = "Không tải được chi tiết đơn hàng: " + error.message;
        } finally {
            button.disabled = false;
        }
    }

    productList.addEventListener("click", function (event) {
        const card = event.target.closest("[data-product-card-id]");
        if (!card || card.classList.contains("is-out-of-stock")) return;
        addProduct(products.find(function (product) {
            return String(product.id) === card.dataset.productCardId;
        }));
    });
    productList.addEventListener("keydown", function (event) {
        const card = event.target.closest("[data-product-card-id]");
        if (card && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            card.click();
        }
    });
    productSearch.addEventListener("input", renderProducts);
    productSearch.addEventListener("keydown", function (event) {
        if (event.key !== "Enter") return;
        const searchValue = productSearch.value.trim();
        if (!searchValue) return;
        const product = window.PosDomain.findByBarcode(products, searchValue);
        if (!product) {
            const visibleProducts = getVisibleProducts();
            if (visibleProducts.length) return;
            event.preventDefault();
            window.PosCommon.notify("Không tìm thấy sản phẩm có barcode này.", "warning");
            productSearch.select();
            return;
        }
        event.preventDefault();
        addProduct(product);
        productSearch.value = "";
        renderProducts();
        productSearch.focus();
    });
    categoryFilter.addEventListener("click", function (event) {
        const button = event.target.closest("[data-category-id]");
        if (!button) return;
        categoryFilter.querySelectorAll(".category-chip").forEach(function (chip) {
            const active = chip === button;
            chip.classList.toggle("is-active", active);
            chip.setAttribute("aria-pressed", String(active));
        });
        renderProducts();
    });
    cartElement.addEventListener("click", function (event) {
        const button = event.target.closest("[data-cart-action]");
        if (!button) return;
        const id = button.dataset.productId;
        const item = cart.get(id);
        if (!item) return;
        const result = window.PosDomain.updateQuantity(cart, id, button.dataset.cartAction);
        if (!result.updated && result.reason === "stock-limit") {
            window.PosCommon.notify("Số lượng trong giỏ vượt quá tồn kho.", "warning");
            return;
        }
        invalidatePaymentConfirmation();
        renderCart();
    });
    document.getElementById("clear-cart").addEventListener("click", function () {
        cart.clear();
        invalidatePaymentConfirmation();
        renderCart();
    });
    document.getElementById("customer-history").addEventListener("click", loadCustomerHistory);
    document.getElementById("pos-customer-orders").addEventListener("click", function (event) {
        const button = event.target.closest("[data-customer-order-id]");
        if (button) loadCustomerOrderDetails(button.dataset.customerOrderId, button);
    });
    document.getElementById("lookup-customer").addEventListener("click", function () {
        lookupCustomer().catch(function (error) {
            window.PosCommon.notify(error.message, "danger");
        });
    });
    phoneInput.addEventListener("input", function () {
        window.clearTimeout(customerLookupTimer);
        resetCustomer(false);
        const digits = phoneInput.value.replace(/\D/g, "");
        if (digits.length < 8) {
            customerStatus.textContent = digits.length
                ? "Nhập đủ số điện thoại để tra cứu."
                : "Nhập số điện thoại để tra cứu hoặc đăng ký khách hàng mới.";
            return;
        }
        customerLookupTimer = window.setTimeout(function () {
            lookupCustomer().catch(function (error) {
                window.PosCommon.notify(error.message, "danger");
            });
        }, 350);
    });
    phoneInput.addEventListener("change", function () {
        window.clearTimeout(customerLookupTimer);
        if (phoneInput.value.trim()) {
            lookupCustomer().catch(function (error) {
                window.PosCommon.notify(error.message, "danger");
            });
        }
    });
    phoneInput.addEventListener("keydown", function (event) {
        if (event.key !== "Enter") return;
        event.preventDefault();
        window.clearTimeout(customerLookupTimer);
        lookupCustomer().catch(function (error) {
            window.PosCommon.notify(error.message, "danger");
        });
    });
    document.querySelectorAll("input[name='payment-method']").forEach(function (radio) {
        radio.addEventListener("change", function () {
            invalidatePaymentConfirmation();
            receivedInput.value = "";
            updatePaymentFields();
            getTotals();
            if (getPaymentMethod() === "qr_code") {
                openQrPaymentModal();
            }
        });
    });
    function openQrPaymentModal() {
        const totals = getTotals();
        document.getElementById("qr-payment-amount").textContent = window.PosCommon.formatCurrency(totals.totalAmount);
        qrModal.show();
        if (!cartState.qrLoaded) loadPaymentQr();
    }

    document.getElementById("open-qr-modal").addEventListener("click", openQrPaymentModal);
    discountInput.addEventListener("input", function () {
        invalidatePaymentConfirmation();
        getTotals();
    });
    receivedInput.addEventListener("input", getTotals);
    document.getElementById("confirm-qr-payment").addEventListener("click", function () {
        if (!cartState.qrLoaded) {
            window.PosCommon.notify("Chưa tải được mã QR. Vui lòng kiểm tra cấu hình thanh toán.", "warning");
            return;
        }
        if (!cart.size) {
            window.PosCommon.notify("Thêm sản phẩm vào giỏ trước khi xác nhận thanh toán.", "warning");
            return;
        }
        cartState.paymentConfirmed = true;
        qrModal.hide();
        getTotals();
    });
    document.getElementById("confirm-card-payment").addEventListener("click", function () {
        if (!cart.size) {
            window.PosCommon.notify("Thêm sản phẩm vào giỏ trước khi xác nhận thanh toán.", "warning");
            return;
        }
        cartState.paymentConfirmed = true;
        getTotals();
    });
    document.getElementById("complete-order").addEventListener("click", function () {
        submitOrder("completed", this);
    });
    document.getElementById("save-sale").addEventListener("click", function () {
        submitOrder("pending", this);
    });
    document.getElementById("print-invoice").addEventListener("click", function () {
        const originalTitle = document.title;
        const receiptNumber = document.querySelector("#invoice-content .receipt-meta p");
        const orderNumber = receiptNumber ? receiptNumber.textContent.replace("Mã đơn: ", "") : "pos";
        document.title = "hoa-don-" + orderNumber.replace(/[^a-z0-9-]/gi, "-");
        window.addEventListener("afterprint", function () {
            document.title = originalTitle;
        }, { once: true });
        window.print();
    });

    setCurrentTime();
    window.setInterval(setCurrentTime, 60000);
    renderCart();
    Promise.all([loadProducts(), loadCategories(), loadReceiptSettings()]).then(function () {
        return resumePendingOrder();
    });
}());
