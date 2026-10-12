(function () {
    "use strict";

    const table = document.getElementById("customers-table");
    if (!table) return;

    const form = document.getElementById("customer-form");
    const modal = new window.bootstrap.Modal(document.getElementById("customer-modal"));
    const status = document.getElementById("customers-status");
    const search = document.getElementById("search-customers");
    let customers = [];

    function nameOf(customer) {
        return customer.full_name || customer.name || [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Khách hàng";
    }

    function cell(row, value) {
        const element = document.createElement("td");
        element.textContent = value || "—";
        row.append(element);
    }

    function render() {
        const query = search.value.trim().toLocaleLowerCase("vi");
        const visibleCustomers = customers.filter(function (customer) {
            return [nameOf(customer), customer.phone, customer.address]
                .join(" ")
                .toLocaleLowerCase("vi")
                .includes(query);
        });

        table.replaceChildren();
        visibleCustomers.forEach(function (customer) {
            const row = document.createElement("tr");
            cell(row, nameOf(customer));
            cell(row, customer.phone);
            cell(row, customer.address);
            cell(row, customer.created_at ? new Date(customer.created_at).toLocaleDateString("vi-VN") : "");

            const actions = document.createElement("td");
            actions.className = "text-end text-nowrap";
            const edit = document.createElement("button");
            edit.className = "btn btn-sm btn-outline-secondary me-1";
            edit.type = "button";
            edit.dataset.editId = String(customer.id);
            edit.textContent = "Sửa";
            const remove = document.createElement("button");
            remove.className = "btn btn-sm btn-outline-danger";
            remove.type = "button";
            remove.dataset.deleteId = String(customer.id);
            remove.textContent = "Xóa";
            actions.append(edit, remove);
            row.append(actions);
            table.append(row);
        });

        if (!visibleCustomers.length) {
            const row = document.createElement("tr");
            const empty = document.createElement("td");
            empty.colSpan = 5;
            empty.className = "empty-state";
            empty.textContent = "Không có khách hàng phù hợp.";
            row.append(empty);
            table.append(row);
        }
    }

    async function loadCustomers() {
        status.textContent = "Đang tải danh sách...";
        status.classList.remove("is-error");
        try {
            customers = window.PosCommon.unwrapList(await window.PosApi.get("customers"));
            status.textContent = customers.length + " khách hàng";
            render();
        } catch (error) {
            status.textContent = error.message;
            status.classList.add("is-error");
        }
    }

    function openForm(customer) {
        form.reset();
        form.dataset.id = customer ? String(customer.id) : "";
        document.getElementById("customer-modal-title").textContent = customer ? "Cập nhật khách hàng" : "Thêm khách hàng";
        if (customer) {
            form.elements.full_name.value = nameOf(customer);
            form.elements.phone.value = customer.phone || "";
            form.elements.address.value = customer.address || "";
        }
        modal.show();
    }

    document.getElementById("add-customer").addEventListener("click", function () {
        openForm(null);
    });
    search.addEventListener("input", render);
    table.addEventListener("click", async function (event) {
        const editButton = event.target.closest("[data-edit-id]");
        const deleteButton = event.target.closest("[data-delete-id]");
        if (editButton) {
            const customer = customers.find(function (item) {
                return String(item.id) === editButton.dataset.editId;
            });
            if (customer) openForm(customer);
            return;
        }
        if (!deleteButton || !window.confirm("Bạn có chắc muốn xóa khách hàng này?")) return;

        try {
            await window.PosApi.delete("customers/" + encodeURIComponent(deleteButton.dataset.deleteId));
            window.PosCommon.notify("Đã xóa khách hàng.", "success");
            await loadCustomers();
        } catch (error) {
            window.PosCommon.notify(error.message, "danger");
        }
    });
    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        const button = document.getElementById("save-customer");
        const customer = {
            full_name: form.elements.full_name.value.trim(),
            phone: form.elements.phone.value.trim(),
            address: form.elements.address.value.trim() || null
        };
        button.disabled = true;
        try {
            if (form.dataset.id) {
                await window.PosApi.put("customers/" + encodeURIComponent(form.dataset.id), customer);
            } else {
                await window.PosApi.post("customers", customer);
            }
            modal.hide();
            window.PosCommon.notify("Đã lưu khách hàng.", "success");
            await loadCustomers();
        } catch (error) {
            window.PosCommon.notify(error.message, "danger");
        } finally {
            button.disabled = false;
        }
    });

    loadCustomers();
}());
