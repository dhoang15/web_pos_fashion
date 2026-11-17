(function () {
    "use strict";

    const table = document.getElementById("categories-table");
    if (!table) return;

    const isAdmin = sessionStorage.getItem("pos-role") === "admin";
    if (!isAdmin) {
        document.body.hidden = true;
        return;
    }

    const form = document.getElementById("category-form");
    const status = document.getElementById("categories-status");
    const search = document.getElementById("search-categories");
    const saveButton = document.getElementById("save-category");
    const cancelButton = document.getElementById("cancel-category-edit");
    let categories = [];

    function setStatus(message, isError) {
        status.textContent = message;
        status.classList.toggle("is-error", Boolean(isError));
    }

    function categoryCreator(category) {
        const creator = category.created_by_user || category.creator || {};
        return creator.name ||
            [creator.first_name, creator.last_name].filter(Boolean).join(" ") ||
            category.created_by_name || category.creator_name || "—";
    }

    function productCount(category) {
        const value = category.product_count ?? category.products_count ?? category.products?.length;
        return value == null ? "—" : Number(value).toLocaleString("vi-VN");
    }

    function appendCell(row, value, className) {
        const cell = document.createElement("td");
        cell.textContent = value == null || value === "" ? "—" : String(value);
        if (className) cell.className = className;
        row.append(cell);
        return cell;
    }

    function render() {
        const query = search.value.trim().toLocaleLowerCase("vi");
        const visible = categories.filter(function (category) {
            return [category.name, category.description].join(" ").toLocaleLowerCase("vi").includes(query);
        });
        table.replaceChildren();
        visible.forEach(function (category) {
            const row = document.createElement("tr");
            const name = appendCell(row, category.name);
            name.classList.add("fw-semibold");
            appendCell(row, category.description);
            appendCell(row, productCount(category), "text-end");
            appendCell(row, category.created_at ? new Date(category.created_at).toLocaleDateString("vi-VN") : "");
            appendCell(row, categoryCreator(category));

            const actions = document.createElement("td");
            actions.className = "text-end text-nowrap";
            const edit = document.createElement("button");
            edit.className = "btn btn-sm btn-outline-secondary me-1";
            edit.type = "button";
            edit.dataset.editCategoryId = String(category.id);
            edit.textContent = "Sửa";
            edit.setAttribute("aria-label", "Sửa danh mục " + (category.name || ""));
            const remove = document.createElement("button");
            remove.className = "btn btn-sm btn-outline-danger";
            remove.type = "button";
            remove.dataset.deleteCategoryId = String(category.id);
            remove.textContent = "Xóa";
            remove.setAttribute("aria-label", "Xóa danh mục " + (category.name || ""));
            actions.append(edit, remove);
            row.append(actions);
            table.append(row);
        });

        if (!visible.length) {
            const row = document.createElement("tr");
            const empty = document.createElement("td");
            empty.colSpan = 6;
            empty.className = "empty-state";
            empty.textContent = categories.length ? "Không có danh mục phù hợp." : "Chưa có danh mục.";
            row.append(empty);
            table.append(row);
        }
    }

    function resetForm() {
        form.reset();
        form.elements.name.setCustomValidity("");
        form.elements.id.value = "";
        document.getElementById("category-form-title").textContent = "Thêm danh mục";
        saveButton.textContent = "Thêm";
        cancelButton.hidden = true;
    }

    async function loadCategories() {
        setStatus("Đang tải danh mục...", false);
        try {
            categories = window.PosCommon.unwrapList(await window.PosApi.get("categories"));
            render();
            setStatus(categories.length + " danh mục", false);
        } catch (error) {
            categories = [];
            render();
            setStatus("Không tải được danh mục: " + error.message, true);
        }
    }

    search.addEventListener("input", render);
    cancelButton.addEventListener("click", resetForm);

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        form.elements.name.value = form.elements.name.value.trim().replace(/\s+/g, " ");
        form.elements.name.setCustomValidity(form.elements.name.value ? "" : "Nhập tên danh mục.");
        if (!isAdmin || !form.reportValidity()) return;
        const category = {
            name: form.elements.name.value.trim().replace(/\s+/g, " "),
            description: form.elements.description.value.trim() || null
        };
        const id = form.elements.id.value;
        saveButton.disabled = true;
        setStatus(id ? "Đang cập nhật danh mục..." : "Đang tạo danh mục...", false);
        try {
            if (id) {
                await window.PosApi.put("categories/" + encodeURIComponent(id), category);
            } else {
                await window.PosApi.post("categories", category);
            }
            resetForm();
            await loadCategories();
            window.PosCommon.notify("Đã lưu danh mục.", "success");
        } catch (error) {
            setStatus("Không thể lưu danh mục: " + error.message, true);
            window.PosCommon.notify("Không thể lưu danh mục: " + error.message, "danger");
        } finally {
            saveButton.disabled = false;
        }
    });

    table.addEventListener("click", async function (event) {
        const editButton = event.target.closest("[data-edit-category-id]");
        const deleteButton = event.target.closest("[data-delete-category-id]");
        if (editButton) {
            const category = categories.find(function (item) {
                return String(item.id) === editButton.dataset.editCategoryId;
            });
            if (!category) return;
            form.elements.id.value = String(category.id);
            form.elements.name.value = category.name || "";
            form.elements.description.value = category.description || "";
            document.getElementById("category-form-title").textContent = "Cập nhật danh mục";
            saveButton.textContent = "Cập nhật";
            cancelButton.hidden = false;
            document.getElementById("category-editor").scrollIntoView({ behavior: "smooth", block: "center" });
            document.getElementById("category-name").focus();
            return;
        }
        if (!deleteButton) return;
        if (!window.confirm("Xóa danh mục này? Sản phẩm thuộc danh mục có thể không cho phép thao tác này.")) return;
        deleteButton.disabled = true;
        try {
            await window.PosApi.delete("categories/" + encodeURIComponent(deleteButton.dataset.deleteCategoryId));
            if (form.elements.id.value === deleteButton.dataset.deleteCategoryId) resetForm();
            await loadCategories();
            window.PosCommon.notify("Đã xóa danh mục.", "success");
        } catch (error) {
            setStatus("Không thể xóa danh mục: " + error.message, true);
            window.PosCommon.notify("Không thể xóa danh mục: " + error.message, "danger");
        } finally {
            deleteButton.disabled = false;
        }
    });

    form.elements.name.addEventListener("input", function () { this.setCustomValidity(""); });

    loadCategories();
}());
