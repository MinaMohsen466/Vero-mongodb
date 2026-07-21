const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const EXCEL_BORDER = {
    top: { style: 'thin', color: { argb: 'FFB4C6E7' } },
    bottom: { style: 'thin', color: { argb: 'FFB4C6E7' } },
    left: { style: 'thin', color: { argb: 'FFB4C6E7' } },
    right: { style: 'thin', color: { argb: 'FFB4C6E7' } }
};

function colIndexToLetter(colIndex) {
    let temp = colIndex;
    let letter = '';
    while (temp >= 0) {
        letter = String.fromCharCode((temp % 26) + 65) + letter;
        temp = Math.floor(temp / 26) - 1;
    }
    return letter;
}

// Helper to format worksheets and freeze header row
function styleWorksheet(worksheet, headers, totalRows, sumCols = []) {
    // Freeze header row (Row 1)
    worksheet.views = [
        { state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2', activeCell: 'A2', rightToLeft: true }
    ];
    
    // Header row is Row 1
    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } }; // Dark blue
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = EXCEL_BORDER;
    });

    // Auto-filter on Row 1
    const lastColLetter = colIndexToLetter(headers.length - 1);
    worksheet.autoFilter = `A1:${lastColLetter}1`;

    // Data rows style (Row 2 to totalRows + 1)
    for (let r = 2; r <= totalRows + 1; r++) {
        const row = worksheet.getRow(r);
        row.height = 20;
        
        // Row 2 is the Example/Instruction row (styled differently: italic, light gray/yellow)
        const isInstruction = (r === 2);
        const rowBgColor = isInstruction ? 'FFF2F2F2' : ((r - 2) % 2 === 1 ? 'FFDEEAF6' : 'FFFFFFFF');
        
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
            cell.font = { 
                name: 'Arial', 
                size: 10, 
                italic: isInstruction, 
                bold: isInstruction,
                color: { argb: isInstruction ? 'FF555555' : 'FF333333' } 
            };
            cell.border = EXCEL_BORDER;
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
    }

    // Add Sum Row if there is data
    if (totalRows > 0 && sumCols.length > 0) {
        const sumRowNum = totalRows + 2;
        const sumRowData = headers.map((h, idx) => idx === 0 ? 'الإجمالي / Total' : '');
        const sumRow = worksheet.addRow(sumRowData);
        sumRow.height = 22;

        headers.forEach((h, idx) => {
            const cell = sumRow.getCell(idx + 1);
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF000000' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }; // soft light green
            cell.border = EXCEL_BORDER;
            cell.alignment = { vertical: 'middle', horizontal: 'center' };

            if (sumCols.includes(idx)) {
                const letter = colIndexToLetter(idx);
                cell.value = {
                    formula: `=SUM(${letter}3:${letter}${sumRowNum - 1})`
                };
                cell.numFmt = '#,##0.00';
            }
        });
    }
}

function formatDate(d) {
    if (!d) return '';
    try {
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return d;
        return dateObj.toISOString().split('T')[0];
    } catch(e) {
        return d;
    }
}

async function exportToExcel(db, filePath, includeData = true) {
    try {
        const workbook = new ExcelJS.Workbook();

        // --- 1. README Worksheet (دليل الاستخدام) ---
        const readmeSheet = workbook.addWorksheet('دليل الاستخدام');
        readmeSheet.views = [{ rightToLeft: true }];
        readmeSheet.columns = [{ width: 90 }];

        const readmeTitleRow = readmeSheet.addRow(['دليل استخدام برنامج الأرشيف والمخزون المصغر المتقدم (Excel)']);
        readmeTitleRow.height = 38;
        const titleCell = readmeTitleRow.getCell(1);
        titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF107C41' } }; // Excel Green
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        readmeSheet.addRow([]); // Spacing

        const instructions = [
            'مرحباً بك في برنامج المخزون والمبيعات المصغر المتقدم والاحتياطي الخاص بك في Excel.',
            'تم تصميم هذا الملف ليخدمك كـ "برنامج مصغر" وسهل الاستخدام تماماً لإضافة مبيعات ومشتريات ومراقبة المخزون يدوياً.',
            'يرجى ملاحظة أن هذا الملف مخصص للاستعراض والاستخدام الخارجي فقط (وليس لرفعه مرة أخرى للتطبيق).',
            '',
            'مزايا وطريقة عمل برنامج Excel المصغر:',
            '1. تجميد صف العناوين الأول والصف الإرشادي الثاني:',
            '   - تم تجميد الصف الأول (صف العناوين الأزرق) في كل الصفحات الحسابية ليبقى ثابتاً أثناء سحب الجدول لأسفل.',
            '   - تم إضافة صف إرشادي مائل باللون الرمادي (الصف رقم 2) في كل جدول به مثال توضيحي لتعليمك طريقة تعبئة البيانات.',
            '',
            '2. البحث المرن بالاسم أو الكود (دون تعارض):',
            '   - في صفحتي المبيعات والمشتريات، يمكنك البحث عن المنتج بطريقتين: إما باختيار "اسم المنتج" من قائمة الخيارات المنسدلة، أو باختيار "كود المنتج".',
            '   - سيقوم Excel تلقائياً باستنتاج الحقل الآخر المفقود وجلب سعره الافتراضي من صفحة "المنتجات" بالمعادلات الذكية دون حدوث أي أخطاء دائرية.',
            '',
            '3. التحديث التلقائي والديناميكي للمخزون المتاح (SUMIF & SUM):',
            '   - في صفحة "المنتجات"، يتم حساب "إجمالي المشتريات" و "إجمالي المبيعات" تلقائياً بالمعادلات من حركات الشراء والبيع.',
            '   - يتم حساب "الكمية الحالية" المتوفرة لكل منتج فورياً عبر المعادلة: (الكمية الابتدائية + إجمالي المشتريات - إجمالي المبيعات).',
            '   - بمجرد إضافة صف مبيعات أو مشتريات جديد في الجداول، ستقوم ورقة العمل بتحديث الكمية الحالية وقيمة المخزون للمنتج في نفس اللحظة تلقائياً.',
            '',
            '4. لوحة التقارير والتحليلات (Dashboard):',
            '   - تم إضافة ورقة عمل مخصصة كـ "لوحة تقارير" في البداية تعرض لك فورياً إجمالي المبيعات، المشتريات، المصروفات، وصافي الأرباح وقيمة المخزون الحالي تلقائياً بالمعادلات.'
        ];

        instructions.forEach(text => {
            const row = readmeSheet.addRow([text]);
            row.height = text === '' ? 12 : 22;
            const cell = row.getCell(1);
            cell.font = { 
                name: 'Arial', 
                size: 10, 
                bold: text.startsWith('مزايا') || text.includes(':'), 
                color: { argb: (text.startsWith('1') || text.startsWith('2') || text.startsWith('3') || text.startsWith('4')) ? 'FF107C41' : 'FF333333' } 
            };
            cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
        });

        // Fetch database records conditionally based on includeData parameter
        const customers = includeData ? await db.collections.customers.find({}).lean() : [];
        const suppliers = includeData ? await db.collections.suppliers.find({}).lean() : [];
        const products = includeData ? await db.collections.products.find({}).lean() : [];
        const expenses = includeData ? await db.collections.expenses.find({}).lean() : [];
        const employees = includeData ? await db.collections.employees.find({}).lean() : [];
        const invoices = includeData ? await db.collections.invoices.find({}).lean() : [];

        // Build mappings
        const customerMap = {};
        customers.forEach(c => { customerMap[c.id] = c.name; });

        const supplierMap = {};
        suppliers.forEach(s => { supplierMap[s.id] = s.name; });

        const productCodeMap = {};
        const productMap = {};
        products.forEach(p => { 
            const code = p.code || `PROD-${p.id}`;
            productCodeMap[p.id] = code;
            productMap[p.id] = p;
        });

        // Calculate Db totals for products to deduce correct initial stock
        const dbPurchasedQty = {};
        const dbSoldQty = {};

        invoices.forEach(inv => {
            if (inv.items) {
                inv.items.forEach(item => {
                    const pId = item.product_id;
                    const qty = item.quantity || 0;
                    if (inv.type === 'purchase') {
                        dbPurchasedQty[pId] = (dbPurchasedQty[pId] || 0) + qty;
                    } else if (inv.type === 'sales') {
                        dbSoldQty[pId] = (dbSoldQty[pId] || 0) + qty;
                    }
                });
            }
        });

        // --- 2. Dashboard Worksheet (لوحة التقارير والتحليلات) ---
        const dashboardSheet = workbook.addWorksheet('لوحة التقارير');
        dashboardSheet.views = [{ rightToLeft: true }];
        dashboardSheet.columns = [
            { header: 'المؤشر المالي / KPI', key: 'kpi', width: 32 },
            { header: 'المبلغ / القيمة الحالية', key: 'value', width: 22 },
            { header: 'التوضيح', key: 'desc', width: 44 }
        ];

        // Format Dashboard headers
        const dbHeader = dashboardSheet.getRow(1);
        dbHeader.height = 28;
        dbHeader.eachCell(cell => {
            cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } }; // Dark blue steel
            cell.border = EXCEL_BORDER;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // KPI Rows data & formulas
        const kpiRows = [
            { kpi: 'إجمالي المبيعات', val: { formula: "=SUM(المبيعات!H3:H5002)" }, desc: 'مجموع المبيعات التراكمي من جدول المبيعات' },
            { kpi: 'إجمالي المشتريات', val: { formula: "=SUM(المشتريات!H3:H5002)" }, desc: 'مجموع المشتريات التراكمي من جدول المشتريات' },
            { kpi: 'صافي الأرباح التشغيلية', val: { formula: "=B2-B3" }, desc: 'الأرباح قبل خصم المصروفات (المبيعات - المشتريات)' },
            { kpi: 'إجمالي المصروفات العامة', val: { formula: "=SUM(المصروفات!C3:C1002)" }, desc: 'مجموع المصروفات من جدول المصروفات' },
            { kpi: 'صافي الربح النهائي', val: { formula: "=B4-B5" }, desc: 'الأرباح الصافية النهائية (الأرباح التشغيلية - المصروفات)' },
            { kpi: 'إجمالي قيمة المخزون الحالي', val: { formula: "=SUM(المنتجات!L3:L1002)" }, desc: 'القيمة المالية الإجمالية للبضاعة المتاحة في المخازن' },
            { kpi: 'إجمالي عدد المنتجات المسجلة', val: { formula: "=COUNTA(المنتجات!A3:A1002)" }, desc: 'عدد الأصناف المعرفة والمسجلة في ورقة المنتجات' }
        ];

        kpiRows.forEach((item, idx) => {
            const rNum = idx + 2;
            const r = dashboardSheet.addRow({
                kpi: item.kpi,
                value: item.val,
                desc: item.desc
            });
            r.height = 24;
            
            const cellKPI = r.getCell(1);
            const cellVal = r.getCell(2);
            const cellDesc = r.getCell(3);

            cellKPI.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1F4E78' } };
            cellKPI.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F4F7' } };
            cellKPI.border = EXCEL_BORDER;
            cellKPI.alignment = { horizontal: 'right', vertical: 'middle' };

            cellVal.font = { name: 'Arial', size: 11, bold: true, color: { argb: rNum === 6 ? 'FF107C41' : (rNum === 4 ? 'FF2563EB' : 'FF000000') } };
            cellVal.border = EXCEL_BORDER;
            cellVal.alignment = { horizontal: 'center', vertical: 'middle' };
            if (rNum !== 8) {
                cellVal.numFmt = '#,##0.00';
            } else {
                cellVal.numFmt = '#,##0'; // Integer for count
            }

            cellDesc.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF7F7F7F' } };
            cellDesc.border = EXCEL_BORDER;
            cellDesc.alignment = { horizontal: 'right', vertical: 'middle' };
        });

        // --- 3. Products Sheet (المنتجات) ---
        const productsSheet = workbook.addWorksheet('المنتجات');
        productsSheet.columns = [
            { header: 'الكود', key: 'code', width: 16 },
            { header: 'الاسم', key: 'name', width: 24 },
            { header: 'الوصف', key: 'description', width: 28 },
            { header: 'الوحدة', key: 'unit', width: 12 },
            { header: 'القسم', key: 'category', width: 16 },
            { header: 'سعر الشراء', key: 'purchase_price', width: 14 },
            { header: 'سعر البيع', key: 'sale_price', width: 14 },
            { header: 'الكمية الابتدائية', key: 'initial_stock', width: 16 },
            { header: 'إجمالي المشتريات', key: 'purchased_qty', width: 16 },
            { header: 'إجمالي المبيعات', key: 'sold_qty', width: 16 },
            { header: 'الكمية الحالية', key: 'current_stock', width: 16 },
            { header: 'قيمة المخزون', key: 'stock_value', width: 16 }
        ];

        // Row 2: Example/Instruction row
        productsSheet.addRow({
            code: 'مثال: P-100',
            name: 'مثال: منتج تجريبي',
            description: 'مثال: وصف الصنف',
            unit: 'مثال: قطعة',
            category: 'مثال: عام',
            purchase_price: 10,
            sale_price: 15,
            initial_stock: 100,
            purchased_qty: { formula: `=IF(A2="","",SUMIF(المشتريات!E:E,A2,المشتريات!F:F))`, result: 0 },
            sold_qty: { formula: `=IF(A2="","",SUMIF(المبيعات!E:E,A2,المبيعات!F:F))`, result: 0 },
            current_stock: { formula: `=IF(A2="","",H2+I2-J2)`, result: 100 },
            stock_value: { formula: `=IF(A2="","",F2*K2)`, result: 1000 }
        });

        // Rows 3 to 1002: Products data + empty rows
        for (let idx = 0; idx < 1000; idx++) {
            const rowNum = idx + 3;
            const p = products[idx];

            if (p) {
                const purchasedInDb = dbPurchasedQty[p.id] || 0;
                const soldInDb = dbSoldQty[p.id] || 0;
                const initialStock = (p.stock_quantity || 0) - purchasedInDb + soldInDb;

                productsSheet.addRow({
                    code: p.code || `PROD-${p.id}`,
                    name: p.name || '',
                    description: p.description || '',
                    unit: p.unit || 'قطعة',
                    category: p.category || '',
                    purchase_price: p.purchase_price || 0,
                    sale_price: p.sale_price || 0,
                    initial_stock: initialStock,
                    purchased_qty: {
                        formula: `=IF(A${rowNum}="","",SUMIF(المشتريات!E:E, A${rowNum}, المشتريات!F:F))`,
                        result: purchasedInDb
                    },
                    sold_qty: {
                        formula: `=IF(A${rowNum}="","",SUMIF(المبيعات!E:E, A${rowNum}, المبيعات!F:F))`,
                        result: soldInDb
                    },
                    current_stock: {
                        formula: `=IF(A${rowNum}="","",H${rowNum}+I${rowNum}-J${rowNum})`,
                        result: p.stock_quantity || 0
                    },
                    stock_value: {
                        formula: `=IF(A${rowNum}="","",F${rowNum}*K${rowNum})`,
                        result: (p.purchase_price || 0) * (p.stock_quantity || 0)
                    }
                });
            } else {
                productsSheet.addRow({
                    code: { formula: `=IF(B${rowNum}="","","P"&TEXT(ROW()-2,"0000"))` },
                    name: '',
                    description: '',
                    unit: '',
                    category: '',
                    purchase_price: '',
                    sale_price: '',
                    initial_stock: '',
                    purchased_qty: { formula: `=IF(A${rowNum}="","",SUMIF(المشتريات!E:E, A${rowNum}, المشتريات!F:F))` },
                    sold_qty: { formula: `=IF(A${rowNum}="","",SUMIF(المبيعات!E:E, A${rowNum}, المبيعات!F:F))` },
                    current_stock: { formula: `=IF(A${rowNum}="","",H${rowNum}+I${rowNum}-J${rowNum})` },
                    stock_value: { formula: `=IF(A${rowNum}="","",F${rowNum}*K${rowNum})` }
                });
            }
        }
        styleWorksheet(productsSheet, productsSheet.columns, 1001, [5, 6, 7, 8, 9, 10, 11]);

        // --- 4. Customers Sheet (العملاء) ---
        const customersSheet = workbook.addWorksheet('العملاء');
        customersSheet.columns = [
            { header: 'كود العميل', key: 'code', width: 18 },
            { header: 'الاسم', key: 'name', width: 26 },
            { header: 'الهاتف', key: 'phone', width: 16 },
            { header: 'الرصيد الافتتاحي', key: 'opening_balance', width: 16 },
            { header: 'إجمالي المبيعات', key: 'sales_total', width: 16 },
            { header: 'الرصيد الحالي', key: 'balance', width: 16 }
        ];

        // Row 2: Example/Instruction row
        customersSheet.addRow({
            code: 'مثال: C-100',
            name: 'مثال: عميل تجريبي',
            phone: 'مثال: 99999999',
            opening_balance: 0,
            sales_total: { formula: `=IF(A2="","",SUMIF(المبيعات!B3:B5002, B2, المبيعات!H3:H5002))`, result: 0 },
            balance: { formula: `=IF(A2="","",D2+E2)`, result: 0 }
        });

        // Rows 3 to 1002
        for (let idx = 0; idx < 1000; idx++) {
            const rowNum = idx + 3;
            const c = customers[idx];

            if (c) {
                customersSheet.addRow({
                    code: c.code || `CUST-${c.id}`,
                    name: c.name || '',
                    phone: c.phone || '',
                    opening_balance: c.opening_balance || 0,
                    sales_total: {
                        formula: `=IF(A${rowNum}="","",SUMIF(المبيعات!B3:B5002, B${rowNum}, المبيعات!H3:H5002))`,
                        result: c.balance || 0
                    },
                    balance: {
                        formula: `=IF(A${rowNum}="","",D${rowNum}+E${rowNum})`,
                        result: c.balance || 0
                    }
                });
            } else {
                customersSheet.addRow({
                    code: { formula: `=IF(B${rowNum}="","","C"&TEXT(ROW()-2,"0000"))` },
                    name: '',
                    phone: '',
                    opening_balance: '',
                    sales_total: { formula: `=IF(A${rowNum}="","",SUMIF(المبيعات!B3:B5002, B${rowNum}, المبيعات!H3:H5002))` },
                    balance: { formula: `=IF(A${rowNum}="","",D${rowNum}+E${rowNum})` }
                });
            }
        }
        styleWorksheet(customersSheet, customersSheet.columns, 1001, [3, 4, 5]);

        // --- 5. Suppliers Sheet (الموردين) ---
        const suppliersSheet = workbook.addWorksheet('الموردين');
        suppliersSheet.columns = [
            { header: 'كود المورد', key: 'code', width: 18 },
            { header: 'الاسم', key: 'name', width: 26 },
            { header: 'الهاتف', key: 'phone', width: 16 },
            { header: 'الرصيد الافتتاحي', key: 'opening_balance', width: 16 },
            { header: 'إجمالي المشتريات', key: 'purchases_total', width: 16 },
            { header: 'الرصيد الحالي', key: 'balance', width: 16 }
        ];

        // Row 2: Example/Instruction row
        suppliersSheet.addRow({
            code: 'مثال: S-100',
            name: 'مثال: مورد تجريبي',
            phone: 'مثال: 99999999',
            opening_balance: 0,
            purchases_total: { formula: `=IF(A2="","",SUMIF(المشتريات!B3:B5002, B2, المشتريات!H3:H5002))`, result: 0 },
            balance: { formula: `=IF(A2="","",D2+E2)`, result: 0 }
        });

        // Rows 3 to 1002
        for (let idx = 0; idx < 1000; idx++) {
            const rowNum = idx + 3;
            const s = suppliers[idx];

            if (s) {
                suppliersSheet.addRow({
                    code: s.code || `SUPP-${s.id}`,
                    name: s.name || '',
                    phone: s.phone || '',
                    opening_balance: s.opening_balance || 0,
                    purchases_total: {
                        formula: `=IF(A${rowNum}="","",SUMIF(المشتريات!B3:B5002, B${rowNum}, المشتريات!H3:H5002))`,
                        result: s.balance || 0
                    },
                    balance: {
                        formula: `=IF(A${rowNum}="","",D${rowNum}+E${rowNum})`,
                        result: s.balance || 0
                    }
                });
            } else {
                suppliersSheet.addRow({
                    code: { formula: `=IF(B${rowNum}="","","S"&TEXT(ROW()-2,"0000"))` },
                    name: '',
                    phone: '',
                    opening_balance: '',
                    purchases_total: { formula: `=IF(A${rowNum}="","",SUMIF(المشتريات!B3:B5002, B${rowNum}, المشتريات!H3:H5002))` },
                    balance: { formula: `=IF(A${rowNum}="","",D${rowNum}+E${rowNum})` }
                });
            }
        }
        styleWorksheet(suppliersSheet, suppliersSheet.columns, 1001, [3, 4, 5]);

        // Gather existing flat database items
        const dbSalesItems = [];
        const dbPurchasesItems = [];

        invoices.forEach(inv => {
            if (inv.items && inv.items.length > 0) {
                inv.items.forEach(item => {
                    const rowData = {
                        date: formatDate(inv.date),
                        entityName: inv.type === 'sales' ? (customerMap[inv.customer_id] || '') : (supplierMap[inv.supplier_id] || ''),
                        productCode: productCodeMap[item.product_id] || '',
                        productName: productMap[item.product_id]?.name || '',
                        quantity: item.quantity || 0,
                        unitPrice: item.unit_price || 0,
                        notes: (inv.invoice_number || '') + (inv.notes ? ` - ${inv.notes}` : '')
                    };
                    if (inv.type === 'sales') {
                        dbSalesItems.push(rowData);
                    } else if (inv.type === 'purchase') {
                        dbPurchasesItems.push(rowData);
                    }
                });
            }
        });

        // --- 6. Sales Sheet (المبيعات) ---
        const salesSheet = workbook.addWorksheet('المبيعات');
        salesSheet.views = [{ rightToLeft: true }];
        salesSheet.columns = [
            { header: 'التاريخ', key: 'date', width: 16 },
            { header: 'اسم العميل', key: 'customer_name', width: 24 },
            { header: 'كود العميل (تلقائي)', key: 'customer_code', width: 18 },
            { header: 'اسم المنتج', key: 'product_name', width: 24 },
            { header: 'كود المنتج (تلقائي)', key: 'product_code', width: 18 },
            { header: 'الكمية المباعة', key: 'quantity', width: 14 },
            { header: 'سعر البيع', key: 'sale_price', width: 14 },
            { header: 'الإجمالي', key: 'total', width: 16 },
            { header: 'ملاحظات', key: 'notes', width: 26 }
        ];

        // Row 2: Example/Instruction row
        salesSheet.addRow({
            date: '2026-07-21',
            customer_name: 'مثال: عميل تجريبي',
            customer_code: { formula: `=IF(B2="","",IFERROR(INDEX(العملاء!A:A,MATCH(B2,العملاء!B:B,0)),""))`, result: 'C0001' },
            product_name: 'مثال: منتج تجريبي',
            product_code: { formula: `=IF(D2="","",IFERROR(INDEX(المنتجات!A:A,MATCH(D2,المنتجات!B:B,0)),""))`, result: 'P0001' },
            quantity: 5,
            sale_price: 15,
            total: { formula: `=IF(OR(F2="",G2=""),"",F2*G2)`, result: 75 },
            notes: 'مثال: ملاحظة بيع تجريبية'
        });

        // Rows 3 to 5002
        for (let idx = 0; idx < 5000; idx++) {
            const rowNum = idx + 3;
            const dbItem = dbSalesItems[idx];

            if (dbItem) {
                const cust = customers.find(c => c.name === dbItem.entityName);
                const custCode = cust ? (cust.code || `CUST-${cust.id}`) : '';

                salesSheet.addRow({
                    date: dbItem.date,
                    customer_name: dbItem.entityName,
                    customer_code: { formula: `=IF(B${rowNum}="","",IFERROR(INDEX(العملاء!A:A,MATCH(B${rowNum},العملاء!B:B,0)),""))`, result: custCode },
                    product_name: dbItem.productName,
                    product_code: { formula: `=IF(D${rowNum}="","",IFERROR(INDEX(المنتجات!A:A,MATCH(D${rowNum},المنتجات!B:B,0)),""))`, result: dbItem.productCode },
                    quantity: dbItem.quantity,
                    sale_price: dbItem.unitPrice,
                    total: {
                        formula: `=IF(OR(F${rowNum}="",G${rowNum}=""),"",F${rowNum}*G${rowNum})`,
                        result: dbItem.quantity * dbItem.unitPrice
                    },
                    notes: dbItem.notes
                });
            } else {
                salesSheet.addRow({
                    date: '',
                    customer_name: '',
                    customer_code: { formula: `=IF(B${rowNum}="","",IFERROR(INDEX(العملاء!A:A,MATCH(B${rowNum},العملاء!B:B,0)),""))` },
                    product_name: '',
                    product_code: { formula: `=IF(D${rowNum}="","",IFERROR(INDEX(المنتجات!A:A,MATCH(D${rowNum},المنتجات!B:B,0)),""))` },
                    quantity: '',
                    sale_price: { formula: `=IF(E${rowNum}="","",IFERROR(VLOOKUP(E${rowNum},المنتجات!A:G,7,FALSE),0))` },
                    total: { formula: `=IF(OR(F${rowNum}="",G${rowNum}=""),"",F${rowNum}*G${rowNum})` },
                    notes: ''
                });
            }
        }
        styleWorksheet(salesSheet, salesSheet.columns, 5001, [5, 7]);

        // Named Ranges: only cover rows with actual data (row 3 = first data row after header + instruction)
        // This prevents blank/white dropdown entries in Excel caused by empty cells in the range
        const customerLastRow = Math.max(customers.length + 2, 3); // At least row 3
        const supplierLastRow = Math.max(suppliers.length + 2, 3);
        const productLastRow = Math.max(products.length + 2, 3);

        // Define Named Ranges for cross-sheet validations
        workbook.definedNames.add(`العملاء!$B$3:$B$${customerLastRow}`, 'CustomerList');
        workbook.definedNames.add(`الموردين!$B$3:$B$${supplierLastRow}`, 'SupplierList');
        workbook.definedNames.add(`المنتجات!$B$3:$B$${productLastRow}`, 'ProductList');
        workbook.definedNames.add(`المنتجات!$A$3:$A$${productLastRow}`, 'ProductCodes');

        for (let r = 2; r <= 5002; r++) {
            const row = salesSheet.getRow(r);
            row.getCell(2).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: ['=CustomerList']
            };
            row.getCell(4).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: ['=ProductList']
            };
        }

        // --- 7. Purchases Sheet (المشتريات) ---
        const purchasesSheet = workbook.addWorksheet('المشتريات');
        purchasesSheet.columns = [
            { header: 'التاريخ', key: 'date', width: 16 },
            { header: 'اسم المورد', key: 'supplier_name', width: 24 },
            { header: 'كود المورد (تلقائي)', key: 'supplier_code', width: 18 },
            { header: 'اسم المنتج', key: 'product_name', width: 24 },
            { header: 'كود المنتج (تلقائي)', key: 'product_code', width: 18 },
            { header: 'الكمية المشتراة', key: 'quantity', width: 14 },
            { header: 'سعر الشراء', key: 'purchase_price', width: 14 },
            { header: 'الإجمالي', key: 'total', width: 16 },
            { header: 'ملاحظات', key: 'notes', width: 26 }
        ];

        // Row 2: Example/Instruction row
        purchasesSheet.addRow({
            date: '2026-07-21',
            supplier_name: 'مثال: مورد تجريبي',
            supplier_code: { formula: `=IF(B2="","",IFERROR(INDEX(الموردين!A:A,MATCH(B2,الموردين!B:B,0)),""))`, result: 'S0001' },
            product_name: 'مثال: منتج تجريبي',
            product_code: { formula: `=IF(D2="","",IFERROR(INDEX(المنتجات!A:A,MATCH(D2,المنتجات!B:B,0)),""))`, result: 'P0001' },
            quantity: 5,
            purchase_price: 10,
            total: { formula: `=IF(OR(F2="",G2=""),"",F2*G2)`, result: 50 },
            notes: 'مثال: ملاحظة شراء تجريبية'
        });

        // Rows 3 to 5002
        for (let idx = 0; idx < 5000; idx++) {
            const rowNum = idx + 3;
            const dbItem = dbPurchasesItems[idx];

            if (dbItem) {
                const supp = suppliers.find(s => s.name === dbItem.entityName);
                const suppCode = supp ? (supp.code || `SUPP-${supp.id}`) : '';

                purchasesSheet.addRow({
                    date: dbItem.date,
                    supplier_name: dbItem.entityName,
                    supplier_code: { formula: `=IF(B${rowNum}="","",IFERROR(INDEX(الموردين!A:A,MATCH(B${rowNum},الموردين!B:B,0)),""))`, result: suppCode },
                    product_name: dbItem.productName,
                    product_code: { formula: `=IF(D${rowNum}="","",IFERROR(INDEX(المنتجات!A:A,MATCH(D${rowNum},المنتجات!B:B,0)),""))`, result: dbItem.productCode },
                    quantity: dbItem.quantity,
                    purchase_price: dbItem.unitPrice,
                    total: {
                        formula: `=IF(OR(F${rowNum}="",G${rowNum}=""),"",F${rowNum}*G${rowNum})`,
                        result: dbItem.quantity * dbItem.unitPrice
                    },
                    notes: dbItem.notes
                });
            } else {
                purchasesSheet.addRow({
                    date: '',
                    supplier_name: '',
                    supplier_code: { formula: `=IF(B${rowNum}="","",IFERROR(INDEX(الموردين!A:A,MATCH(B${rowNum},الموردين!B:B,0)),""))` },
                    product_name: '',
                    product_code: { formula: `=IF(D${rowNum}="","",IFERROR(INDEX(المنتجات!A:A,MATCH(D${rowNum},المنتجات!B:B,0)),""))` },
                    quantity: '',
                    purchase_price: { formula: `=IF(E${rowNum}="","",IFERROR(VLOOKUP(E${rowNum},المنتجات!A:F,6,FALSE),0))` },
                    total: { formula: `=IF(OR(F${rowNum}="",G${rowNum}=""),"",F${rowNum}*G${rowNum})` },
                    notes: ''
                });
            }
        }
        styleWorksheet(purchasesSheet, purchasesSheet.columns, 5001, [5, 7]);

        // Add validations to Purchases Sheet
        for (let r = 2; r <= 5002; r++) {
            const row = purchasesSheet.getRow(r);
            row.getCell(2).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: ['=SupplierList']
            };
            row.getCell(4).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: ['=ProductList']
            };
        }

        // --- 8. Expenses Sheet (المصروفات) ---
        const expensesSheet = workbook.addWorksheet('المصروفات');
        expensesSheet.columns = [
            { header: 'التاريخ', key: 'date', width: 16 },
            { header: 'تصنيف المصروف', key: 'category', width: 22 },
            { header: 'المبلغ', key: 'amount', width: 14 },
            { header: 'البيان/الوصف', key: 'description', width: 30 }
        ];

        // Row 2: Example/Instruction row
        expensesSheet.addRow({
            date: '2026-07-21',
            category: 'مثال: إيجار',
            amount: 150,
            description: 'مثال: إيجار المكتب الشهري'
        });

        // Rows 3 to 1002
        for (let idx = 0; idx < 1000; idx++) {
            const e = expenses[idx];
            if (e) {
                expensesSheet.addRow({
                    date: formatDate(e.date),
                    category: e.category || '',
                    amount: e.amount || 0,
                    description: e.description || ''
                });
            } else {
                expensesSheet.addRow({
                    date: '',
                    category: '',
                    amount: '',
                    description: ''
                });
            }
        }
        styleWorksheet(expensesSheet, expensesSheet.columns, 1001, [2]);

        // --- 9. Employees Sheet (الموظفين) ---
        const employeesSheet = workbook.addWorksheet('الموظفين');
        employeesSheet.columns = [
            { header: 'الاسم بالكامل', key: 'full_name', width: 26 },
            { header: 'الهاتف', key: 'phone', width: 16 },
            { header: 'المسمى الوظيفي', key: 'job_title', width: 20 },
            { header: 'الراتب الأساسي', key: 'base_salary', width: 16 },
            { header: 'تاريخ التعيين', key: 'hire_date', width: 16 }
        ];

        // Row 2: Example/Instruction row
        employeesSheet.addRow({
            full_name: 'مثال: محمد علي',
            phone: 'مثال: 99999999',
            job_title: 'مثال: محاسب',
            base_salary: 350,
            hire_date: '2026-01-15'
        });

        // Rows 3 to 1002
        for (let idx = 0; idx < 1000; idx++) {
            const emp = employees[idx];
            if (emp) {
                employeesSheet.addRow({
                    full_name: emp.full_name || '',
                    phone: emp.phone || '',
                    job_title: emp.job_title || '',
                    base_salary: emp.base_salary || 0,
                    hire_date: formatDate(emp.hire_date)
                });
            } else {
                employeesSheet.addRow({
                    full_name: '',
                    phone: '',
                    job_title: '',
                    base_salary: '',
                    hire_date: ''
                });
            }
        }
        styleWorksheet(employeesSheet, employeesSheet.columns, 1001, [3]);

        // Write file
        await workbook.xlsx.writeFile(filePath);
        return { success: true };
    } catch (e) {
        console.error('[Excel Backup] Dynamic export failed:', e);
        return { success: false, error: e.message };
    }
}

module.exports = {
    exportToExcel
};
