const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    username: { type: String, unique: true, required: true },
    password_hash: { type: String, required: true },
    full_name: String,
    role: { type: String, default: 'user' },
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

module.exports = User;
