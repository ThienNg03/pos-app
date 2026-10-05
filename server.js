const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "pos-data.json");

const defaultProducts = [
    ["Cà phê đen", "☕", 20000, "Đồ uống", 100],
    ["Cà phê sữa", "🥛", 25000, "Đồ uống", 100],
    ["Trà đào", "🍑", 35000, "Đồ uống", 100],
    ["Trà sữa", "🧋", 40000, "Đồ uống", 100],
    ["Nước cam", "🍊", 35000, "Đồ uống", 100],
    ["Sinh tố bơ", "🥑", 45000, "Đồ uống", 100],
    ["Bánh mì", "🥖", 20000, "Đồ ăn", 100],
    ["Bánh ngọt", "🍰", 30000, "Đồ ăn", 100],
    ["Phở bò", "🍜", 55000, "Đồ ăn", 100],
    ["Cơm gà", "🍗", 50000, "Đồ ăn", 100],
    ["Snack", "🍿", 15000, "Khác", 100],
    ["Nước suối", "💧", 10000, "Khác", 100]
];

function ensureDataFile() {
    fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(dataFile)) {
        const initial = {
            products: defaultProducts.map(([name, emoji, price, category, stock], index) => ({
                id: index + 1,
                name,
                emoji,
                price,
                category,
                stock
            })),
            sales: []
        };
        fs.writeFileSync(dataFile, JSON.stringify(initial, null, 2));
    }
}

function readState() {
    ensureDataFile();
    const raw = fs.readFileSync(dataFile, "utf8");
    const parsed = JSON.parse(raw || "{\"products\":[],\"sales\":[]}");
    if (!Array.isArray(parsed.products)) parsed.products = [];
    if (!Array.isArray(parsed.sales)) parsed.sales = [];
    return parsed;
}

function writeState(state) {
    fs.writeFileSync(dataFile, JSON.stringify(state, null, 2));
}

function nextProductId(products) {
    return products.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1;
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const wrap = fn => (req, res) => { try { res.json(fn(req)); } catch (e) { res.status(400).json({ error: e.message }); } };

app.get("/api/products", wrap(() => {
    const state = readState();
    return [...state.products].sort((a, b) => (a.category || "").localeCompare(b.category || "") || a.id - b.id);
}));

app.post("/api/products", wrap(r => {
    const b = r.body;
    if (!b.name || !(b.price >= 0)) throw new Error("Thiếu tên hoặc giá");
    const state = readState();
    const product = {
        id: nextProductId(state.products),
        name: b.name,
        emoji: b.emoji || "🛒",
        price: Number(b.price),
        category: b.category || "Khác",
        stock: Number(b.stock ?? 100)
    };
    state.products.push(product);
    writeState(state);
    return { id: product.id };
}));

app.put("/api/products/:id", wrap(r => {
    const b = r.body;
    const state = readState();
    const product = state.products.find(p => String(p.id) === String(r.params.id));
    if (!product) return { ok: true };
    if (b.name !== undefined) product.name = b.name;
    if (b.emoji !== undefined) product.emoji = b.emoji;
    if (b.price !== undefined) product.price = Number(b.price);
    if (b.category !== undefined) product.category = b.category;
    if (b.stock !== undefined) product.stock = Number(b.stock);
    writeState(state);
    return { ok: true };
}));

app.delete("/api/products/:id", wrap(r => {
    const state = readState();
    state.products = state.products.filter(p => String(p.id) !== String(r.params.id));
    writeState(state);
    return { ok: true };
}));

app.post("/api/sales", wrap(r => {
    const b = r.body;
    if (!Array.isArray(b.items) || !b.items.length) throw new Error("Đơn trống");

    const state = readState();
    const lines = b.items.map(({ id, qty }) => {
        const product = state.products.find(p => String(p.id) === String(id));
        if (!product) throw new Error("Sản phẩm không tồn tại");
        const q = Number(qty);
        if (!(q > 0) || product.stock < q) throw new Error(`${product.name} không đủ hàng (còn ${product.stock})`);
        return { product, qty: q };
    });

    const discount = Math.min(100, Math.max(0, Number(b.discount || 0)));
    const total = Math.round(lines.reduce((sum, line) => sum + line.product.price * line.qty, 0) * (1 - discount / 100));
    const cash = Number(b.cash || 0);
    if (cash < total) throw new Error("Tiền khách đưa chưa đủ");

    const saleId = state.sales.length ? Math.max(...state.sales.map(s => Number(s.id) || 0)) + 1 : 1;
    const sale = {
        id: saleId,
        total,
        discount,
        cash,
        created_at: new Date().toISOString(),
        items: lines.map(line => ({
            name: line.product.name,
            qty: line.qty,
            price: line.product.price
        }))
    };

    lines.forEach(({ product, qty }) => {
        product.stock -= qty;
    });

    state.sales.push(sale);
    writeState(state);
    return {
        id: sale.id,
        total: sale.total,
        cash: sale.cash,
        discount: sale.discount,
        created_at: new Date(sale.created_at).toLocaleString("vi-VN"),
        items: sale.items
    };
}));

app.get("/api/stats", wrap(() => {
    const state = readState();
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(start.getTime() + 86400000);

    const orders = state.sales.filter(sale => {
        const d = new Date(sale.created_at);
        return d >= start && d < end;
    });

    return {
        orders: orders.length,
        revenue: orders.reduce((sum, sale) => sum + Number(sale.total || 0), 0)
    };
}));

const defaultPort = Number(process.env.PORT || 3000);

function startServer(port) {
    const server = app.listen(port, () => {
        console.log(`POS chạy tại http://localhost:${port}`);
    });

    server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
            console.warn(`Cổng ${port} đang bận, thử ${port + 1}...`);
            server.close();
            startServer(port + 1);
            return;
        }

        console.error(error);
        process.exit(1);
    });
}

startServer(defaultPort);