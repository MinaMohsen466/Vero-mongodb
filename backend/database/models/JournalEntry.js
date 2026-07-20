const mongoose = require('mongoose');

const JournalEntryLineSchema = new mongoose.Schema({
    account_id: { type: Number, required: true },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    description: String
});

const JournalEntrySchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    entry_number: { type: String, unique: true, required: true },
    date: { type: String, required: true },
    description: String,
    reference: String,
    is_posted: { type: Boolean, default: false },
    created_by: Number,
    lines: [JournalEntryLineSchema],
    created_at: { type: Date, default: Date.now }
});
JournalEntrySchema.index({ date: -1 });
const JournalEntry = mongoose.model('JournalEntry', JournalEntrySchema);

module.exports = JournalEntry;
