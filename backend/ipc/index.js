const registerUsersIpc = require('./users');
const registerEntitiesIpc = require('./entities');
const registerTransactionsIpc = require('./transactions');
const registerHrIpc = require('./hr');
const registerBusinessIpc = require('./business');
const registerSystemIpc = require('./system');

const context = {
    currentUser: null,
    mainWindow: null,
    app: null,
    dialog: null,
    db: null,
    BrowserWindow: null,
    logActivity: async function(action, module, entity_id, entity_ref, data) {
        try {
            const user_id = data?._userId || (context.currentUser ? context.currentUser.id : null);
            const user_name = data?._userName || (context.currentUser ? (context.currentUser.full_name || context.currentUser.username) : 'غير معروف');
            await context.db.activityLog.log({ user_id, user_name, action, module, entity_id, entity_ref });
        } catch (e) { /* silent */ }
    }
};

function initIpc(ipcMain, app, dialog, BrowserWindow, db) {
    context.app = app;
    context.dialog = dialog;
    context.BrowserWindow = BrowserWindow;
    context.db = db;

    registerUsersIpc(ipcMain, context);
    registerEntitiesIpc(ipcMain, context);
    registerTransactionsIpc(ipcMain, context);
    registerHrIpc(ipcMain, context);
    registerBusinessIpc(ipcMain, context);
    registerSystemIpc(ipcMain, context);
}

function setMainWindow(win) {
    context.mainWindow = win;
}

module.exports = {
    initIpc,
    setMainWindow,
    context
};
