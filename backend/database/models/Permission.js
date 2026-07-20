const mongoose = require('mongoose');

const PermissionSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    role: { type: String, required: true },
    module: { type: String, required: true },
    can_view: { type: Boolean, default: false },
    can_create: { type: Boolean, default: false },
    can_edit: { type: Boolean, default: false },
    can_delete: { type: Boolean, default: false }
});
const Permission = mongoose.model('Permission', PermissionSchema);

module.exports = Permission;
