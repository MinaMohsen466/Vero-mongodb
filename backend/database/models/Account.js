const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    code: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    parent_id: Number,
    account_type: { type: String, required: true },
    nature: { type: String, required: true },
    balance: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    can_post: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now }
});
const Account = mongoose.model('Account', AccountSchema);

module.exports = Account;
