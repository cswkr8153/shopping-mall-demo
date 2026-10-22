const mongoose = require('mongoose');

// 유저 한 명이 여러 주소를 가질 수 있어 User와 별도 컬렉션으로 관리
const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipient: { type: String, trim: true },
    phone: { type: String, trim: true },
    zip_code: { type: String, trim: true },
    address1: { type: String, required: true, trim: true },
    address2: { type: String, trim: true },
    is_default: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Address', addressSchema);
