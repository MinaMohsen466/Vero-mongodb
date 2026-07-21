const fetch = globalThis.fetch;

module.exports = function(ipcMain, context) {
    const { db, logActivity } = context;

    ipcMain.handle('ai:chat', async (event, { message, history, contextInfo, imageData }) => {
        try {
            // 0. Check DB connection status
            if (db && !db.isConnected) {
                return {
                    success: false,
                    error: 'تعذر الاتصال بقاعدة البيانات (MongoDB). يرجى التأكد من تشغيل خادم قاعدة البيانات أو مراجعة رابط الاتصال في صفحة الإعدادات.'
                };
            }

            // 1. Get AI settings from DB
            let isEnabled, apiKey;
            try {
                isEnabled = await db.settings.get('enable_ai_assistant');
                apiKey = await db.settings.get('gemini_api_key');
            } catch (dbErr) {
                return {
                    success: false,
                    error: `تعذر الاتصال بقاعدة البيانات (MongoDB): ${dbErr.message}. يرجى التحقق من تشغيل قاعدة البيانات أو تغيير رابط الاتصال من الإعدادات.`
                };
            }

            if (isEnabled !== 'yes') {
                return { success: false, error: 'المساعد الذكي غير مفعّل حالياً من الإعدادات.' };
            }
            if (!apiKey) {
                return { success: false, error: 'لم يتم إعداد مفتاح Gemini API Key في صفحة الإعدادات.' };
            }

            // 2. Determine current user and permissions
            const user = context.currentUser || { username: 'guest', role: 'guest', permissions: {} };
            const isAdmin = user.role === 'admin';
            const userPerms = user.permissions || {};

            if (!isAdmin && userPerms.ai_assistant?.can_view !== true) {
                return { success: false, error: 'عذراً، لا تمتلك صلاحية استخدام المساعد الذكي.' };
            }

            // 3. Prepare module permissions summary for AI system instruction
            const productsPerm = userPerms.products || { can_view: false, can_create: false, can_edit: false, can_delete: false };
            const customersPerm = userPerms.customers || { can_view: false, can_create: false, can_edit: false, can_delete: false };
            const suppliersPerm = userPerms.suppliers || { can_view: false, can_create: false, can_edit: false, can_delete: false };
            const hrPerm = userPerms.hr || { can_view: false, can_create: false, can_edit: false, can_delete: false };

            const permSummary = `
User Name: ${user.full_name || user.username}
User Role: ${user.role}
Permissions Summary:
- Products: View: ${isAdmin || productsPerm.can_view}, Create: ${isAdmin || productsPerm.can_create}, Edit: ${isAdmin || productsPerm.can_edit}, Delete: ${isAdmin || productsPerm.can_delete}
- Customers: View: ${isAdmin || customersPerm.can_view}, Create: ${isAdmin || customersPerm.can_create}, Edit: ${isAdmin || customersPerm.can_edit}, Delete: ${isAdmin || customersPerm.can_delete}
- Suppliers: View: ${isAdmin || suppliersPerm.can_view}, Create: ${isAdmin || suppliersPerm.can_create}, Edit: ${isAdmin || suppliersPerm.can_edit}, Delete: ${isAdmin || suppliersPerm.can_delete}
- Employees/HR: View: ${isAdmin || hrPerm.can_view}, Create: ${isAdmin || hrPerm.can_create}, Edit: ${isAdmin || hrPerm.can_edit}, Delete: ${isAdmin || hrPerm.can_delete}
`;

            // Fetch products mapping to resolve IDs
            let productsSummary = [];
            if (isAdmin || productsPerm.can_view) {
                try {
                    const allProducts = await db.products.getAll();
                    productsSummary = (allProducts || []).map(p => ({
                        id: p.id,
                        code: p.code,
                        name: p.name,
                        purchase_price: p.purchase_price,
                        sale_price: p.sale_price
                    }));
                } catch (e) {
                    console.error("Error fetching products for AI prompt:", e);
                }
            }

            // Fetch customers mapping to resolve IDs
            let customersSummary = [];
            if (isAdmin || customersPerm.can_view) {
                try {
                    const allCustomers = await db.customers.getAll();
                    customersSummary = (allCustomers || []).map(c => ({
                        id: c.id,
                        name: c.name,
                        phone: c.phone
                    }));
                } catch (e) {
                    console.error("Error fetching customers for AI prompt:", e);
                }
            }

            // Fetch suppliers mapping to resolve IDs
            let suppliersSummary = [];
            if (isAdmin || suppliersPerm.can_view) {
                try {
                    const allSuppliers = await db.suppliers.getAll();
                    suppliersSummary = (allSuppliers || []).map(s => ({
                        id: s.id,
                        name: s.name,
                        phone: s.phone
                    }));
                } catch (e) {
                    console.error("Error fetching suppliers for AI prompt:", e);
                }
            }

            // Fetch employees mapping to resolve IDs
            let employeesSummary = [];
            if (isAdmin || hrPerm.can_view) {
                try {
                    const allEmployees = await db.employees.getAll();
                    employeesSummary = (allEmployees || []).map(emp => ({
                        id: emp.id,
                        name: emp.name,
                        position: emp.position
                    }));
                } catch (e) {
                    console.error("Error fetching employees for AI prompt:", e);
                }
            }

            // 4. Construct System Instructions
            const systemPrompt = `
You are the official AI Assistant for the "Vero DB" retail ERP & warehouse management desktop application.
Your goal is to assist the logged-in user in managing the app, answering their questions, and proposing changes (such as creating, updating, or deleting products, customers, suppliers, and employees).

Security and Authorization Rules:
1. YOU MUST CHECK the user permissions listed below.
2. If the user asks to perform an action (like editing, adding, or deleting a product, customer, supplier, or employee) and they do NOT have permission for it, you MUST refuse and state that their access permissions do not allow this action. Do not generate a command action for it.
3. If they ask for information they cannot view, refuse to show it.

Here are the details of the current logged-in user:
${permSummary}

Available Products in the Database (Use these IDs for updates/deletions. Match by code or name):
${JSON.stringify(productsSummary, null, 2)}

Available Customers in the Database (Use these IDs for updates/deletions. Match by name or phone):
${JSON.stringify(customersSummary, null, 2)}

Available Suppliers in the Database (Use these IDs for updates/deletions. Match by name or phone):
${JSON.stringify(suppliersSummary, null, 2)}

Available Employees in the Database (Use these IDs for updates/deletions. Match by name or position):
${JSON.stringify(employeesSummary, null, 2)}

Current Screen/App Context:
${JSON.stringify(contextInfo || {}, null, 2)}

Proposed Actions format:
If you want to perform database modifications that the user requested, and the user HAS permission, you can propose one or more actions by adding an "actions" array in the JSON response.
Supported actions:
1. type: "products:create", payload: { name: string, code: string, description?: string, unit?: string, purchase_price?: number, sale_price?: number, shop_stock?: number, min_stock?: number, category?: string }
2. type: "products:update", payload: { id: number, name?: string, code?: string, description?: string, unit?: string, purchase_price?: number, sale_price?: number, shop_stock?: number, min_stock?: number, category?: string }
3. type: "products:delete", payload: { id: number }

4. type: "customers:create", payload: { name: string, phone?: string, email?: string, address?: string, balance?: number }
5. type: "customers:update", payload: { id: number, name?: string, phone?: string, email?: string, address?: string, balance?: number }
6. type: "customers:delete", payload: { id: number }

7. type: "suppliers:create", payload: { name: string, phone?: string, email?: string, address?: string, balance?: number }
8. type: "suppliers:update", payload: { id: number, name?: string, phone?: string, email?: string, address?: string, balance?: number }
9. type: "suppliers:delete", payload: { id: number }

10. type: "employees:create", payload: { name: string, position: string, phone?: string, email?: string, salary: number, hire_date?: string }
11. type: "employees:update", payload: { id: number, name?: string, position?: string, phone?: string, email?: string, salary?: number, hire_date?: string }
12. type: "employees:delete", payload: { id: number }

Response format:
You MUST respond with a valid JSON object only. Do not wrap it in markdown code blocks like \`\`\`json.
JSON Structure:
{
  "reply": "Your friendly response to the user in their language (Arabic or English, matching their preference). Make it professional and helpful.",
  "actions": null or [
    { "type": "action_type", "payload": { ... } }
  ]
}
`;

            // 5. Build contents array for Gemini
            // Map chat history to Gemini format (role: user/model, parts: [{text}])
            const contents = [];
            
            // Add history if present
            if (Array.isArray(history)) {
                for (const h of history) {
                    const parts = [{ text: h.content || '' }];
                    if (h.image && h.image.base64 && h.image.mimeType) {
                        const cleanBase64 = h.image.base64.replace(/^data:image\/\w+;base64,/, "");
                        parts.push({
                            inlineData: {
                                mimeType: h.image.mimeType,
                                data: cleanBase64
                            }
                        });
                    }
                    contents.push({
                        role: h.role === 'user' ? 'user' : 'model',
                        parts
                    });
                }
            }

            // Append current user message
            const userParts = [{ text: message }];
            if (imageData && imageData.base64 && imageData.mimeType) {
                const cleanBase64 = imageData.base64.replace(/^data:image\/\w+;base64,/, "");
                userParts.push({
                    inlineData: {
                        mimeType: imageData.mimeType,
                        data: cleanBase64
                    }
                });
            }
            contents.push({
                role: 'user',
                parts: userParts
            });

            // 6. Call Gemini API
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents,
                    systemInstruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    generationConfig: {
                        responseMimeType: 'application/json'
                    }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error("Gemini API HTTP Error:", errText);
                return { success: false, error: `فشل الاتصال بخادم الذكاء الاصطناعي (رمز الخطأ: ${response.status})` };
            }

            const data = await response.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textResponse) {
                return { success: false, error: 'لم يصل رد صالح من خادم الذكاء الاصطناعي.' };
            }

            // Parse response
            let reply = textResponse.trim();
            let actions = null;
            try {
                const parsed = JSON.parse(textResponse.trim());
                reply = parsed.reply;
                if (Array.isArray(parsed.actions)) {
                    actions = parsed.actions;
                } else if (parsed.action && typeof parsed.action === 'object') {
                    actions = [parsed.action];
                }
            } catch (e) {
                // Fall back to raw text response
            }

            return { success: true, reply, actions };

        } catch (error) {
            console.error("AI IPC Error:", error);
            const isConnError = error.message && (
                error.message.includes('ECONNREFUSED') || 
                error.message.includes('connect ECONNREFUSED') || 
                error.message.includes('buffering timed out')
            );
            if (isConnError) {
                return { 
                    success: false, 
                    error: `تعذر الاتصال بقاعدة البيانات (MongoDB). يرجى التأكد من تشغيل خادم قاعدة البيانات أو مراجعة إعدادات الاتصال من صفحة الإعدادات.\n(${error.message})` 
                };
            }
            return { success: false, error: `حدث خطأ أثناء معالجة الطلب: ${error.message}` };
        }
    });
};
