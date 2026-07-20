const mongoose = require('mongoose');

const DeletedRecordSchema = new mongoose.Schema({
    entity_type: { type: String, required: true },
    entity_id: { type: Number, required: true },
    deleted_at: { type: Date, default: Date.now }
});
const DeletedRecord = mongoose.model('DeletedRecord', DeletedRecordSchema);

module.exports = DeletedRecord;
