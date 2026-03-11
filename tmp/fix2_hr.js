const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'mmake', 'Desktop', 'Vero', 'src', 'pages', 'HR.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const rAll = (s, r) => { content = content.replaceAll(s, r); };

rAll("toast.success('تمت t(\\'add\\') || \\'Add\\' الخصم بنجاح');", "toast.success(t('hr_deduction_added') || 'Deduction added successfully');");
rAll("<Plus size={18} /> t('add') || 'Add' خصم", "<Plus size={18} /> {t('hr_add_deduction') || 'Add Deduction'}");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed additional JSX syntax!');
