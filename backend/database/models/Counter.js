const mongoose = require('mongoose');

// ==================== Sequence Counter Schema ====================
const CounterSchema = new mongoose.Schema({
    _id: String,
    seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', CounterSchema);

async function getNextSequenceValue(sequenceName) {
    const sequenceDocument = await Counter.findByIdAndUpdate(
        sequenceName,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return sequenceDocument.seq;
}

async function syncSequence(sequenceName, model) {
    const maxDoc = await model.findOne().sort({ id: -1 }).lean().exec();
    const maxId = (maxDoc && typeof maxDoc.id === 'number') ? maxDoc.id : 0;
    await Counter.findByIdAndUpdate(
        sequenceName,
        { $max: { seq: maxId } },
        { upsert: true }
    );
}

module.exports = {
  Counter,
  getNextSequenceValue,
  syncSequence
};
