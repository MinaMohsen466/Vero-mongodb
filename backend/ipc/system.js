const fs = require('fs');
const path = require('path');
const { BrowserWindow } = require('electron');

const SETUP_ADMIN_USERNAME = 'admin';

module.exports = function(ipcMain, context) {
    const { db, app, dialog, logActivity } = context;

    // --- System Setup ---
    ipcMain.handle('system:isFirstRun', async () => await db.system.isFirstRun());
    ipcMain.handle('system:runSetup', async (event, data) => await db.system.runSetup(data));
    ipcMain.handle('system:verifySetupAccess', async (event, { username, password }) => {
        if (!db.adminConfig) {
            return { success: false, message: 'Configuration not initialized' };
        }
        const SETUP_ADMIN_PASSWORD = db.adminConfig.getAdminPassword();
        if (username === SETUP_ADMIN_USERNAME && password === SETUP_ADMIN_PASSWORD) {
            return { success: true };
        }
        return { success: false, message: 'Invalid admin credentials' };
    });

    ipcMain.handle('system:checkReinstall', async () => {
        const configPath = path.join(app.getPath('userData'), 'vero-config.json');
        let config = {};
        if (fs.existsSync(configPath)) {
            try {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } catch (e) {}
        }
        
        let packageMtime = 0;
        try {
            const packageJsonPath = path.join(app.getAppPath(), 'package.json');
            packageMtime = fs.statSync(packageJsonPath).mtimeMs;
        } catch (e) {}

        const isReinstall = config.lastRunMtime !== packageMtime;
        
        if (isReinstall) {
            config.lastRunMtime = packageMtime;
            try {
                const configDir = path.dirname(configPath);
                if (!fs.existsSync(configDir)) {
                    fs.mkdirSync(configDir, { recursive: true });
                }
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
            } catch (e) {}
            return true;
        }
        return false;
    });

    // --- Settings ---
    ipcMain.handle('settings:get', async (event, key) => await db.settings.get(key));
    ipcMain.handle('settings:getAll', async () => await db.settings.getAll());
    ipcMain.handle('settings:set', async (event, { category, key, value }) => await db.settings.set(category, key, value));
    ipcMain.handle('settings:backup', async () => await db.backup());
    ipcMain.handle('settings:backupToPath', async (event, destPath) => await db.backupToPath(destPath));
    ipcMain.handle('database:backupToExcel', async (event, filePath) => await db.backupToExcel(filePath));
    ipcMain.handle('settings:getDbPath', async () => await db.getDbPath());
    ipcMain.handle('settings:changeDbPath', async (event, newFolderPath) => {
        const result = await db.changeDbPath(newFolderPath);
        if (result.success) {
            setTimeout(() => { app.relaunch(); app.exit(0); }, 500);
        }
        return result;
    });
    ipcMain.handle('settings:restore', async (event, filePath) => await db.restore(filePath));
    ipcMain.handle('settings:optimizeDb', async () => await db.vacuum());

    // Get database file size
    ipcMain.handle('settings:getDbSize', async () => {
        try {
            const dbFilePath = db.getDbPath ? await db.getDbPath() : null;
            if (!dbFilePath || !fs.existsSync(dbFilePath)) return null;
            const stats = fs.statSync(dbFilePath);
            const bytes = stats.size;
            if (bytes < 1024) return `${bytes} بايت`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
            return `${(bytes / (1024 * 1024)).toFixed(2)} ميجابايت`;
        } catch (e) { return null; }
    });

    // Reset application (delete all data)
    ipcMain.handle('settings:resetApp', async (event, options) => {
        try {
            if (db.resetApp) {
                await db.resetApp(options);
            } else {
                const dbFilePath = db.getDbPath ? await db.getDbPath() : null;
                if (dbFilePath && fs.existsSync(dbFilePath)) fs.unlinkSync(dbFilePath);
            }
            const isFullReset = !options || Object.keys(options).length === 0 || options.deleteSettingsAndUsers;
            if (isFullReset) {
                app.relaunch();
                app.exit(0);
            }
            return { success: true, relaunch: isFullReset };
        } catch (e) {
            console.error('[settings:resetApp] Error:', e);
            return { success: false, error: e.message };
        }
    });

    // --- File Dialog ---
    ipcMain.handle('dialog:openFile', async (event, options) => {
        const result = await dialog.showOpenDialog(context.mainWindow, options);
        if (context.mainWindow) {
            setTimeout(() => {
                if (!context.mainWindow.isDestroyed()) {
                    context.mainWindow.blur();
                    context.mainWindow.focus();
                }
            }, 100);
        }
        return result;
    });

    ipcMain.handle('dialog:saveFile', async (event, options) => {
        const result = await dialog.showSaveDialog(context.mainWindow, options);
        if (context.mainWindow) {
            setTimeout(() => {
                if (!context.mainWindow.isDestroyed()) {
                    context.mainWindow.blur();
                    context.mainWindow.focus();
                }
            }, 100);
        }
        return result;
    });

    // --- Print ---
    ipcMain.handle('print:getPrinters', async () => {
        if (!context.mainWindow || context.mainWindow.isDestroyed()) return [];
        try {
            return await context.mainWindow.webContents.getPrintersAsync();
        } catch (e) {
            console.error('[print:getPrinters] Error fetching printers:', e);
            return [];
        }
    });

    ipcMain.handle('print:invoice', async (event, invoiceHtml, options = {}) => {
        const printWindow = new BrowserWindow({
            width: 800, height: 600, show: false,
            webPreferences: { nodeIntegration: false, contextIsolation: true }
        });

        printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(invoiceHtml)}`);

        printWindow.webContents.on('did-finish-load', async () => {
            let paperSize = options.paperSize;
            let paperOrientation = options.paperOrientation;

            if (!paperSize || !paperOrientation) {
                try {
                    const settingsList = await db.settings.getAll();
                    const invoiceSettings = {};
                    if (Array.isArray(settingsList)) {
                        settingsList.forEach(s => {
                            if (s.category === 'invoice') invoiceSettings[s.key] = s.value;
                        });
                    }
                    if (!paperSize) paperSize = invoiceSettings.paper_size || 'A4';
                    if (!paperOrientation) paperOrientation = invoiceSettings.paper_orientation || 'portrait';
                } catch (e) {
                    if (!paperSize) paperSize = 'A4';
                    if (!paperOrientation) paperOrientation = 'portrait';
                }
            }

            let pageSizeOption = 'A4';
            if (['A3', 'A4', 'A5', 'Letter', 'Legal'].includes(paperSize)) {
                pageSizeOption = paperSize;
            } else if (paperSize === 'thermal_110') {
                pageSizeOption = { width: 110000, height: 300000 };
            } else if (paperSize === 'thermal_80') {
                pageSizeOption = { width: 80000, height: 300000 };
            } else if (paperSize === 'thermal_76') {
                pageSizeOption = { width: 76000, height: 300000 };
            } else if (paperSize === 'thermal_58') {
                pageSizeOption = { width: 58000, height: 300000 };
            } else if (paperSize === 'thermal_57') {
                pageSizeOption = { width: 57000, height: 300000 };
            }

            const landscape = paperOrientation === 'landscape';
            const margins = paperSize.startsWith('thermal')
                ? { marginType: 'none' }
                : { marginType: 'default' };

            // Determine silent print and printer device
            let silent = false;
            let deviceName = '';
            if (options.deviceName) {
                deviceName = options.deviceName;
                silent = options.silent === true;
            } else {
                try {
                    const settingsList = await db.settings.getAll();
                    const defaultPrinterKey = options.invoiceType === 'pos' ? 'pos_printer' : 'invoice_printer';
                    const isSilentKey = options.invoiceType === 'pos' ? 'pos_silent_print' : 'invoice_silent_print';
                    
                    if (Array.isArray(settingsList)) {
                        const printerSetting = settingsList.find(s => s.key === defaultPrinterKey);
                        const silentSetting = settingsList.find(s => s.key === isSilentKey);
                        if (printerSetting && printerSetting.value) {
                            deviceName = printerSetting.value;
                        }
                        if (silentSetting && silentSetting.value === 'yes') {
                            silent = true;
                        }
                    }
                } catch (e) {
                    console.error('[print:invoice] Error loading fallback printing configurations:', e);
                }
            }

            const printOptions = {
                silent: silent,
                printBackground: true,
                landscape: landscape,
                pageSize: pageSizeOption,
                margins: margins
            };

            if (deviceName) {
                printOptions.deviceName = deviceName;
            }

            printWindow.webContents.print(printOptions, (success, errorType) => {
                printWindow.close();
                if (context.mainWindow) {
                    setTimeout(() => {
                        if (!context.mainWindow.isDestroyed()) {
                            context.mainWindow.blur();
                            context.mainWindow.focus();
                        }
                    }, 100);
                }
            });
        });

        return { success: true };
    });

    // --- File Read (for logo as base64) ---
    ipcMain.handle('file:readAsBase64', async (event, filePath) => {
        try {
            console.log('[file:readAsBase64] Reading file:', filePath);
            if (!filePath) {
                console.log('[file:readAsBase64] No filePath provided');
                return null;
            }
            if (!fs.existsSync(filePath)) {
                console.error('[file:readAsBase64] File does not exist:', filePath);
                return null;
            }

            // Resolve absolute path and restrict access
            const resolvedPath = path.resolve(filePath);
            const ext = path.extname(resolvedPath).toLowerCase().slice(1);
            const safeImageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'];
            
            const allowedDirs = [
                app.getPath('userData'),
                app.getPath('documents'),
                app.getPath('pictures'),
                app.getPath('temp')
            ].map(dir => path.resolve(dir).toLowerCase());

            const isAllowedDir = allowedDirs.some(allowedDir => {
                return resolvedPath.toLowerCase().startsWith(allowedDir + path.sep) || resolvedPath.toLowerCase() === allowedDir;
            });

            // Deny access if it's not a safe image and not inside allowed directories
            if (!isAllowedDir && !safeImageExts.includes(ext)) {
                console.error('[file:readAsBase64] Access denied to path:', resolvedPath);
                return null;
            }

            const data = fs.readFileSync(resolvedPath);
            const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml' };
            const mime = mimeMap[ext] || 'image/png';
            const base64 = `data:${mime};base64,${data.toString('base64')}`;
            console.log('[file:readAsBase64] Successfully converted to base64, length:', base64.length);
            return base64;
        } catch (e) {
            console.error('[file:readAsBase64] Error reading file as base64:', e);
            return null;
        }
    });

    // --- Copy logo to app data ---
    ipcMain.handle('file:copyLogo', async (event, srcPath) => {
        try {
            console.log('[file:copyLogo] Copying logo from:', srcPath);
            if (!srcPath || !fs.existsSync(srcPath)) {
                console.error('[file:copyLogo] Source file does not exist:', srcPath);
                return null;
            }

            const resolvedSrc = path.resolve(srcPath);
            const ext = path.extname(resolvedSrc).toLowerCase();
            const safeImageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'];
            
            if (!safeImageExts.includes(ext)) {
                console.error('[file:copyLogo] Access denied: file is not a safe image extension');
                return null;
            }

            const destDir = path.join(app.getPath('userData'));
            const destPath = path.join(destDir, `company_logo${ext}`);
            console.log('[file:copyLogo] Copying to:', destPath);
            fs.copyFileSync(resolvedSrc, destPath);
            console.log('[file:copyLogo] Copy successful');
            return destPath;
        } catch (e) {
            console.error('[file:copyLogo] Error copying logo:', e);
            return null;
        }
    });

    // --- Save text/csv file to disk ---
    ipcMain.handle('file:saveText', async (event, { content, defaultName, filters }) => {
        try {
            const result = await dialog.showSaveDialog(context.mainWindow, {
                defaultPath: defaultName || 'export.csv',
                filters: filters || [{ name: 'CSV Files', extensions: ['csv'] }, { name: 'All Files', extensions: ['*'] }]
            });
            if (context.mainWindow) {
                setTimeout(() => {
                    if (!context.mainWindow.isDestroyed()) {
                        context.mainWindow.blur();
                        context.mainWindow.focus();
                    }
                }, 100);
            }
            if (result.canceled || !result.filePath) return { success: false };
            fs.writeFileSync(result.filePath, '\uFEFF' + content, 'utf8'); // BOM for Excel Arabic support
            return { success: true, filePath: result.filePath };
        } catch (e) {
            console.error('[file:saveText] Error:', e);
            return { success: false, error: e.message };
        }
    });

    // --- Database Backup Management ---
    ipcMain.handle('database:getBackupPath', async () => {
        try {
            return await db.getBackupPath();
        } catch (e) {
            console.error('[database:getBackupPath] Error:', e);
            return { backupDbPath: null, lastBackupTime: null };
        }
    });

    ipcMain.handle('database:setBackupPath', async (event, backupPath) => {
        try {
            const result = await db.setBackupPath(backupPath);
            return result;
        } catch (e) {
            console.error('[database:setBackupPath] Error:', e);
            return { success: false, error: 'خطأ في تعيين مسار النسخة الاحتياطية' };
        }
    });

    ipcMain.handle('database:testBackupPath', async (event, testPath) => {
        try {
            const result = await db.testBackupPath(testPath);
            return result;
        } catch (e) {
            console.error('[database:testBackupPath] Error:', e);
            return { success: false, error: 'فشل اختبار المسار' };
        }
    });

    ipcMain.handle('database:selectBackupPath', async () => {
        try {
            const result = await dialog.showOpenDialog(context.mainWindow, {
                properties: ['openDirectory'],
                title: 'اختر مجلد لحفظ النسخة الاحتياطية'
            });
            if (context.mainWindow) {
                setTimeout(() => {
                    if (!context.mainWindow.isDestroyed()) {
                        context.mainWindow.blur();
                        context.mainWindow.focus();
                    }
                }, 100);
            }
            if (result.canceled || !result.filePaths.length) {
                return { success: false, canceled: true };
            }
            const selectedDir = result.filePaths[0];
            const backupPath = path.join(selectedDir, 'accapp_backup.db');
            return { success: true, path: backupPath };
        } catch (e) {
            console.error('[database:selectBackupPath] Error:', e);
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('database:getConnectionStatus', async () => {
        try {
            return db.getConnectionStatus();
        } catch (e) {
            console.error('[database:getConnectionStatus] Error:', e);
            return { isConnected: false, error: e.message, hasConfiguredUri: false };
        }
    });

    ipcMain.handle('database:setConnectionUri', async (event, uri) => {
        try {
            const result = await db.setConnectionUri(uri);
            if (result.success) {
                setTimeout(() => {
                    app.relaunch();
                    app.exit(0);
                }, 1000);
            }
            return result;
        } catch (e) {
            console.error('[database:setConnectionUri] Error:', e);
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('database:clearConnectionUri', async () => {
        try {
            const result = await db.clearConnectionUri();
            if (result.success) {
                setTimeout(() => {
                    app.relaunch();
                    app.exit(0);
                }, 1000);
            }
            return result;
        } catch (e) {
            console.error('[database:clearConnectionUri] Error:', e);
            return { success: false, error: e.message };
        }
    });

    // --- Window Refocus Fix ---
    ipcMain.on('window:refocus', () => {
        if (context.mainWindow) {
            setTimeout(() => {
                if (!context.mainWindow.isDestroyed()) {
                    context.mainWindow.blur();
                    context.mainWindow.focus();
                }
            }, 100);
        }
    });
};
