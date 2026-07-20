const mongoose = require('mongoose');

const UserPermissionSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    user_id: { type: Number, required: true },
    module: { type: String, required: true },
    can_view: { type: Boolean, default: false },
    can_create: { type: Boolean, default: false },
    can_edit: { type: Boolean, default: false },
    can_delete: { type: Boolean, default: false }
});
const UserPermission = mongoose.model('UserPermission', UserPermissionSchema);

module.exports = UserPermission;
