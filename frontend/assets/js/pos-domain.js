(function (root, factory) {
    "use strict";

    const domain = factory();
    if (typeof module === "object" && module.exports) {
        module.exports = domain;
    }
    if (root) {
        root.PosDomain = domain;
    }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    function stockLimit(product) {
        if (product.stock_quantity == null || product.stock_quantity === "") return null;
        const stock = Number(product.stock_quantity);
        return Number.isFinite(stock) ? stock : null;
    }

    function addProduct(cart, product) {
        if (!product || product.id == null) {
            return { added: false, reason: "invalid-product" };
        }
        const price = Number(product.price);
        if (!Number.isFinite(price) || price < 0) {
            return { added: false, reason: "invalid-price" };
        }

        const id = String(product.id);
        const current = cart.get(id);
        const quantity = current ? current.quantity + 1 : 1;
        const stock = stockLimit(product);
        if (stock != null && stock <= 0) {
            return { added: false, reason: "out-of-stock" };
        }
        if (stock != null && quantity > stock) {
            return { added: false, reason: "stock-limit" };
        }

        cart.set(id, { product: product, quantity: quantity });
        return { added: true, quantity: quantity };
    }

    function updateQuantity(cart, productId, action) {
        const id = String(productId);
        const item = cart.get(id);
        if (!item) return { updated: false, reason: "missing-item" };

        if (action === "remove" || (action === "decrease" && item.quantity <= 1)) {
            cart.delete(id);
            return { updated: true, removed: true, quantity: 0 };
        }
        if (action !== "increase" && action !== "decrease") {
            return { updated: false, reason: "invalid-action" };
        }

        const quantity = item.quantity + (action === "increase" ? 1 : -1);
        const stock = stockLimit(item.product);
        if (action === "increase" && stock != null && quantity > stock) {
            return { updated: false, reason: "stock-limit" };
        }
        item.quantity = quantity;
        return { updated: true, removed: false, quantity: quantity };
    }

    function roundCurrency(amount) {
        return Math.round(amount);
    }

    function calculateTotals(cart, options) {
        const settings = options || {};
        let rawSubtotal = 0;
        cart.forEach(function (item) {
            rawSubtotal += Number(item.product.price) * item.quantity;
        });
        const subtotal = roundCurrency(rawSubtotal);
        const requestedDiscount = Number(settings.discountPercent);
        const discountPercent = Math.min(100, Math.max(0,
            Number.isFinite(requestedDiscount) ? requestedDiscount : 0));
        const discountAmount = roundCurrency(subtotal * discountPercent / 100);
        const taxableAmount = Math.max(0, subtotal - discountAmount);
        const requestedTaxRate = Number(settings.taxRate);
        const taxRate = Math.min(100, Math.max(0,
            Number.isFinite(requestedTaxRate) ? requestedTaxRate : 10));
        const taxAmount = roundCurrency(taxableAmount * taxRate / 100);
        const totalAmount = taxableAmount + taxAmount;
        const paymentMethod = settings.paymentMethod || "cash";
        const requestedReceived = Number(settings.amountReceived);
        const cashReceived = Math.max(0,
            Number.isFinite(requestedReceived) ? requestedReceived : 0);
        const amountReceived = paymentMethod === "cash"
            ? cashReceived
            : settings.paymentConfirmed ? totalAmount : 0;
        const changeAmount = paymentMethod === "cash"
            ? Math.max(0, amountReceived - totalAmount)
            : 0;

        return {
            subtotal: subtotal,
            discountPercent: discountPercent,
            discountAmount: discountAmount,
            taxRate: taxRate,
            taxAmount: taxAmount,
            totalAmount: totalAmount,
            amountReceived: amountReceived,
            changeAmount: changeAmount,
            paymentMethod: paymentMethod
        };
    }

    function findByBarcode(products, barcode) {
        const normalizedBarcode = String(barcode || "").trim().toLocaleLowerCase("vi");
        if (!normalizedBarcode) return null;
        return products.find(function (product) {
            return product.barcode &&
                String(product.barcode).trim().toLocaleLowerCase("vi") === normalizedBarcode;
        }) || null;
    }

    function validateCustomer(customer) {
        const value = customer || {};
        const phone = String(value.phone || "").trim();
        const type = value.customerType || "guest";
        if (!phone) return "phone-required";
        const digits = phone.replace(/\D/g, "");
        if (digits.length < 8 || digits.length > 15) return "invalid-phone";
        if (type === "guest") return "lookup-required";
        if (type === "existing" && value.customerId == null) return "lookup-required";
        if (type === "new" && !String(value.fullName || "").trim()) return "name-required";
        if (type === "new" && !String(value.address || "").trim()) return "address-required";
        return null;
    }

    function validateCheckout(options) {
        const value = options || {};
        if (!value.cart || value.cart.size === 0) return "empty-cart";

        if (value.requirePayment) {
            const customerError = validateCustomer(value.customer);
            if (customerError) return customerError;
        }

        const totals = value.totals || {};
        if (value.requirePayment && totals.paymentMethod === "cash" &&
            totals.amountReceived < totals.totalAmount) {
            return "insufficient-cash";
        }
        if (value.requirePayment && ["qr_code", "card"].includes(totals.paymentMethod) && !value.paymentConfirmed) {
            return totals.paymentMethod === "qr_code" ? "qr-not-confirmed" : "card-not-confirmed";
        }
        return null;
    }

    return Object.freeze({
        addProduct: addProduct,
        updateQuantity: updateQuantity,
        calculateTotals: calculateTotals,
        findByBarcode: findByBarcode,
        validateCustomer: validateCustomer,
        validateCheckout: validateCheckout
    });
}));
