const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    user_id: Number,
    user_name: { type: String, required: true },
    action: { type: String, required: true },
    module: { type: String, required: true },
    entity_id: Number,
    entity_ref: String,
    created_at: { type: Date, default: Date.now }
});
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);

module.exports = ActivityLog;
