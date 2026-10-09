// JS riêng của trang Customers (dữ liệu mẫu, sau này thay bằng API)
(() => {
    const customers = [
        { name: 'Nguyễn Văn An',  phone: '0901 111 222', type: 'vip',     spent: 12500000 },
        { name: 'Trần Thị Bình',  phone: '0902 333 444', type: 'regular', spent: 3200000 },
        { name: 'Lê Hoàng Cường', phone: '0903 555 666', type: 'regular', spent: 870000 },
        { name: 'Phạm Minh Đức',  phone: '0904 777 888', type: 'staff',   spent: 0 },
        { name: 'Võ Thu Hà',      phone: '0905 999 000', type: 'vip',     spent: 9800000 },
    ];

    const body = document.getElementById('custBody');
    const empty = document.getElementById('custEmpty');
    const search = document.getElementById('custSearch');
    const fmt = (n) => n.toLocaleString('vi-VN') + ' ₫';

    const render = (list) => {
        body.innerHTML = list.map(c => `
            <tr>
                <td>${c.name}</td>
                <td>${c.phone}</td>
                <td><span class="cust-badge cust-${c.type}">${c.type.toUpperCase()}</span></td>
                <td>${fmt(c.spent)}</td>
            </tr>`).join('');
        empty.classList.toggle('hidden', list.length > 0);
    };

    search.addEventListener('input', () => {
        const q = search.value.trim().toLowerCase();
        render(customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)));
    });

    document.getElementById('btnAddCustomer').addEventListener('click', () => {
        // TODO: mở form thêm khách hàng
    });

    render(customers);
})();
