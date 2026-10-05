const { app, BrowserWindow } = require("electron");
const http = require("http");
const path = require("path");

let mainWindow;
const candidatePorts = [3000, 3001, 3002, 3003, 3004];

function isServerReady(port) {
    return new Promise((resolve) => {
        const req = http.get({ host: "127.0.0.1", port, path: "/" }, (res) => {
            res.resume();
            resolve(true);
        });

        req.on("error", () => resolve(false));
        req.setTimeout(500, () => {
            req.destroy();
            resolve(false);
        });
    });
}

async function getAvailablePort() {
    for (const port of candidatePorts) {
        if (await isServerReady(port)) {
            return port;
        }
    }

    return candidatePorts[0];
}

function startBackend() {
    require(path.join(__dirname, "server.js"));
}

async function createWindow() {
    const port = await getAvailablePort();

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 980,
        minHeight: 720,
        backgroundColor: "#0f172a",
        autoHideMenuBar: true,
        title: "POS App",
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true
        }
    });

    await mainWindow.loadURL(`http://localhost:${port}`);
}

app.whenReady().then(() => {
    startBackend();
    createWindow();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});