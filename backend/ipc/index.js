const registerUsersIpc = require('./users');
const registerEntitiesIpc = require('./entities');
const registerTransactionsIpc = require('./transactions');
const registerHrIpc = require('./hr');
const registerBusinessIpc = require('./business');
const registerSystemIpc = require('./system');
const registerAiIpc = require('./ai');

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

    const wrappedIpcMain = new Proxy(ipcMain, {
        get(target, prop) {
            if (prop === 'handle') {
                return (channel, listener) => {
                    target.handle(channel, async (event, ...args) => {
                        while (!db.isReady) {
                            await new Promise(resolve => setTimeout(resolve, 50));
                        }
                        return await listener(event, ...args);
                    });
                };
            }
            const value = target[prop];
            return typeof value === 'function' ? value.bind(target) : value;
        }
    });

    registerUsersIpc(wrappedIpcMain, context);
    registerEntitiesIpc(wrappedIpcMain, context);
    registerTransactionsIpc(wrappedIpcMain, context);
    registerHrIpc(wrappedIpcMain, context);
    registerBusinessIpc(wrappedIpcMain, context);
    registerSystemIpc(wrappedIpcMain, context);
    registerAiIpc(wrappedIpcMain, context);
}

function setMainWindow(win) {
    context.mainWindow = win;
}

module.exports = {
    initIpc,
    setMainWindow,
    context
};
