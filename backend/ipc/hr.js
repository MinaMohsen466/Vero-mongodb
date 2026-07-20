module.exports = function(ipcMain, context) {
    const { db, logActivity } = context;

    // --- Employees ---
    ipcMain.handle('employees:getAll', async () => await db.employees.getAll());
    ipcMain.handle('employees:getById', async (event, id) => await db.employees.getById(id));
    ipcMain.handle('employees:create', async (event, emp) => {
        const result = await db.employees.create(emp);
        if (result.success) await logActivity('create', 'employees', result.id, emp.name, emp);
        return result;
    });
    ipcMain.handle('employees:update', async (event, emp) => {
        const result = await db.employees.update(emp);
        if (result.success) await logActivity('update', 'employees', emp.id, emp.name, emp);
        return result;
    });
    ipcMain.handle('employees:delete', async (event, id) => {
        const result = await db.employees.delete(id);
        if (result.success) await logActivity('delete', 'employees', id, String(id), {});
        return result;
    });
    ipcMain.handle('employees:getSummary', async (event, id) => await db.employees.getSummary(id));

    // --- Salaries ---
    ipcMain.handle('salaries:getAll', async () => await db.salaries.getAll());
    ipcMain.handle('salaries:getByEmployee', async (event, id) => await db.salaries.getByEmployee(id));
    ipcMain.handle('salaries:pay', async (event, payment) => {
        const result = await db.salaries.pay(payment);
        if (result.success) await logActivity('create', 'salaries', result.id, payment.payment_number || String(result.id), payment);
        return result;
    });
    ipcMain.handle('salaries:delete', async (event, id) => {
        const result = await db.salaries.delete(id);
        if (result.success) await logActivity('delete', 'salaries', id, String(id), {});
        return result;
    });
    ipcMain.handle('salaries:getTotal', async (event, { startDate, endDate }) => await db.salaries.getTotal(startDate, endDate));

    // --- Leaves ---
    ipcMain.handle('leaves:getAll', async () => await db.leaves.getAll());
    ipcMain.handle('leaves:getByEmployee', async (event, id) => await db.leaves.getByEmployee(id));
    ipcMain.handle('leaves:create', async (event, leave) => {
        const result = await db.leaves.create(leave);
        if (result.success) await logActivity('create', 'leaves', result.id, leave.leave_type, leave);
        return result;
    });
    ipcMain.handle('leaves:updateStatus', async (event, { id, status, approvedBy }) => {
        const result = await db.leaves.updateStatus(id, status, approvedBy);
        if (result.success) await logActivity('update', 'leaves', id, status, { status, approvedBy });
        return result;
    });
    ipcMain.handle('leaves:delete', async (event, id) => {
        const result = await db.leaves.delete(id);
        if (result.success) await logActivity('delete', 'leaves', id, String(id), {});
        return result;
    });

    // --- Deductions ---
    ipcMain.handle('deductions:getAll', async () => await db.deductions.getAll());
    ipcMain.handle('deductions:getByEmployee', async (event, id) => await db.deductions.getByEmployee(id));
    ipcMain.handle('deductions:create', async (event, deduction) => {
        const result = await db.deductions.create(deduction);
        if (result.success) await logActivity('create', 'deductions', result.id, deduction.reason, deduction);
        return result;
    });
    ipcMain.handle('deductions:delete', async (event, id) => {
        const result = await db.deductions.delete(id);
        if (result.success) await logActivity('delete', 'deductions', id, String(id), {});
        return result;
    });
};
