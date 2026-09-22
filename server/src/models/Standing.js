const mongoose = require('mongoose');

/**
 * Schema ย่อยสำหรับแต่ละทีมในตารางคะแนน
 */
const teamStandingSchema = new mongoose.Schema({
  position: { 
    type: Number, 
    required: true 
  },                                      // อันดับที่ (1, 2, 3...)
  teamName: { 
    type: String, 
    required: true 
  },                                      // ชื่อทีม เช่น "อาร์เซนอล"
  teamLogo: { 
    type: String 
  },                                      // URL โลโก้ทีม
  played: { 
    type: Number, 
    default: 0 
  },                                      // จำนวนนัดที่แข่ง (P)
  won: { 
    type: Number, 
    default: 0 
  },                                      // ชนะ (W)
  draw: { 
    type: Number, 
    default: 0 
  },                                      // เสมอ (D)
  lost: { 
    type: Number, 
    default: 0 
  },                                      // แพ้ (L)
  goalsFor: { 
    type: Number, 
    default: 0 
  },                                      // ประตูได้ (GF)
  goalsAgainst: { 
    type: Number, 
    default: 0 
  },                                      // ประตูเสีย (GA)
  goalDifference: { 
    type: Number, 
    default: 0 
  },                                      // ผลต่างประตูได้เสีย (GD)
  points: { 
    type: Number, 
    default: 0 
  }                                       // คะแนนรวม (PTS)
}, { _id: false });

/**
 * Schema หลักสำหรับตารางคะแนนจริงของลีก
 */
const standingSchema = new mongoose.Schema({
  leagueId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'League', 
    required: true 
  },                                      // อ้างอิง ID ของลีก
  season: { 
    type: String, 
    required: true 
  },                                      // ฤดูกาล เช่น "2024/2025"
  table: [teamStandingSchema]             // รายชื่อทีมเรียงตามอันดับคะแนน
}, { 
  timestamps: true 
});

// Index เพื่อการค้นหาตารางคะแนนของลีกและฤดูกาลได้รวดเร็ว
standingSchema.index({ leagueId: 1, season: 1 });

module.exports = mongoose.model('Standing', standingSchema);
