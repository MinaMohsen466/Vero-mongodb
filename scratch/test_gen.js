const { exportToExcel } = require('../backend/database/utils/excelBackup');
const path = require('path');

async function test() {
    try {
        const mockDb = {
            collections: {
                customers: { find: () => ({ lean: async () => [{ id: 1, code: 'C0001', name: 'emad', phone: '156161516', opening_balance: 0, balance: 40 }] }) },
                suppliers: { find: () => ({ lean: async () => [] }) },
                products: { find: () => ({ lean: async () => [{ id: 5, code: 'P0005', name: 'color5', purchase_price: 5, sale_price: 7, stock_quantity: 10 }] }) },
                expenses: { find: () => ({ lean: async () => [] }) },
                employees: { find: () => ({ lean: async () => [] }) },
                invoices: { find: () => ({ lean: async () => [
                    { id: 1, type: 'sales', invoice_number: 'SL-000001', customer_id: 1, status: 'credit', total: 40, date: '2026-07-22', items: [{ product_id: 5, product_code: 'P0005', product_name: 'color5', quantity: 2, unit_price: 7 }] }
                ] }) },
                vouchers: { find: () => ({ lean: async () => [] }) },
                returns: { find: () => ({ lean: async () => [] }) }
            }
        };

        const outPath = path.join(__dirname, 'test_output.xlsx');
        console.log('Generating test excel file to:', outPath);
        await exportToExcel(mockDb, outPath, false); // Standalone Excel mode
        console.log('SUCCESS! Standalone Excel generated without errors.');

        const outPathData = path.join(__dirname, 'test_output_data.xlsx');
        console.log('Generating test excel file with data to:', outPathData);
        await exportToExcel(mockDb, outPathData, true); // With data mode
        console.log('SUCCESS! Data Excel generated without errors.');

    } catch (e) {
        console.error('Error generating excel:', e);
    }
}

test();
