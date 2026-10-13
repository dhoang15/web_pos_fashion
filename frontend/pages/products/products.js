(function () {
    "use strict";

    const table = document.getElementById("products-table");
    if (!table) return;

    const form = document.getElementById("product-form");
    const categoryForm = document.getElementById("category-form");
    const productModal = new window.bootstrap.Modal(document.getElementById("product-modal"));
    const categoryModal = new window.bootstrap.Modal(document.getElementById("category-modal"));
    const status = document.getElementById("products-status");
    const categoryStatus = document.getElementById("categories-status");
    const search = document.getElementById("search-products");
    const categorySelect = document.getElementById("product-category");
    const productImageInput = document.getElementById("product-image-file");
    const productImagePreviewWrap = document.getElementById("product-image-preview-wrap");
    const productImagePreview = document.getElementById("product-image-preview");
    const productImageName = document.getElementById("product-image-name");
    const categoryFilter = document.getElementById("filter-product-category");
    const statusFilter = document.getElementById("filter-product-status");
    const authenticatedAdmin = sessionStorage.getItem("pos-role") === "admin";
    let previewRole = authenticatedAdmin ? "admin" : "staff";
    let products = [];
    let categories = [];
    let productImagePreviewUrl = "";

    function isAdminView() {
        return authenticatedAdmin && previewRole === "admin";
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

    function categoryCreator(category) {
        const creator = category.created_by_user || category.creator || {};
        return creator.name ||
            [creator.first_name, creator.last_name].filter(Boolean).join(" ") ||
            category.created_by_name ||
            category.creator_name ||
            "—";
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
                    new window.bootstrap.Tooltip(wrapper);
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
        const categoryTable = document.getElementById("categories-table");
        categoryTable.replaceChildren();
        categories.forEach(function (category) {
            const row = document.createElement("tr");
            const name = appendCell(row, category.name);
            name.classList.add("fw-semibold");
            appendCell(row, category.description);
            appendCell(row, category.created_at ? new Date(category.created_at).toLocaleDateString("vi-VN") : "");
            appendCell(row, categoryCreator(category));
            const actions = document.createElement("td");
            actions.className = "text-end text-nowrap";
            actions.hidden = !isAdminView();
            if (isAdminView()) {
                const edit = document.createElement("button");
                edit.className = "btn btn-sm btn-outline-secondary me-1";
                edit.type = "button";
                edit.dataset.editCategoryId = String(category.id);
                edit.textContent = "Sửa";
                const remove = document.createElement("button");
                remove.className = "btn btn-sm btn-outline-danger";
                remove.type = "button";
                remove.dataset.deleteCategoryId = String(category.id);
                remove.textContent = "Xóa";
                actions.append(edit, remove);
            }
            row.append(actions);
            categoryTable.append(row);
        });
        if (!categories.length) {
            const row = document.createElement("tr");
            const empty = document.createElement("td");
            empty.colSpan = 5;
            empty.className = "empty-state";
            empty.textContent = "Chưa có danh mục.";
            row.append(empty);
            categoryTable.append(row);
        }
        replaceOptions(categorySelect, "Chọn danh mục");
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
        try {
            categories = window.PosCommon.unwrapList(await window.PosApi.get("categories"));
            renderCategories();
            setStatus(categoryStatus, categories.length + " danh mục", false);
        } catch (error) {
            categories = [];
            renderCategories();
            setStatus(categoryStatus, "Không tải được danh mục: " + error.message, true);
            window.PosCommon.notify("Không tải được danh mục: " + error.message, "danger");
        }
    }

    function openProductForm(product) {
        form.reset();
        form.dataset.id = product ? String(product.id) : "";
        document.getElementById("product-modal-title").textContent = product ? "Cập nhật sản phẩm" : "Thêm sản phẩm";
        setProductImagePreview(product && product.image, product && product.image ? "Ảnh hiện tại" : "");
        replaceOptions(categorySelect, "Chọn danh mục", product && product.category_id);
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

    function applyRolePreview(role) {
        previewRole = role === "staff" ? "staff" : "admin";
        document.body.classList.toggle("is-staff-preview", previewRole === "staff");
        document.querySelectorAll("[data-preview-role]").forEach(function (button) {
            const active = button.dataset.previewRole === previewRole;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", String(active));
        });
        document.querySelectorAll("[data-admin-only]").forEach(function (element) {
            element.hidden = !isAdminView();
        });
        document.querySelectorAll("#sidebar-container [data-route='users']").forEach(function (element) {
            element.hidden = !isAdminView();
        });
        renderCategories();
        render();
    }

    if (authenticatedAdmin) {
        document.getElementById("role-preview-control").hidden = false;
        document.getElementById("role-preview-control").addEventListener("click", function (event) {
            const button = event.target.closest("[data-preview-role]");
            if (button) applyRolePreview(button.dataset.previewRole);
        });
        document.getElementById("add-product").addEventListener("click", function () {
            if (isAdminView()) openProductForm(null);
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
        if (!form.reportValidity()) return;
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
            category_id: Number(form.elements.category_id.value),
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
            window.PosCommon.notify(error.message, "danger");
        } finally {
            button.disabled = false;
        }
    });

    categoryForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!isAdminView()) return;
        const button = document.getElementById("save-category");
        const category = {
            name: categoryForm.elements.name.value.trim(),
            description: categoryForm.elements.description.value.trim() || null
        };
        button.disabled = true;
        try {
            const id = categoryForm.elements.id.value;
            if (id) {
                await window.PosApi.put("categories/" + encodeURIComponent(id), category);
            } else {
                await window.PosApi.post("categories", category);
            }
            categoryForm.reset();
            button.textContent = "Thêm";
            await loadCategories();
            window.PosCommon.notify("Đã lưu danh mục.", "success");
        } catch (error) {
            window.PosCommon.notify(error.message, "danger");
        } finally {
            button.disabled = false;
        }
    });

    document.getElementById("categories-table").addEventListener("click", async function (event) {
        if (!isAdminView()) return;
        const edit = event.target.closest("[data-edit-category-id]");
        const remove = event.target.closest("[data-delete-category-id]");
        if (edit) {
            const category = categories.find(function (item) {
                return String(item.id) === edit.dataset.editCategoryId;
            });
            if (!category) return;
            categoryForm.elements.id.value = String(category.id);
            categoryForm.elements.name.value = category.name || "";
            categoryForm.elements.description.value = category.description || "";
            document.getElementById("save-category").textContent = "Cập nhật";
            return;
        }
        if (!remove) return;
        if (!window.confirm("Xóa danh mục này? Sản phẩm thuộc danh mục có thể không cho phép thao tác này.")) return;
        remove.disabled = true;
        try {
            await window.PosApi.delete("categories/" + encodeURIComponent(remove.dataset.deleteCategoryId));
            categoryForm.reset();
            document.getElementById("save-category").textContent = "Thêm";
            await loadCategories();
            window.PosCommon.notify("Đã xóa danh mục.", "success");
        } catch (error) {
            window.PosCommon.notify(error.message, "danger");
        } finally {
            remove.disabled = false;
        }
    });

    document.getElementById("category-modal").addEventListener("hidden.bs.modal", function () {
        categoryForm.reset();
        document.getElementById("save-category").textContent = "Thêm";
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
        document.getElementById("role-preview-control").hidden = true;
        document.querySelectorAll("[data-admin-only]").forEach(function (element) {
            element.hidden = true;
        });
    } else {
        applyRolePreview("admin");
    }

    function openCategoriesRoute() {
        if (window.location.hash !== "#categories") return;
        categoryModal.show();
        loadCategories();
    }

    window.addEventListener("hashchange", openCategoriesRoute);
    openCategoriesRoute();

    loadProducts();
    loadCategories();
}());
