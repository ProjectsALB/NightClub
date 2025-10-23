
const mongoose = require('mongoose');

const rezervimiSchema = new mongoose.Schema({
  Emer: {
    type: String,
    required: [true, 'Emri është i detyrueshëm'],
    trim: true
  },
  mbiemer: {
    type: String,
    required: [true, 'Mbiemri është i detyrueshëm'],
    trim: true
  },
  Email: {
    type: String,
    required: [true, 'Email është i detyrueshëm'],
    lowercase: true,
    trim: true
  },
  Mosha: {
    type: Number,
    required: [true, 'Mosha është e detyrueshme'],
    min: [18, 'Duhet të jeni të paktën 18 vjeç']
  },
  Numri: {
    type: String,
    required: [true, 'Numri i telefonit është i detyrueshëm'],
    trim: true
  },
  Eventet: {
    type: Date,
    required: [true, 'Data e eventit është e detyrueshme']
  },
  Biletat: {
    type: String,
    required: [true, 'Lloji i biletës është i detyrueshëm'],
    trim: true
  }
}, {
  timestamps: true
});

// Indeks për email dhe datë
rezervimiSchema.index({ Email: 1, Eventet: 1 });

module.exports = mongoose.model('Rezervimi', rezervimiSchema);