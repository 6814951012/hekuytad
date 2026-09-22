const mongoose = require('mongoose');

/**
 * Schema สำหรับเก็บข้อมูลลีกการแข่งขัน
 */
const leagueSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'กรุณาระบุชื่อลีก'] 
  },                                      // เช่น "พรีเมียร์ลีก อังกฤษ"
  code: { 
    type: String, 
    required: [true, 'กรุณาระบุรหัสลีก'], 
    unique: true 
  },                                      // เช่น "PL", "LA_LIGA", "BUNDESLIGA"
  country: { 
    type: String 
  },                                      // ประเทศ เช่น "England", "Spain"
  logo: { 
    type: String 
  },                                      // URL รูปโลโก้ลีก
  season: { 
    type: String, 
    default: "2024/2025" 
  }                                       // ฤดูกาลปัจจุบัน
}, { 
  timestamps: true 
});

module.exports = mongoose.model('League', leagueSchema);
