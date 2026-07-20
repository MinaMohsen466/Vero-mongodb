const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
    key: { type: String, unique: true, required: true },
    value: String,
    category: { type: String, default: 'general' }
});
const Setting = mongoose.model('Setting', SettingSchema);

module.exports = Setting;
