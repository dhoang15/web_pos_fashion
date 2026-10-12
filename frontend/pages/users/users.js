(function () {
    "use strict";

    const table = document.getElementById("users-table");
    if (!table) return;

    const form = document.getElementById("user-form");
    const modal = new window.bootstrap.Modal(document.getElementById("user-modal"));
    const status = document.getElementById("users-status");
    const search = document.getElementById("search-users");
    const currentUserId = sessionStorage.getItem("pos-user-id");
    let users = [];

    function fullName(user) {
        return user.name || [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || "Nhân viên";
    }

    function isUnactivated(user) {
        if (user.status === "locked") return false;
        return user.status === "inactive" || user.status === "pending" ||
            user.is_first_login === true || Number(user.is_first_login) === 1;
    }

    function statusLabel(user) {
        if (user.status === "locked") return ["Bị khóa", "text-bg-danger"];
        if (isUnactivated(user)) return ["Chưa kích hoạt", "text-bg-warning"];
        return ["Đang hoạt động", "text-bg-success"];
    }

    function roleLabel(role) {
        if (role === "admin") return "Quản trị viên";
        if (role === "cashier") return "Thu ngân";
        return "Nhân viên";
    }

    function createAvatarFallback(user) {
        const fallback = document.createElement("span");
        fallback.className = "user-list-avatar user-list-avatar-fallback";
        fallback.setAttribute("aria-hidden", "true");
        fallback.textContent = fullName(user).trim().charAt(0).toLocaleUpperCase("vi") || "?";
        return fallback;
    }

    function appendTextCell(row, text, className) {
        const cell = document.createElement("td");
        cell.textContent = text || "—";
        if (className) cell.className = className;
        row.append(cell);
        return cell;
    }

    function renderSummary() {
        document.getElementById("total-users").textContent = String(users.length);
        document.getElementById("active-users").textContent = String(users.filter(function (user) {
            return user.status === "active";
        }).length);
        document.getElementById("pending-users").textContent = String(users.filter(isUnactivated).length);
    }

    function render() {
        const query = search.value.trim().toLocaleLowerCase("vi");
        const visible = users.filter(function (user) {
            return (fullName(user) + " " + (user.email || "")).toLocaleLowerCase("vi").includes(query);
        });
        table.replaceChildren();
        visible.forEach(function (user) {
            const row = document.createElement("tr");
            const identity = document.createElement("td");
            identity.className = "staff-identity";
            const avatarUrl = user.avatar;
            if (avatarUrl && avatarUrl !== "default-avatar.png") {
                const image = document.createElement("img");
                image.className = "user-list-avatar";
                image.alt = "";
                image.src = avatarUrl;
                image.onerror = function () {
                    image.replaceWith(createAvatarFallback(user));
                };
                identity.append(image);
            } else {
                identity.append(createAvatarFallback(user));
            }
            const nameWrap = document.createElement("span");
            nameWrap.className = "staff-identity-name";
            nameWrap.textContent = fullName(user);
            identity.append(nameWrap);
            row.append(identity);

            appendTextCell(row, user.email || "");
            appendTextCell(row, roleLabel(user.role));

            const stateCell = document.createElement("td");
            const badge = document.createElement("span");
            const state = statusLabel(user);
            badge.className = "badge " + state[1];
            badge.textContent = state[0];
            stateCell.append(badge);
            row.append(stateCell);

            appendTextCell(row, user.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : "");

            const actions = document.createElement("td");
            actions.className = "text-end text-nowrap";
            if (String(user.id) !== currentUserId) {
                const toggle = document.createElement("button");
                toggle.className = "btn btn-sm " + (user.status === "locked" ? "btn-outline-success" : "btn-outline-secondary");
                toggle.type = "button";
                toggle.dataset.toggleId = String(user.id);
                toggle.dataset.userId = String(user.id);
                toggle.dataset.userAction = "status";
                toggle.textContent = user.status === "locked" ? "Mở khóa" : "Khóa";
                actions.append(toggle);
            }
            if (isUnactivated(user)) {
                const resend = document.createElement("button");
                resend.className = "btn btn-sm btn-outline-primary ms-1";
                resend.type = "button";
                resend.dataset.resendId = String(user.id);
                resend.dataset.userId = String(user.id);
                resend.dataset.userAction = "resend-invitation";
                resend.textContent = "Gửi lại link 1 phút";
                resend.title = "Gửi lại liên kết email có hiệu lực trong 1 phút.";
                actions.append(resend);
            }
            if (!actions.childElementCount) {
                const self = document.createElement("span");
                self.className = "small text-muted";
                self.textContent = "Tài khoản hiện tại";
                actions.append(self);
            }
            row.append(actions);
            table.append(row);
        });
        if (!visible.length) {
            const row = document.createElement("tr");
            const empty = document.createElement("td");
            empty.colSpan = 6;
            empty.className = "empty-state";
            empty.textContent = "Không có nhân viên phù hợp.";
            row.append(empty);
            table.append(row);
        }
    }

    async function loadUsers() {
        status.textContent = "Đang tải danh sách...";
        status.classList.remove("is-error");
        try {
            users = window.PosCommon.unwrapList(await window.PosApi.get("users"));
            status.textContent = users.length + " tài khoản";
            renderSummary();
            render();
        } catch (error) {
            status.textContent = error.message;
            status.classList.add("is-error");
        }
    }

    document.getElementById("add-user").addEventListener("click", function () {
        form.reset();
        modal.show();
    });
    search.addEventListener("input", render);
    table.addEventListener("click", async function (event) {
        const toggle = event.target.closest("[data-toggle-id]");
        const resend = event.target.closest("[data-resend-id]");
        if (!toggle && !resend) return;
        const button = toggle || resend;
        const user = users.find(function (item) {
            return String(item.id) === button.dataset[toggle ? "toggleId" : "resendId"];
        });
        if (!user) return;

        button.disabled = true;
        try {
            if (toggle) {
                const locking = user.status !== "locked";
                await window.PosApi.put("users/" + encodeURIComponent(user.id) + "/status", {
                    status: locking ? "locked" : "active"
                });
                window.PosCommon.notify(locking ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.", "success");
            } else {
                await window.PosApi.post("users/" + encodeURIComponent(user.id) + "/resend-invitation", {});
                window.PosCommon.notify("Đã gửi lại liên kết kích hoạt.", "success");
            }
            await loadUsers();
        } catch (error) {
            window.PosCommon.notify(error.message, "danger");
        } finally {
            button.disabled = false;
        }
    });
    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const button = document.getElementById("save-user");
        const fullNameValue = form.elements.name.value.trim().replace(/\s+/g, " ");
        const nameParts = fullNameValue.split(" ");
        const user = {
            first_name: nameParts.shift() || "",
            last_name: nameParts.join(" "),
            email: form.elements.email.value.trim().toLocaleLowerCase("en-US")
        };
        button.disabled = true;
        try {
            await window.PosApi.post("users", user);
            modal.hide();
            window.PosCommon.notify("Đã tạo nhân viên và gửi liên kết kích hoạt.", "success");
            await loadUsers();
        } catch (error) {
            window.PosCommon.notify(error.message, "danger");
        } finally {
            button.disabled = false;
        }
    });

    loadUsers();
}());
