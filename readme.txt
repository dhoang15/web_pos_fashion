THONG TIN NHOM
- Ma nhom/de tai: WE07
- Giang vien: Vu Dinh Hong
- Truong nhom: 52400269 | Vo Nguyen Duy Hoang | 0798216387
  Phan viec: Backend, database,docker devops,quan ly chung toan bo he thong,video demo, lam bao cao.
- Thanh vien: 52400274 | Le Tran Huy Khang| frontend Admin UI,quan ly nhan vien, san pham ban hang,khach hang,lam bao cao.
- Thanh vien: 52400326 | Dang Son Tung | frontend Staff Pos UI,Gio hang, Man hinh dang nhap, doi mat khau,phoi hop lam bao cao ve so do erd,video demo.
- Link video demo cong khai: https://youtu.be/SWdoFA68-Yw
- Link google drive video demo:https://drive.google.com/file/d/1b26gVe4c4xwLF9VEmmm_Rjqno4RRYOcX/view?usp=share_link

CHAY UNG DUNG BANG DOCKER
1. Cai Docker Desktop (Windows/macOS) hoac Docker Engine + Compose (Linux).
2. Mo terminal tai thu muc goc cua repository.
3. Tao file cau hinh local neu chua co:
   PowerShell: if (-not (Test-Path .env)) { Copy-Item docker.env.example .env }
   macOS/Linux: test -f .env || cp docker.env.example .env
4. Kiem tra va khoi dong:
   docker compose config --quiet
   docker compose up --build -d
   docker compose ps
5. Truy cap http://127.0.0.1:8000/

Docker Compose tao database va tai khoan demo khi khoi tao volume MySQL moi.
Schema: backend/database/schema.sql
Tai khoan demo: admin
Mat khau demo: admin
Doi mat khau demo truoc khi su dung du lieu that hoac chia se moi truong.
Mat khau tam nhan vien: MSSV truong nhom, mac dinh 52400269 trong docker.env.example.
Nhan vien phai mo link email con han mot phut, dang nhap bang username luu y username la phan dung truoc gmail.com va mat
khau tam la mssv truong nhom, sau do doi mat khau truoc khi truy cap chuc nang khac.

Khong commit file .env. Cau hinh SMTP trong .env can duoc dien neu muon gui
email moi nhan vien. APP_URL mac dinh la dia chi local; nguoi nhan email tren
may khac can mot URL HTTPS cong khai truy cap duoc.

Dung ung dung ma giu lai database va anh da tai len:
   docker compose down

Xem huong dan chi tiet, cau hinh SMTP va xu ly su co trong README.md va DOCKER.md.
