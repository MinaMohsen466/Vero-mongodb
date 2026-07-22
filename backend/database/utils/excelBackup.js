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
        readmeSheet.columns = [{ width: 95 }];

        const readmeTitleRow = readmeSheet.addRow(['دليل استخدام برنامج الأرشيف والمخزون المصغر المتقدم (Excel)']);
        readmeTitleRow.height = 38;
        const titleCell = readmeTitleRow.getCell(1);
        titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF107C41' } }; // Excel Green
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        readmeSheet.addRow([]); // Spacing

        const instructions = [
            'مرحباً بك في برنامج المخزون والمبيعات المصغر المتقدم والاحتياطي الخاص بك في Excel.',
            'تم تصميم هذا الملف ليخدمك كـ "برنامج مصغر" وسهل الاستخدام تماماً لإضافة مبيعات ومشتريات ومراقبة المخزون والخزينة والمديونيات.',
            'يرجى ملاحظة أن هذا الملف مخصص للاستعراض والاستخدام الخارجي المباشر.',
            '',
            'مزايا وترتيب الأعمدة المحدث في برنامج Excel المصغر المطور:',
            '1. الترتيب الجديد لأعمدة المبيعات والمشتريات:',
            '   - [كود المنتج] -> [اسم المنتج] -> [الكمية] -> [السعر] -> [الإجمالي] -> [المبلغ النقدي] -> [المبلغ الآجل] -> [العميل/المورد] -> [حالة الدفع] -> [التاريخ] -> [الملاحظات].',
            '   - يتم استنتاج كود المنتج وسعره واسمه تلقائياً بمجرد إدخال الكود أو الاسم.',
            '',
            '2. العميل افتراضي "عميل نقدي" والتكرار التلقائي للأسماء:',
            '   - عند إدخال أي منتج، ينزل اسم "عميل نقدي" تلقائياً ما لم يتم اختيار اسم عميل آخر.',
            '   - عند اختيار عميل جديد، يتكرر اسمه تلقائياً في الأسطر التالية لتسهيل إدخال عدة منتجات لنفس العميل.',
            '',
            '3. حقل "حالة الدفع" (مدفوع / أجل) والتفريق بين الخزينة والمديونية:',
            '   - "مدفوع" يرحل المبلغ فورياً إلى الخزينة، بينما "أجل" يرحل المبلغ إلى مديونية العميل أو المورد دون خصم نقدية.',
            '',
            '4. التسميع الآلي للرصيد الافتتاحي وكشوف الحسابات:',
            '   - يتم نقل رصيد المديونية الحالي من البرنامج تلقائياً ليكون هو الرصيد الافتتاحي في شيت الإكسيل عند البدء من جديد.'
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
        const vouchers = includeData ? (await db.collections.vouchers?.find({}).lean() || []) : [];
        const returns = includeData ? (await db.collections.returns?.find({}).lean() || []) : [];

        // Ensure default Cash customer & Supplier exist in lists for dropdown lookup
        let hasCashCust = customers.some(c => c.name === 'عميل نقدي' || c.code === 'CUST-CASH');
        if (!hasCashCust) {
            customers.unshift({ id: 'CUST-CASH', code: 'CUST-CASH', name: 'عميل نقدي', phone: '', opening_balance: 0, balance: 0 });
        }
        let hasGenSupp = suppliers.some(s => s.name === 'مورد عام' || s.code === 'SUPP-GEN');
        if (!hasGenSupp) {
            suppliers.unshift({ id: 'SUPP-GEN', code: 'SUPP-GEN', name: 'مورد عام', phone: '', opening_balance: 0, balance: 0 });
        }

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
            productCodeMap[String(p.id)] = code;
            productMap[p.id] = p;
            productMap[String(p.id)] = p;
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
                        if (pId) dbPurchasedQty[String(pId)] = (dbPurchasedQty[String(pId)] || 0) + qty;
                    } else if (inv.type === 'sales') {
                        dbSoldQty[pId] = (dbSoldQty[pId] || 0) + qty;
                        if (pId) dbSoldQty[String(pId)] = (dbSoldQty[String(pId)] || 0) + qty;
                    }
                });
            }
        });

        // --- 2. Dashboard Worksheet (لوحة التقارير والتحليلات) ---
        const dashboardSheet = workbook.addWorksheet('لوحة التقارير');
        dashboardSheet.views = [{ rightToLeft: true }];
        dashboardSheet.columns = [
            { header: 'المؤشر المالي / KPI', key: 'kpi', width: 34 },
            { header: 'المبلغ / القيمة الحالية', key: 'value', width: 22 },
            { header: 'التوضيح', key: 'desc', width: 48 }
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

        // KPI Rows data & formulas (Referencing updated columns: E=Total, F=Cash, G=Credit)
        const kpiRows = [
            { kpi: 'إجمالي المبيعات النقدية (الخزينة)', val: { formula: "=IFERROR(SUM(المبيعات!F3:F20002), 0)" }, desc: 'مجموع النقدية المحصلة بالدرج من المبيعات المدفوعة' },
            { kpi: 'إجمالي المبيعات الآجلة (ديون العملاء)', val: { formula: "=IFERROR(SUM(المبيعات!G3:G20002), 0)" }, desc: 'مجموع المبيعات الآجلة المستحقة على العملاء' },
            { kpi: 'إجمالي المبيعات الكلية', val: { formula: "=IFERROR(SUM(المبيعات!E3:E20002), 0)" }, desc: 'إجمالي قيمة جميع فواتير البيع (نقدي + أجل)' },
            { kpi: 'إجمالي المشتريات النقدية (الخزينة)', val: { formula: "=IFERROR(SUM(المشتريات!F3:F20002), 0)" }, desc: 'مجموع النقدية المدفوعة للمشتريات من الخزينة' },
            { kpi: 'إجمالي المشتريات الآجلة (مستحقات الموردين)', val: { formula: "=IFERROR(SUM(المشتريات!G3:G20002), 0)" }, desc: 'مجموع المشتريات الآجلة المستحقة للموردين' },
            { kpi: 'إجمالي المشتريات الكلية', val: { formula: "=IFERROR(SUM(المشتريات!E3:E20002), 0)" }, desc: 'إجمالي قيمة جميع فواتير الشراء (نقدي + أجل)' },
            { kpi: 'رصيد النقدية الحالي بالدرج (الخزينة)', val: { formula: "=IFERROR(B2-B5-B10, 0)" }, desc: 'النقدية الفعلية المتاحة في الخزينة (المبيعات النقدية - المشتريات النقدية - المصروفات)' },
            { kpi: 'صافي الأرباح التشغيلية', val: { formula: "=IFERROR(B4-B7, 0)" }, desc: 'الأرباح التشغيلية المباشرة (إجمالي المبيعات - إجمالي المشتريات)' },
            { kpi: 'إجمالي المصروفات العامة', val: { formula: "=IFERROR(SUM(المصروفات!D3:D5002), 0)" }, desc: 'مجموع المصروفات الإدارية والعمومية والرواتب' },
            { kpi: 'صافي الربح النهائي', val: { formula: "=IFERROR(B8-B9, 0)" }, desc: 'الربح الصافي بعد خصم المصروفات العمومية' },
            { kpi: 'إجمالي قيمة المخزون الحالي', val: { formula: "=IFERROR(SUM(المنتجات!L3:L5002), 0)" }, desc: 'القيمة المالية الإجمالية للبضاعة المتاحة في المخازن' },
            { kpi: 'إجمالي مديونيات العملاء الآجلة', val: { formula: "=IFERROR(SUM(العملاء!H3:H5002), 0)" }, desc: 'إجمالي المبالغ المطلوبة من العملاء (الرصيد الافتتاحي + الآجل)' },
            { kpi: 'إجمالي مستحقات الموردين الآجلة', val: { formula: "=IFERROR(SUM(الموردين!H3:H5002), 0)" }, desc: 'إجمالي المبالغ المستحقة للموردين (الرصيد الافتتاحي + الآجل)' },
            { kpi: 'إجمالي عدد المنتجات المسجلة', val: { formula: "=IFERROR(COUNTIF(المنتجات!B3:B5002, \"?*\"), 0)" }, desc: 'عدد الأصناف المعرفة والمسجلة في ورقة المنتجات' },
            { kpi: 'إجمالي عدد العملاء', val: { formula: "=IFERROR(COUNTIF(العملاء!B3:B5002, \"?*\"), 0)" }, desc: 'عدد العملاء المسجلين في ورقة العملاء' },
            { kpi: 'إجمالي عدد الموردين', val: { formula: "=IFERROR(COUNTIF(الموردين!B3:B5002, \"?*\"), 0)" }, desc: 'عدد الموردين المسجلين في ورقة الموردين' },
            { kpi: 'متوسط قيمة الحركة/الفاتورة', val: { formula: "=IFERROR(AVERAGEIF(المبيعات!E3:E20002, \">0\"), 0)" }, desc: 'متوسط قيم فواتير المبيعات' }
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

            const isCountRow = rNum >= 15 && rNum <= 17;
            cellVal.font = { name: 'Arial', size: 11, bold: true, color: { argb: (rNum === 8 || rNum === 11) ? 'FF107C41' : (rNum === 12 || rNum === 13 ? 'FFC00000' : 'FF000000') } };
            cellVal.border = EXCEL_BORDER;
            cellVal.alignment = { horizontal: 'center', vertical: 'middle' };
            if (!isCountRow) {
                cellVal.numFmt = '#,##0.00';
            } else {
                cellVal.numFmt = '#,##0';
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

        // Row 2: Example/Instruction row (In Sales/Purchases: A=Product Code, C=Quantity)
        productsSheet.addRow({
            code: 'مثال: P-100',
            name: 'مثال: منتج تجريبي',
            description: 'مثال: وصف الصنف',
            unit: 'مثال: قطعة',
            category: 'مثال: عام',
            purchase_price: 10,
            sale_price: 15,
            initial_stock: 100,
            purchased_qty: { formula: `=IFERROR(IF(A2="","",SUMIF(المشتريات!A:A,A2,المشتريات!C:C)),0)`, result: 0 },
            sold_qty: { formula: `=IFERROR(IF(A2="","",SUMIF(المبيعات!A:A,A2,المبيعات!C:C)),0)`, result: 0 },
            current_stock: { formula: `=IFERROR(IF(A2="","",N(H2)+N(I2)-N(J2)),100)`, result: 100 },
            stock_value: { formula: `=IFERROR(IF(A2="","",N(F2)*N(K2)),1000)`, result: 1000 }
        });

        // Rows 3 to 1002: Products data + empty rows
        for (let idx = 0; idx < 1000; idx++) {
            const rowNum = idx + 3;
            const p = products[idx];

            if (p) {
                const purchasedInDb = dbPurchasedQty[p.id] || dbPurchasedQty[String(p.id)] || 0;
                const soldInDb = dbSoldQty[p.id] || dbSoldQty[String(p.id)] || 0;
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
                        formula: `=IFERROR(IF(A${rowNum}="","",SUMIF(المشتريات!A:A, A${rowNum}, المشتريات!C:C)), 0)`,
                        result: purchasedInDb
                    },
                    sold_qty: {
                        formula: `=IFERROR(IF(A${rowNum}="","",SUMIF(المبيعات!A:A, A${rowNum}, المبيعات!C:C)), 0)`,
                        result: soldInDb
                    },
                    current_stock: {
                        formula: `=IFERROR(IF(A${rowNum}="","",N(H${rowNum})+N(I${rowNum})-N(J${rowNum})), 0)`,
                        result: p.stock_quantity || 0
                    },
                    stock_value: {
                        formula: `=IFERROR(IF(A${rowNum}="","",N(F${rowNum})*N(K${rowNum})), 0)`,
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
                    purchased_qty: { formula: `=IFERROR(IF(A${rowNum}="","",SUMIF(المشتريات!A:A, A${rowNum}, المشتريات!C:C)), "")` },
                    sold_qty: { formula: `=IFERROR(IF(A${rowNum}="","",SUMIF(المبيعات!A:A, A${rowNum}, المبيعات!C:C)), "")` },
                    current_stock: { formula: `=IFERROR(IF(A${rowNum}="","",N(H${rowNum})+N(I${rowNum})-N(J${rowNum})), "")` },
                    stock_value: { formula: `=IFERROR(IF(A${rowNum}="","",N(F${rowNum})*N(K${rowNum})), "")` }
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
            { header: 'المبيعات النقدية', key: 'cash_sales', width: 16 },
            { header: 'المبيعات الآجلة', key: 'credit_sales', width: 16 },
            { header: 'إجمالي الفواتير', key: 'total_sales', width: 16 },
            { header: 'الرصيد الحالي (المديونية)', key: 'balance', width: 22 }
        ];

        // Row 2: Example/Instruction row (In Sales: Customer is Column H, Cash is F, Credit is G)
        customersSheet.addRow({
            code: 'CUST-CASH',
            name: 'عميل نقدي',
            phone: '0000000',
            opening_balance: 0,
            cash_sales: { formula: `=IFERROR(IF(A2="","",SUMIF(المبيعات!H3:H20002, B2, المبيعات!F3:F20002)),0)`, result: 0 },
            credit_sales: { formula: `=IFERROR(IF(A2="","",SUMIF(المبيعات!H3:H20002, B2, المبيعات!G3:G20002)),0)`, result: 0 },
            total_sales: { formula: `=IFERROR(IF(A2="","",N(E2)+N(F2)),0)`, result: 0 },
            balance: { formula: `=IFERROR(IF(A2="","",N(D2)+N(F2)),0)`, result: 0 }
        });

        // Rows 3 to 5002
        for (let idx = 0; idx < 5000; idx++) {
            const rowNum = idx + 3;
            const c = customers[idx];

            if (c) {
                const custId = c.id;
                const rawOp = parseFloat(c.opening_balance) || 0;
                const custInvoices = invoices.filter(inv => inv.customer_id === custId && inv.type === 'sales');
                const totalInvoices = custInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
                const custVouchers = vouchers.filter(v => v.customer_id === custId && v.type === 'receipt');
                const totalVouchers = custVouchers.reduce((sum, v) => sum + (v.amount || 0), 0);
                const custReturns = returns.filter(r => r.customer_id === custId && r.type === 'sales_return');
                let netReturnsCredit = 0;
                custReturns.forEach(r => { if (r.payment_method === 'credit') netReturnsCredit += (r.total || 0); });

                const computedLiveBalance = rawOp + totalInvoices - totalVouchers - netReturnsCredit;
                const finalBalance = (c.balance !== undefined && c.balance !== null) ? c.balance : computedLiveBalance;
                const exportOpeningBalance = finalBalance;

                const cDisplay = (c.name === 'عميل نقدي' || c.code === 'CUST-CASH') ? 'عميل نقدي' : `${c.name} (${c.code || `CUST-${c.id}`})`;

                customersSheet.addRow({
                    code: c.code || `CUST-${c.id}`,
                    name: cDisplay,
                    phone: c.phone || '',
                    opening_balance: exportOpeningBalance,
                    cash_sales: {
                        formula: `=IFERROR(IF(A${rowNum}="","",SUMIF(المبيعات!H3:H20002, B${rowNum}, المبيعات!F3:F20002)),0)`,
                        result: 0
                    },
                    credit_sales: {
                        formula: `=IFERROR(IF(A${rowNum}="","",SUMIF(المبيعات!H3:H20002, B${rowNum}, المبيعات!G3:G20002)),0)`,
                        result: 0
                    },
                    total_sales: {
                        formula: `=IFERROR(IF(A${rowNum}="","",N(E${rowNum})+N(F${rowNum})),0)`,
                        result: 0
                    },
                    balance: {
                        formula: `=IFERROR(IF(A${rowNum}="","",N(D${rowNum})+N(F${rowNum})),0)`,
                        result: finalBalance
                    }
                });
            } else {
                customersSheet.addRow({
                    code: { formula: `=IF(B${rowNum}="","","C"&TEXT(ROW()-2,"0000"))` },
                    name: '',
                    phone: '',
                    opening_balance: '',
                    cash_sales: { formula: `=IFERROR(IF(A${rowNum}="","",SUMIF(المبيعات!H3:H20002, B${rowNum}, المبيعات!F3:F20002)),"")` },
                    credit_sales: { formula: `=IFERROR(IF(A${rowNum}="","",SUMIF(المبيعات!H3:H20002, B${rowNum}, المبيعات!G3:G20002)),"")` },
                    total_sales: { formula: `=IFERROR(IF(A${rowNum}="","",N(E${rowNum})+N(F${rowNum})),"")` },
                    balance: { formula: `=IFERROR(IF(A${rowNum}="","",N(D${rowNum})+N(F${rowNum})),"")` }
                });
            }
        }
        styleWorksheet(customersSheet, customersSheet.columns, 5001, [3, 4, 5, 6, 7]);

        // --- 5. Suppliers Sheet (الموردين) ---
        const suppliersSheet = workbook.addWorksheet('الموردين');
        suppliersSheet.columns = [
            { header: 'كود المورد', key: 'code', width: 18 },
            { header: 'الاسم', key: 'name', width: 26 },
            { header: 'الهاتف', key: 'phone', width: 16 },
            { header: 'الرصيد الافتتاحي', key: 'opening_balance', width: 16 },
            { header: 'المشتريات النقدية', key: 'cash_purchases', width: 16 },
            { header: 'المشتريات الآجلة', key: 'credit_purchases', width: 16 },
            { header: 'إجمالي الفواتير', key: 'total_purchases', width: 16 },
            { header: 'الرصيد الحالي (مستحق للمورد)', key: 'balance', width: 22 }
        ];

        // Row 2: Example/Instruction row
        suppliersSheet.addRow({
            code: 'SUPP-GEN',
            name: 'مورد عام',
            phone: '0000000',
            opening_balance: 0,
            cash_purchases: { formula: `=IFERROR(IF(A2="","",SUMIF(المشتريات!H3:H20002, B2, المشتريات!F3:F20002)),0)`, result: 0 },
            credit_purchases: { formula: `=IFERROR(IF(A2="","",SUMIF(المشتريات!H3:H20002, B2, المشتريات!G3:G20002)),0)`, result: 0 },
            total_purchases: { formula: `=IFERROR(IF(A2="","",N(E2)+N(F2)),0)`, result: 0 },
            balance: { formula: `=IFERROR(IF(A2="","",N(D2)+N(F2)),0)`, result: 0 }
        });

        // Rows 3 to 5002
        for (let idx = 0; idx < 5000; idx++) {
            const rowNum = idx + 3;
            const s = suppliers[idx];

            if (s) {
                const suppId = s.id;
                const rawOp = parseFloat(s.opening_balance) || 0;
                const suppInvoices = invoices.filter(inv => inv.supplier_id === suppId && inv.type === 'purchase');
                const totalInvoices = suppInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
                const suppVouchers = vouchers.filter(v => v.supplier_id === suppId && v.type === 'payment');
                const totalVouchers = suppVouchers.reduce((sum, v) => sum + (v.amount || 0), 0);
                const suppReturns = returns.filter(r => r.supplier_id === suppId && r.type === 'purchase_return');
                let netReturnsCredit = 0;
                suppReturns.forEach(r => { if (r.payment_method === 'credit') netReturnsCredit += (r.total || 0); });

                const computedLiveBalance = rawOp + totalInvoices - totalVouchers - netReturnsCredit;
                const finalBalance = (s.balance !== undefined && s.balance !== null) ? s.balance : computedLiveBalance;
                const exportOpeningBalance = finalBalance;

                const sDisplay = (s.name === 'مورد عام' || s.code === 'SUPP-GEN') ? 'مورد عام' : `${s.name} (${s.code || `SUPP-${s.id}`})`;

                suppliersSheet.addRow({
                    code: s.code || `SUPP-${s.id}`,
                    name: sDisplay,
                    phone: s.phone || '',
                    opening_balance: exportOpeningBalance,
                    cash_purchases: {
                        formula: `=IFERROR(IF(A${rowNum}="","",SUMIF(المشتريات!H3:H20002, B${rowNum}, المشتريات!F3:F20002)),0)`,
                        result: 0
                    },
                    credit_purchases: {
                        formula: `=IFERROR(IF(A${rowNum}="","",SUMIF(المشتريات!H3:H20002, B${rowNum}, المشتريات!G3:G20002)),0)`,
                        result: 0
                    },
                    total_purchases: {
                        formula: `=IFERROR(IF(A${rowNum}="","",N(E${rowNum})+N(F${rowNum})),0)`,
                        result: 0
                    },
                    balance: {
                        formula: `=IFERROR(IF(A${rowNum}="","",N(D${rowNum})+N(F${rowNum})),0)`,
                        result: finalBalance
                    }
                });
            } else {
                suppliersSheet.addRow({
                    code: { formula: `=IF(B${rowNum}="","","S"&TEXT(ROW()-2,"0000"))` },
                    name: '',
                    phone: '',
                    opening_balance: '',
                    cash_purchases: { formula: `=IFERROR(IF(A${rowNum}="","",SUMIF(المشتريات!H3:H20002, B${rowNum}, المشتريات!F3:F20002)),"")` },
                    credit_purchases: { formula: `=IFERROR(IF(A${rowNum}="","",SUMIF(المشتريات!H3:H20002, B${rowNum}, المشتريات!G3:G20002)),"")` },
                    total_purchases: { formula: `=IFERROR(IF(A${rowNum}="","",N(E${rowNum})+N(F${rowNum})),"")` },
                    balance: { formula: `=IFERROR(IF(A${rowNum}="","",N(D${rowNum})+N(F${rowNum})),"")` }
                });
            }
        }
        styleWorksheet(suppliersSheet, suppliersSheet.columns, 5001, [3, 4, 5, 6, 7]);

        // Gather existing flat database items
        const dbSalesItems = [];
        const dbPurchasesItems = [];

        invoices.forEach(inv => {
            if (inv.items && inv.items.length > 0) {
                const isCredit = (inv.status === 'unpaid' || inv.status === 'credit');

                let rawNotes = (inv.invoice_number || '');
                if (inv.notes) {
                    let cleanNoteText = inv.notes;
                    if (inv.status !== 'written_off') {
                        cleanNoteText = cleanNoteText.replace(/\[?تم شطب\/إعدام مبلغ .*? كدين معدوم\]?/g, '').replace(/\[?تم شطب.*?\]?/g, '').trim();
                    }
                    if (cleanNoteText) rawNotes += ` - ${cleanNoteText}`;
                }

                inv.items.forEach(item => {
                    let pObj = productMap[item.product_id] || productMap[String(item.product_id)] || productMap[parseInt(item.product_id, 10)];
                    if (!pObj && item.product_id) {
                        pObj = products.find(p => String(p.id) === String(item.product_id) || p.code === item.product_code);
                    }
                    if (!pObj && item.product_code) {
                        pObj = products.find(p => p.code === item.product_code);
                    }
                    if (!pObj && (item.product_name || item.description || item.name)) {
                        const searchName = item.product_name || item.description || item.name;
                        pObj = products.find(p => p.name === searchName);
                    }

                    const productName = item.product_name || item.name || item.description || pObj?.name || (item.product_id ? `منتج #${item.product_id}` : '');
                    const productCode = productCodeMap[item.product_id] || productCodeMap[String(item.product_id)] || pObj?.code || item.product_code || item.code || '';

                    const rowData = {
                        date: formatDate(inv.date),
                        entityName: inv.type === 'sales' ? (customerMap[inv.customer_id] || 'عميل نقدي') : (supplierMap[inv.supplier_id] || 'مورد عام'),
                        entityId: inv.type === 'sales' ? inv.customer_id : inv.supplier_id,
                        productCode: productCode,
                        productName: productName,
                        quantity: item.quantity || 0,
                        unitPrice: item.unit_price || item.price || pObj?.sale_price || 0,
                        paymentStatus: isCredit ? 'أجل' : 'مدفوع',
                        notes: rawNotes
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
        // Column Order requested: Product Code, Product Name, Qty, Sale Price, Total, Cash, Credit, Customer, Payment Status, Date, Notes
        const salesSheet = workbook.addWorksheet('المبيعات');
        salesSheet.views = [{ rightToLeft: true }];
        salesSheet.columns = [
            { header: 'كود المنتج', key: 'product_code', width: 18 },
            { header: 'اسم المنتج', key: 'product_name', width: 24 },
            { header: 'الكمية المباعة', key: 'quantity', width: 14 },
            { header: 'سعر البيع', key: 'sale_price', width: 14 },
            { header: 'الإجمالي', key: 'total', width: 16 },
            { header: 'المبلغ النقدي (الخزينة)', key: 'cash_amount', width: 18 },
            { header: 'المبلغ الآجل (المديونية)', key: 'credit_amount', width: 18 },
            { header: 'العميل', key: 'customer_name', width: 28 },
            { header: 'حالة الدفع', key: 'payment_status', width: 14 },
            { header: 'التاريخ', key: 'date', width: 16 },
            { header: 'ملاحظات', key: 'notes', width: 32 }
        ];

        // Row 2: Example/Instruction row
        salesSheet.addRow({
            product_code: 'P0001',
            product_name: 'مثال: منتج تجريبي',
            quantity: 5,
            sale_price: 15,
            total: { formula: `=IF(OR(C2="",D2=""),"",C2*D2)`, result: 75 },
            cash_amount: { formula: `=IF(OR(C2="",D2=""),"", IF(I2="أجل", 0, C2*D2))`, result: 75 },
            credit_amount: { formula: `=IF(OR(C2="",D2=""),"", IF(I2="أجل", C2*D2, 0))`, result: 0 },
            customer_name: 'عميل نقدي',
            payment_status: 'مدفوع',
            date: '2026-07-21',
            notes: 'مثال: ملاحظة بيع تجريبية'
        });

        // Rows 3 to 20002
        for (let idx = 0; idx < 20000; idx++) {
            const rowNum = idx + 3;
            const dbItem = dbSalesItems[idx];

            if (dbItem) {
                const cust = customers.find(c => c.name === dbItem.entityName || c.id === dbItem.entityId);
                const custLabel = cust ? ((cust.name === 'عميل نقدي' || cust.code === 'CUST-CASH') ? 'عميل نقدي' : `${cust.name} (${cust.code || `CUST-${cust.id}`})`) : (dbItem.entityName || 'عميل نقدي');
                const isCredit = dbItem.paymentStatus === 'أجل';
                const itemTotal = dbItem.quantity * dbItem.unitPrice;

                salesSheet.addRow({
                    product_code: dbItem.productCode || { formula: `=IF(B${rowNum}="","",IFERROR(INDEX(المنتجات!A:A,MATCH(B${rowNum},المنتجات!B:B,0)),""))` },
                    product_name: dbItem.productName || '',
                    quantity: dbItem.quantity,
                    sale_price: dbItem.unitPrice,
                    total: {
                        formula: `=IF(OR(C${rowNum}="",D${rowNum}=""),"",C${rowNum}*D${rowNum})`,
                        result: itemTotal
                    },
                    cash_amount: {
                        formula: `=IF(OR(C${rowNum}="",D${rowNum}=""),"", IF(I${rowNum}="أجل", 0, C${rowNum}*D${rowNum}))`,
                        result: isCredit ? 0 : itemTotal
                    },
                    credit_amount: {
                        formula: `=IF(OR(C${rowNum}="",D${rowNum}=""),"", IF(I${rowNum}="أجل", C${rowNum}*D${rowNum}, 0))`,
                        result: isCredit ? itemTotal : 0
                    },
                    customer_name: custLabel,
                    payment_status: dbItem.paymentStatus || 'مدفوع',
                    date: dbItem.date,
                    notes: dbItem.notes
                });
            } else {
                // Auto-fill customer: Row 3 defaults to 'عميل نقدي' or H2, subsequent rows inherit previous row's customer (H_{rowNum-1})
                const custFormula = rowNum === 3 
                    ? `=IF(B3<>"","عميل نقدي", "")`
                    : `=IF(B${rowNum}<>"", IF(H${rowNum-1}="","عميل نقدي", H${rowNum-1}), "")`;

                salesSheet.addRow({
                    product_code: { formula: `=IF(B${rowNum}="","",IFERROR(INDEX(المنتجات!A:A,MATCH(B${rowNum},المنتجات!B:B,0)),""))` },
                    product_name: '',
                    quantity: '',
                    sale_price: { formula: `=IF(B${rowNum}="","",IFERROR(VLOOKUP(B${rowNum},المنتجات!B:G,6,FALSE),0))` },
                    total: { formula: `=IF(OR(C${rowNum}="",D${rowNum}=""),"",C${rowNum}*D${rowNum})` },
                    cash_amount: { formula: `=IF(OR(C${rowNum}="",D${rowNum}=""),"", IF(I${rowNum}="أجل", 0, C${rowNum}*D${rowNum}))` },
                    credit_amount: { formula: `=IF(OR(C${rowNum}="",D${rowNum}=""),"", IF(I${rowNum}="أجل", C${rowNum}*D${rowNum}, 0))` },
                    customer_name: { formula: custFormula },
                    payment_status: 'مدفوع',
                    date: '',
                    notes: ''
                });
            }
        }
        styleWorksheet(salesSheet, salesSheet.columns, 20001, [2, 3, 4, 5, 6]);

        // Named Ranges: only cover rows with actual data
        const customerLastRow = Math.max(customers.length + 2, 3);
        const supplierLastRow = Math.max(suppliers.length + 2, 3);
        const productLastRow = Math.max(products.length + 2, 3);
        const employeeLastRow = Math.max(employees.length + 2, 3);

        // Define Named Ranges for cross-sheet validations
        workbook.definedNames.add(`العملاء!$B$3:$B$${customerLastRow}`, 'CustomerList');
        workbook.definedNames.add(`الموردين!$B$3:$B$${supplierLastRow}`, 'SupplierList');
        workbook.definedNames.add(`المنتجات!$B$3:$B$${productLastRow}`, 'ProductList');
        workbook.definedNames.add(`المنتجات!$A$3:$A$${productLastRow}`, 'ProductCodes');
        workbook.definedNames.add(`الموظفين!$A$3:$A$${employeeLastRow}`, 'EmployeeList');

        for (let r = 2; r <= 20002; r++) {
            const row = salesSheet.getRow(r);
            row.getCell(1).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: ['=ProductCodes']
            };
            row.getCell(2).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: ['=ProductList']
            };
            row.getCell(8).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: ['=CustomerList']
            };
            row.getCell(9).dataValidation = {
                type: 'list',
                allowBlank: false,
                formulae: ['"مدفوع,أجل"']
            };
        }

        // --- 7. Purchases Sheet (المشتريات) ---
        // Column Order requested: Product Code, Product Name, Qty, Purchase Price, Total, Cash, Credit, Supplier, Payment Status, Date, Notes
        const purchasesSheet = workbook.addWorksheet('المشتريات');
        purchasesSheet.views = [{ rightToLeft: true }];
        purchasesSheet.columns = [
            { header: 'كود المنتج', key: 'product_code', width: 18 },
            { header: 'اسم المنتج', key: 'product_name', width: 24 },
            { header: 'الكمية المشتراة', key: 'quantity', width: 14 },
            { header: 'سعر الشراء', key: 'purchase_price', width: 14 },
            { header: 'الإجمالي', key: 'total', width: 16 },
            { header: 'المبلغ النقدي (الخزينة)', key: 'cash_amount', width: 18 },
            { header: 'المبلغ الآجل (دائن للمورد)', key: 'credit_amount', width: 18 },
            { header: 'المورد', key: 'supplier_name', width: 28 },
            { header: 'حالة الدفع', key: 'payment_status', width: 14 },
            { header: 'التاريخ', key: 'date', width: 16 },
            { header: 'ملاحظات', key: 'notes', width: 32 }
        ];

        // Row 2: Example/Instruction row
        purchasesSheet.addRow({
            product_code: 'P0001',
            product_name: 'مثال: منتج تجريبي',
            quantity: 5,
            purchase_price: 10,
            total: { formula: `=IF(OR(C2="",D2=""),"",C2*D2)`, result: 50 },
            cash_amount: { formula: `=IF(OR(C2="",D2=""),"", IF(I2="أجل", 0, C2*D2))`, result: 50 },
            credit_amount: { formula: `=IF(OR(C2="",D2=""),"", IF(I2="أجل", C2*D2, 0))`, result: 0 },
            supplier_name: 'مورد عام',
            payment_status: 'مدفوع',
            date: '2026-07-21',
            notes: 'مثال: ملاحظة شراء تجريبية'
        });

        // Rows 3 to 20002
        for (let idx = 0; idx < 20000; idx++) {
            const rowNum = idx + 3;
            const dbItem = dbPurchasesItems[idx];

            if (dbItem) {
                const supp = suppliers.find(s => s.name === dbItem.entityName || s.id === dbItem.entityId);
                const suppLabel = supp ? ((supp.name === 'مورد عام' || supp.code === 'SUPP-GEN') ? 'مورد عام' : `${supp.name} (${supp.code || `SUPP-${supp.id}`})`) : (dbItem.entityName || 'مورد عام');
                const isCredit = dbItem.paymentStatus === 'أجل';
                const itemTotal = dbItem.quantity * dbItem.unitPrice;

                purchasesSheet.addRow({
                    product_code: dbItem.productCode || { formula: `=IF(B${rowNum}="","",IFERROR(INDEX(المنتجات!A:A,MATCH(B${rowNum},المنتجات!B:B,0)),""))` },
                    product_name: dbItem.productName || '',
                    quantity: dbItem.quantity,
                    purchase_price: dbItem.unitPrice,
                    total: {
                        formula: `=IF(OR(C${rowNum}="",D${rowNum}=""),"",C${rowNum}*D${rowNum})`,
                        result: itemTotal
                    },
                    cash_amount: {
                        formula: `=IF(OR(C${rowNum}="",D${rowNum}=""),"", IF(I${rowNum}="أجل", 0, C${rowNum}*D${rowNum}))`,
                        result: isCredit ? 0 : itemTotal
                    },
                    credit_amount: {
                        formula: `=IF(OR(C${rowNum}="",D${rowNum}=""),"", IF(I${rowNum}="أجل", C${rowNum}*D${rowNum}, 0))`,
                        result: isCredit ? itemTotal : 0
                    },
                    supplier_name: suppLabel,
                    payment_status: dbItem.paymentStatus || 'مدفوع',
                    date: dbItem.date,
                    notes: dbItem.notes
                });
            } else {
                // Auto-fill supplier: Row 3 defaults to 'مورد عام' or H2, subsequent rows inherit previous row's supplier (H_{rowNum-1})
                const suppFormula = rowNum === 3 
                    ? `=IF(B3<>"","مورد عام", "")`
                    : `=IF(B${rowNum}<>"", IF(H${rowNum-1}="","مورد عام", H${rowNum-1}), "")`;

                purchasesSheet.addRow({
                    product_code: { formula: `=IF(B${rowNum}="","",IFERROR(INDEX(المنتجات!A:A,MATCH(B${rowNum},المنتجات!B:B,0)),""))` },
                    product_name: '',
                    quantity: '',
                    purchase_price: { formula: `=IF(B${rowNum}="","",IFERROR(VLOOKUP(B${rowNum},المنتجات!B:F,5,FALSE),0))` },
                    total: { formula: `=IF(OR(C${rowNum}="",D${rowNum}=""),"",C${rowNum}*D${rowNum})` },
                    cash_amount: { formula: `=IF(OR(C${rowNum}="",D${rowNum}=""),"", IF(I${rowNum}="أجل", 0, C${rowNum}*D${rowNum}))` },
                    credit_amount: { formula: `=IF(OR(C${rowNum}="",D${rowNum}=""),"", IF(I${rowNum}="أجل", C${rowNum}*D${rowNum}, 0))` },
                    supplier_name: { formula: suppFormula },
                    payment_status: 'مدفوع',
                    date: '',
                    notes: ''
                });
            }
        }
        styleWorksheet(purchasesSheet, purchasesSheet.columns, 20001, [2, 3, 4, 5, 6]);

        // Add validations to Purchases Sheet
        for (let r = 2; r <= 20002; r++) {
            const row = purchasesSheet.getRow(r);
            row.getCell(1).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: ['=ProductCodes']
            };
            row.getCell(2).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: ['=ProductList']
            };
            row.getCell(8).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: ['=SupplierList']
            };
            row.getCell(9).dataValidation = {
                type: 'list',
                allowBlank: false,
                formulae: ['"مدفوع,أجل"']
            };
        }

        // --- 8. Expenses Sheet (المصروفات) ---
        const expensesSheet = workbook.addWorksheet('المصروفات');
        expensesSheet.columns = [
            { header: 'التاريخ', key: 'date', width: 16 },
            { header: 'تصنيف المصروف', key: 'category', width: 22 },
            { header: 'اسم الموظف (في حال الرواتب)', key: 'employee_name', width: 28 },
            { header: 'المبلغ', key: 'amount', width: 14 },
            { header: 'البيان/الوصف', key: 'description', width: 30 }
        ];

        // Row 2: Example/Instruction row
        expensesSheet.addRow({
            date: '2026-07-21',
            category: 'إيجار',
            employee_name: '',
            amount: 150,
            description: 'مثال: إيجار المكتب الشهري'
        });

        const CATEGORY_MAP = {
            'rent': 'إيجار',
            'salary': 'رواتب',
            'maintenance': 'صيانة',
            'hospitality': 'ضيافة',
            'utilities': 'كهرباء وماء',
            'bad_debt': 'ديون معدومة',
            'other': 'مصاريف أخرى'
        };

        // Rows 3 to 5002
        for (let idx = 0; idx < 5000; idx++) {
            const e = expenses[idx];
            if (e) {
                const catLabel = CATEGORY_MAP[e.category] || e.category || 'مصاريف أخرى';
                let empName = '';
                if (e.category === 'salary' || e.description?.includes('راتب')) {
                    if (e.description && e.description.includes('-')) {
                        empName = e.description.split('-')[0].replace(/راتب|Salary|الموظف:/gi, '').trim();
                    } else if (e.description) {
                        empName = e.description.replace(/راتب|Salary|الموظف:/gi, '').trim();
                    }
                }
                expensesSheet.addRow({
                    date: formatDate(e.date),
                    category: catLabel,
                    employee_name: empName,
                    amount: e.amount || 0,
                    description: e.description || ''
                });
            } else {
                expensesSheet.addRow({
                    date: '',
                    category: '',
                    employee_name: '',
                    amount: '',
                    description: ''
                });
            }
        }
        styleWorksheet(expensesSheet, expensesSheet.columns, 5001, [3]);

        // Add Data Validations to Expenses Sheet
        for (let r = 2; r <= 5002; r++) {
            const row = expensesSheet.getRow(r);
            row.getCell(2).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: ['"إيجار,رواتب,صيانة,ضيافة,كهرباء وماء,مصاريف أخرى,ديون معدومة"']
            };
            row.getCell(3).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: ['=EmployeeList']
            };
        }

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

        // Rows 3 to 5002
        for (let idx = 0; idx < 5000; idx++) {
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
        styleWorksheet(employeesSheet, employeesSheet.columns, 5001, [3]);

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

