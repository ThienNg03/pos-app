# POS App

POS App là ứng dụng quản lý bán hàng đơn giản, chạy bằng Node.js + Express và có thể mở dưới dạng desktop app bằng Electron.

## Tính năng

- Quản lý sản phẩm
- Thêm, sửa, xóa sản phẩm
- Tạo đơn hàng
- Tính giảm giá
- Kiểm tra doanh thu theo ngày
- Lưu dữ liệu bằng file JSON trong thư mục `data`

## Yêu cầu

- Node.js 18+
- npm
- Windows 10/11 (cho chế độ desktop app)

## Cài đặt

```bash
npm install
```

## Chạy web app

```bash
npm start
```

Mở trình duyệt tại:

```text
http://localhost:3000
```

## Chạy desktop app

```bash
npm run electron
```

## Build Windows desktop app

```bash
npx electron-builder --win portable
```

> Nếu máy của bạn không có quyền admin hoặc không có chứng chỉ ký số Windows, quá trình build có thể bị chặn ở bước signing. Khi đó, bạn vẫn có thể chạy app dạng desktop bằng lệnh `npm run electron`.

## Cấu trúc chính

```text
pos-app/
├── public/          # giao diện web
├── data/            # dữ liệu JSON của app
├── main.js          # Electron app
├── server.js        # server Express
├── package.json     # cấu hình project
├── README.md
├── .gitignore
└── LICENSE
```

## Dữ liệu

Dữ liệu sản phẩm và hóa đơn được lưu tại:

```text
data/pos-data.json
```

## Giấy phép

Dự án này được phát hành theo giấy phép MIT.
