module.exports = function(ipcMain, context) {
    const { db, logActivity } = context;

    const checkPermission = (moduleName, action) => {
        if (!context.currentUser) return false;
        if (context.currentUser.role === 'admin' || context.currentUser.id === 1 || context.currentUser.username === 'admin') return true;
        if (context.currentUser.permissions && context.currentUser.permissions[moduleName]) {
            const val = context.currentUser.permissions[moduleName][action];
            if (val !== undefined && val !== null) return !!val;
        }
        return context.currentUser.role === 'admin';
    };

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
            context.currentUser = { id: user.id, username: user.username, full_name: user.full_name, role: user.role, permissions: user.permissions };
        } else {
            context.currentUser = null;
        }
        return { success: true };
    });

    ipcMain.handle('users:getAll', async () => await db.users.getAll());

    ipcMain.handle('users:create', async (event, user) => {
        if (!checkPermission('users', 'can_create')) {
            return { success: false, error: 'عذراً، لا تمتلك الصلاحية الكافية لإضافة مستخدمين.' };
        }
        const result = await db.users.create(user);
        if (result.success) await logActivity('create', 'users', result.id, user.username, user);
        return result;
    });

    ipcMain.handle('users:update', async (event, user) => {
        if (!checkPermission('users', 'can_edit') && context.currentUser?.id !== user.id) {
            return { success: false, error: 'عذراً، لا تمتلك الصلاحية الكافية لتعديل بيانات هذا المستخدم.' };
        }
        const result = await db.users.update(user);
        if (result.success) await logActivity('update', 'users', user.id, user.username, user);
        return result;
    });

    ipcMain.handle('users:delete', async (event, id) => {
        if (!checkPermission('users', 'can_delete')) {
            return { success: false, error: 'عذراً، لا تمتلك الصلاحية الكافية لحذف المستخدمين.' };
        }
        let username = String(id);
        try {
            const all = await db.users.getAll();
            const found = all.find(u => u.id === id);
            if (found) username = found.username;
        } catch (e) {}
        const result = await db.users.delete(id);
        if (result.success) await logActivity('delete', 'users', id, username, {});
        return result;
    });

    // --- Permissions ---
    ipcMain.handle('permissions:getByRole', async (event, role) => await db.permissions.getByRole(role));
    ipcMain.handle('permissions:savePermissions', async (event, { role, permissions }) => {
        if (!checkPermission('permissions', 'can_edit')) {
            return { success: false, error: 'عذراً، لا تمتلك الصلاحية الكافية لتعديل صلاحيات الأدوار.' };
        }
        return await db.permissions.savePermissions(role, permissions);
    });
    ipcMain.handle('permissions:getUserPermissions', async (event, userId) => await db.permissions.getUserPermissions(userId));
    ipcMain.handle('permissions:saveUserPermissions', async (event, { userId, permissions }) => {
        if (!checkPermission('permissions', 'can_edit')) {
            return { success: false, error: 'عذراً، لا تمتلك الصلاحية الكافية لتخصيص صلاحيات المستخدمين.' };
        }
        return await db.permissions.saveUserPermissions(userId, permissions);
    });
    ipcMain.handle('permissions:clearUserPermissions', async (event, userId) => {
        if (!checkPermission('permissions', 'can_delete')) {
            return { success: false, error: 'عذراً، لا تمتلك الصلاحية الكافية لحذف تخصيص صلاحيات المستخدمين.' };
        }
        return await db.permissions.clearUserPermissions(userId);
    });

    // --- Activity Log ---
    ipcMain.handle('activityLog:getAll', async (event, filters) => {
        return await db.activityLog.getAll(filters || {});
    });
};
