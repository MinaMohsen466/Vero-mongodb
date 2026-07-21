if (typeof globalThis.crypto === 'undefined') {
    globalThis.crypto = require('crypto');
}
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const db = require('./database/db');
const AdminConfig = require('./admin-config');
const ipc = require('./ipc');

let mainWindow;
let adminConfig = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        title: 'Vero',
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, '../public/icon.png'),
        autoHideMenuBar: true
    });

    ipc.setMainWindow(mainWindow);

    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        mainWindow.loadURL('http://127.0.0.1:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    // Initialize admin config first
    const userDataPath = app.getPath('userData');
    adminConfig = new AdminConfig(userDataPath);
    adminConfig.init();
    db.setAdminConfig(adminConfig);
    
    // Register all modular IPC handlers immediately (they wait internally for db to be ready)
    ipc.initIpc(ipcMain, app, dialog, BrowserWindow, db);
    console.log('IPC handlers initialized successfully');

    createWindow();

    // Initialize database asynchronously in the background
    db.init(app).then(() => {
        console.log('Database initialized successfully');
    }).catch(err => {
        console.error('Database initialization failed:', err);
        dialog.showErrorBox(
            'خطأ في تشغيل قاعدة البيانات',
            `فشل بدء تشغيل قاعدة البيانات. يرجى التأكد من تشغيل MongoDB والاتصال بالخادم.\n\nالتفاصيل: ${err.message}`
        );
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    if (db && typeof db.forceSave === 'function') {
        db.forceSave();
    }
});
