module.exports = function(ipcMain, context) {
    const { db, logActivity } = context;

    ipcMain.handle('users:login', async (event, { username, password }) => {
        const result = await db.users.login(username, password);
        if (result.success) {
            context.currentUser = result.user;
            await db.activityLog.log({
                user_id: result.user.id,
                user_name: result.user.full_name || username,
                action: 'login',
                module: 'users',
                entity_ref: username
            });
        }
        return result;
    });

    ipcMain.handle('users:setCurrentUser', async (event, user) => {
        if (user && typeof user === 'object' && user.id && user.username) {
            context.currentUser = { id: user.id, username: user.username, full_name: user.full_name, role: user.role };
        } else {
            context.currentUser = null;
        }
        return { success: true };
    });

    ipcMain.handle('users:getAll', async () => await db.users.getAll());

    ipcMain.handle('users:create', async (event, user) => {
        const result = await db.users.create(user);
        if (result.success) await logActivity('create', 'users', result.id, user.username, user);
        return result;
    });

    ipcMain.handle('users:update', async (event, user) => {
        const result = await db.users.update(user);
        if (result.success) await logActivity('update', 'users', user.id, user.username, user);
        return result;
    });

    ipcMain.handle('users:delete', async (event, id) => {
        const result = await db.users.delete(id);
        if (result.success) await logActivity('delete', 'users', id, String(id), {});
        return result;
    });

    // --- Permissions ---
    ipcMain.handle('permissions:getByRole', async (event, role) => await db.permissions.getByRole(role));
    ipcMain.handle('permissions:savePermissions', async (event, { role, permissions }) => await db.permissions.savePermissions(role, permissions));
    ipcMain.handle('permissions:getUserPermissions', async (event, userId) => await db.permissions.getUserPermissions(userId));
    ipcMain.handle('permissions:saveUserPermissions', async (event, { userId, permissions }) => await db.permissions.saveUserPermissions(userId, permissions));
    ipcMain.handle('permissions:clearUserPermissions', async (event, userId) => await db.permissions.clearUserPermissions(userId));

    // --- Activity Log ---
    ipcMain.handle('activityLog:getAll', async (event, filters) => {
        return await db.activityLog.getAll(filters || {});
    });
};
