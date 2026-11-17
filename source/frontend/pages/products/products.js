(function () {
    "use strict";

    const table = document.getElementById("products-table");
    if (!table) return;

    const form = document.getElementById("product-form");
    const productModal = window.PosCommon.createModal(document.getElementById("product-modal"));
    const status = document.getElementById("products-status");
    const categoryStatus = document.getElementById("product-category-status");
    const formStatus = document.getElementById("product-form-status");
    const search = document.getElementById("search-products");
    const categorySelect = document.getElementById("product-category");
    const productImageInput = document.getElementById("product-image-file");
    const productImagePreviewWrap = document.getElementById("product-image-preview-wrap");
    const productImagePreview = document.getElementById("product-image-preview");
    const productImageName = document.getElementById("product-image-name");
    const categoryFilter = document.getElementById("filter-product-category");
    const statusFilter = document.getElementById("filter-product-status");
    const authenticatedAdmin = sessionStorage.getItem("pos-role") === "admin";
    let products = [];
    let categories = [];
    let productImagePreviewUrl = "";

    function isAdminView() {
        return authenticatedAdmin;
    }

    function setStatus(element, message, isError) {
        element.textContent = message;
        element.classList.toggle("is-error", Boolean(isError));
    }

    function appendCell(row, value, className) {
        const cell = document.createElement("td");
        cell.textContent = value == null || value === "" ? "—" : String(value);
        if (className) cell.className = className;
        row.append(cell);
        return cell;
    }

    function categoryName(product) {
        if (product.category_name) return product.category_name;
        const nestedName = product.category && product.category.name;
        const category = categories.find(function (item) {
            return String(item.id) === String(product.category_id);
        });
        return nestedName || (category && category.name) || "";
    }

    function hasBeenSold(product) {
        return product.has_orders === true ||
            Number(product.order_count) > 0 ||
            product.ever_sold === true;
    }

    function setProductImagePreview(src, label) {
        if (productImagePreviewUrl) {
            URL.revokeObjectURL(productImagePreviewUrl);
            productImagePreviewUrl = "";
        }
        if (!src) {
            productImagePreviewWrap.hidden = true;
            productImagePreview.removeAttribute("src");
            productImageName.textContent = "";
            return;
        }
        productImagePreview.src = src;
        productImageName.textContent = label || "";
        productImagePreviewWrap.hidden = false;
    }

    function renderSummary() {
        document.getElementById("total-products").textContent = String(products.length);
        document.getElementById("active-products").textContent = String(products.filter(function (product) {
            return product.status === "active";
        }).length);
        document.getElementById("low-stock-products").textContent = String(products.filter(function (product) {
            return Number(product.stock_quantity) <= Number(product.low_stock_threshold == null ? 10 : product.low_stock_threshold);
        }).length);
        document.getElementById("total-categories").textContent = String(categories.length);
    }

    function render() {
        const query = search.value.trim().toLocaleLowerCase("vi");
        const selectedCategory = categoryFilter.value;
        const selectedStatus = statusFilter.value;
        const adminView = isAdminView();
        const visible = products.filter(function (product) {
            const searchable = [product.name, product.sku, product.barcode, product.material, categoryName(product)]
                .join(" ").toLocaleLowerCase("vi");
            const categoryMatches = selectedCategory === "all" || String(product.category_id || "") === selectedCategory;
            const statusMatches = selectedStatus === "all" || product.status === selectedStatus;
            return searchable.includes(query) && categoryMatches && statusMatches;
        });

        table.replaceChildren();
        visible.forEach(function (product) {
            const row = document.createElement("tr");
            appendCell(row, product.barcode || product.sku);
            const nameCell = appendCell(row, product.name);
            nameCell.classList.add("fw-semibold");
            appendCell(row, categoryName(product));
            if (adminView) {
                appendCell(row, window.PosCommon.formatCurrency(product.import_price), "text-end text-nowrap role-admin-only");
            }
            appendCell(row, window.PosCommon.formatCurrency(product.price), "text-end text-nowrap");
            const stock = Number(product.stock_quantity) || 0;
            const stockCell = appendCell(row, String(stock), "text-end");
            if (stock <= Number(product.low_stock_threshold == null ? 10 : product.low_stock_threshold)) {
                stockCell.classList.add("text-warning-emphasis", "fw-semibold");
            }
            appendCell(row, [product.size, product.color].filter(Boolean).join(" / "));
            const state = appendCell(row, product.status === "inactive" ? "Ngừng bán" : "Đang bán");
            state.replaceChildren();
            const badge = document.createElement("span");
            badge.className = "badge " + (product.status === "inactive" ? "text-bg-secondary" : "text-bg-success");
            badge.textContent = product.status === "inactive" ? "Ngừng bán" : "Đang bán";
            state.append(badge);
            appendCell(row, product.created_at ? new Date(product.created_at).toLocaleDateString("vi-VN") : "");

            if (adminView) {
                const actions = document.createElement("td");
                actions.className = "text-end text-nowrap";
                const edit = document.createElement("button");
                edit.className = "btn btn-sm btn-outline-secondary me-1";
                edit.type = "button";
                edit.dataset.editId = String(product.id);
                edit.setAttribute("aria-label", "Sửa " + (product.name || "sản phẩm"));
                edit.textContent = "Sửa";
                actions.append(edit);

                if (hasBeenSold(product)) {
                    const wrapper = document.createElement("span");
                    wrapper.className = "d-inline-block";
                    wrapper.tabIndex = 0;
                    wrapper.setAttribute("data-bs-toggle", "tooltip");
                    wrapper.setAttribute("data-bs-title", "Không thể xóa sản phẩm đã nằm trong đơn hàng.");
                    const remove = document.createElement("button");
                    remove.className = "btn btn-sm btn-outline-danger";
                    remove.type = "button";
                    remove.disabled = true;
                    remove.textContent = "Xóa";
                    wrapper.append(remove);
                    actions.append(wrapper);
                    if (window.bootstrap && window.bootstrap.Tooltip) new window.bootstrap.Tooltip(wrapper);
                } else {
                    const remove = document.createElement("button");
                    remove.className = "btn btn-sm btn-outline-danger";
                    remove.type = "button";
                    remove.dataset.deleteId = String(product.id);
                    remove.setAttribute("aria-label", "Xóa " + (product.name || "sản phẩm"));
                    remove.textContent = "Xóa";
                    actions.append(remove);
                }
                row.append(actions);
            }
            table.append(row);
        });

        if (!visible.length) {
            const row = document.createElement("tr");
            const empty = document.createElement("td");
            empty.colSpan = adminView ? 10 : 8;
            empty.className = "empty-state";
            empty.textContent = "Không có sản phẩm phù hợp.";
            row.append(empty);
            table.append(row);
        }
    }

    function replaceOptions(select, placeholder, selectedValue) {
        select.replaceChildren();
        const first = document.createElement("option");
        first.value = "";
        first.textContent = placeholder;
        select.append(first);
        categories.forEach(function (category) {
            const option = document.createElement("option");
            option.value = String(category.id);
            option.textContent = category.name || "Danh mục " + category.id;
            select.append(option);
        });
        if (selectedValue != null) select.value = String(selectedValue);
    }

    function renderCategoryFilter() {
        const previous = categoryFilter.value;
        categoryFilter.replaceChildren();
        const all = document.createElement("option");
        all.value = "all";
        all.textContent = "Tất cả danh mục";
        categoryFilter.append(all);
        categories.forEach(function (category) {
            const option = document.createElement("option");
            option.value = String(category.id);
            option.textContent = category.name || "Danh mục " + category.id;
            categoryFilter.append(option);
        });
        if (Array.from(categoryFilter.options).some(function (option) {
            return option.value === previous;
        })) categoryFilter.value = previous;
    }

    function renderCategories() {
        const editingProduct = products.find(function (product) { return String(product.id) === form.dataset.id; });
        replaceOptions(categorySelect, "Chọn danh mục", categorySelect.value || (editingProduct && editingProduct.category_id));
        renderCategoryFilter();
        renderSummary();
        render();
    }

    async function loadProducts() {
        setStatus(status, "Đang tải danh sách...", false);
        try {
            products = window.PosCommon.unwrapList(await window.PosApi.get("products"));
            setStatus(status, products.length + " sản phẩm", false);
            renderSummary();
            render();
        } catch (error) {
            products = [];
            setStatus(status, "Không tải được sản phẩm: " + error.message, true);
            renderSummary();
            render();
            window.PosCommon.notify("Không tải được sản phẩm: " + error.message, "danger");
        }
    }

    async function loadCategories() {
        setStatus(categoryStatus, "Đang tải danh mục...", false);
        try {
            categories = window.PosCommon.unwrapList(await window.PosApi.get("categories"));
            renderCategories();
            setStatus(categoryStatus, categories.length
                ? categories.length + " danh mục khả dụng."
                : "Chưa có danh mục. Hãy tạo danh mục trước khi thêm sản phẩm.", false);
        } catch (error) {
            categories = [];
            renderCategories();
            setStatus(categoryStatus, "Không tải được danh mục: " + error.message, true);
        }
    }

    function openProductForm(product) {
        form.reset();
        form.elements.name.setCustomValidity("");
        form.elements.barcode.setCustomValidity("");
        setStatus(formStatus, "", false);
        form.dataset.id = product ? String(product.id) : "";
        document.getElementById("product-modal-title").textContent = product ? "Cập nhật sản phẩm" : "Thêm sản phẩm";
        setProductImagePreview(product && product.image, product && product.image ? "Ảnh hiện tại" : "");
        replaceOptions(categorySelect, "Chọn danh mục", product && product.category_id);
        document.getElementById("product-created-at").value = product && product.created_at
            ? new Date(product.created_at).toLocaleString("vi-VN")
            : "Hệ thống ghi khi lưu sản phẩm";
        if (product) {
            form.elements.name.value = product.name || "";
            form.elements.barcode.value = product.barcode || "";
            form.elements.sku.value = product.sku || "";
            form.elements.category_id.value = product.category_id || "";
            form.elements.import_price.value = product.import_price == null ? "0" : product.import_price;
            form.elements.price.value = product.price == null ? "0" : product.price;
            form.elements.stock_quantity.value = product.stock_quantity == null ? "0" : product.stock_quantity;
            form.elements.size.value = product.size || "";
            form.elements.color.value = product.color || "";
            form.elements.material.value = product.material || "";
            form.elements.low_stock_threshold.value = product.low_stock_threshold == null ? "10" : product.low_stock_threshold;
            form.elements.description.value = product.description || "";
            form.elements.status.value = product.status || "active";
        }
        productModal.show();
    }

    if (authenticatedAdmin) {
        document.getElementById("add-product").addEventListener("click", function () {
            openProductForm(null);
        });
    }

    [search, categoryFilter, statusFilter].forEach(function (control) {
        control.addEventListener(control === search ? "input" : "change", render);
    });

    table.addEventListener("click", async function (event) {
        if (!isAdminView()) return;
        const editButton = event.target.closest("[data-edit-id]");
        const deleteButton = event.target.closest("[data-delete-id]");
        if (editButton) {
            const product = products.find(function (item) {
                return String(item.id) === editButton.dataset.editId;
            });
            if (product) openProductForm(product);
            return;
        }
        if (!deleteButton) return;
        const product = products.find(function (item) {
            return String(item.id) === deleteButton.dataset.deleteId;
        });
        if (!product || hasBeenSold(product)) return;
        if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
        deleteButton.disabled = true;
        try {
            await window.PosApi.delete("products/" + encodeURIComponent(product.id));
            window.PosCommon.notify("Đã xóa sản phẩm.", "success");
            await loadProducts();
        } catch (error) {
            window.PosCommon.notify(error.message, "danger");
        } finally {
            deleteButton.disabled = false;
        }
    });

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!isAdminView()) return;
        form.elements.name.value = form.elements.name.value.trim().replace(/\s+/g, " ");
        form.elements.barcode.value = form.elements.barcode.value.trim();
        form.elements.name.setCustomValidity(form.elements.name.value ? "" : "Nhập tên sản phẩm.");
        form.elements.barcode.setCustomValidity(form.elements.barcode.value ? "" : "Nhập mã vạch sản phẩm.");
        if (!form.reportValidity()) return;
        const categoryId = Number(form.elements.category_id.value);
        if (!Number.isSafeInteger(categoryId) || categoryId <= 0 || !categories.some(function (category) { return Number(category.id) === categoryId; })) {
            setStatus(formStatus, "Chọn danh mục có sẵn trong hệ thống. Nếu chưa có danh mục, hãy tạo ở trang Danh mục trước.", true);
            categorySelect.focus();
            return;
        }
        const duplicateBarcode = products.some(function (product) {
            return String(product.id) !== form.dataset.id && product.barcode === form.elements.barcode.value;
        });
        if (duplicateBarcode) {
            setStatus(formStatus, "Mã vạch đã thuộc một sản phẩm khác.", true);
            form.elements.barcode.focus();
            return;
        }
        const button = document.getElementById("save-product");
        const imageFile = productImageInput.files[0];
        if (imageFile && !["image/png", "image/jpeg", "image/webp"].includes(imageFile.type)) {
            window.PosCommon.notify("Chọn ảnh PNG, JPG hoặc WebP.", "warning");
            productImageInput.focus();
            return;
        }
        if (imageFile && imageFile.size > 5 * 1024 * 1024) {
            window.PosCommon.notify("Ảnh sản phẩm không được vượt quá 5 MB.", "warning");
            productImageInput.focus();
            return;
        }
        const product = {
            name: form.elements.name.value.trim(),
            barcode: form.elements.barcode.value.trim(),
            sku: form.elements.sku.value.trim() || null,
            category_id: categoryId,
            import_price: Number(form.elements.import_price.value),
            price: Number(form.elements.price.value),
            stock_quantity: Number(form.elements.stock_quantity.value),
            size: form.elements.size.value.trim() || null,
            color: form.elements.color.value.trim() || null,
            material: form.elements.material.value.trim() || null,
            image: products.find(function (item) {
                return String(item.id) === form.dataset.id;
            })?.image || null,
            low_stock_threshold: Number(form.elements.low_stock_threshold.value),
            description: form.elements.description.value.trim() || null,
            status: form.elements.status.value
        };
        button.disabled = true;
        setStatus(formStatus, "Đang lưu sản phẩm...", false);
        try {
            const productPath = form.dataset.id
                ? "products/" + encodeURIComponent(form.dataset.id)
                : "products";
            if (imageFile) {
                const payload = new FormData();
                Object.keys(product).forEach(function (key) {
                    if (product[key] != null) payload.append(key, String(product[key]));
                });
                payload.append("image_file", imageFile);
                if (form.dataset.id) payload.append("_method", "PUT");
                await window.PosApi.upload(productPath, payload);
            } else if (form.dataset.id) {
                await window.PosApi.put(productPath, product);
            } else {
                await window.PosApi.post("products", product);
            }
            productModal.hide();
            window.PosCommon.notify("Đã lưu sản phẩm.", "success");
            await loadProducts();
        } catch (error) {
            setStatus(formStatus, "Không thể lưu sản phẩm: " + error.message, true);
            window.PosCommon.notify(error.message, "danger");
        } finally {
            button.disabled = false;
        }
    });

    [form.elements.name, form.elements.barcode].forEach(function (input) {
        input.addEventListener("input", function () { input.setCustomValidity(""); });
    });

    document.getElementById("product-modal").addEventListener("show.bs.modal", function () {
        document.getElementById("product-import-price").closest(".col-md-6").hidden = !isAdminView();
    });

    productImageInput.addEventListener("change", function () {
        const file = productImageInput.files[0];
        if (!file) return;
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
            productImageInput.value = "";
            setProductImagePreview(null);
            window.PosCommon.notify("Chọn ảnh PNG, JPG hoặc WebP.", "warning");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            productImageInput.value = "";
            setProductImagePreview(null);
            window.PosCommon.notify("Ảnh sản phẩm không được vượt quá 5 MB.", "warning");
            return;
        }
        if (productImagePreviewUrl) URL.revokeObjectURL(productImagePreviewUrl);
        productImagePreviewUrl = URL.createObjectURL(file);
        productImagePreview.src = productImagePreviewUrl;
        productImageName.textContent = file.name;
        productImagePreviewWrap.hidden = false;
    });

    document.getElementById("product-modal").addEventListener("hidden.bs.modal", function () {
        setProductImagePreview(null);
        productImageInput.value = "";
    });

    if (!authenticatedAdmin) {
        document.querySelectorAll("[data-admin-only]").forEach(function (element) {
            element.hidden = true;
        });
    }

    loadProducts();
    loadCategories();
}());
