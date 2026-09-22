const mongoose = require('mongoose');

/**
 * Schema สำหรับเก็บข้อมูลตารางการแข่งขันและผลบอล
 */
const matchSchema = new mongoose.Schema({
  leagueId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'League', 
    required: true 
  },                                      // อ้างอิง ID ของลีก
  matchDate: { 
    type: Date, 
    required: true 
  },                                      // วันและเวลาแข่งขัน
  stadium: { 
    type: String 
  },                                      // สนามแข่งขัน เช่น "Etihad Stadium"
  homeTeam: {
    name: { type: String, required: true }, // ทีมเจ้าบ้าน เช่น "แมนฯ ซิตี้"
    logo: { type: String }
  },
  awayTeam: {
    name: { type: String, required: true }, // ทีมเยือน เช่น "อาร์เซนอล"
    logo: { type: String }
  },
  status: { 
    type: String, 
    enum: ['SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED'], 
    default: 'SCHEDULED' 
  },                                      // สถานะการแข่งขัน
  score: {
    home: { type: Number, default: null }, // สกอร์ทีมเจ้าบ้าน
    away: { type: Number, default: null }  // สกอร์ทีมเยือน
  }
}, { 
  timestamps: true 
});

// Compound Index สำหรับค้นหาการแข่งขันตามวันที่และลีก
matchSchema.index({ matchDate: 1, leagueId: 1 });

module.exports = mongoose.model('Match', matchSchema);
