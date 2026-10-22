const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, '이메일은 필수입니다.'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, '이름은 필수입니다.'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, '비밀번호는 필수입니다.'],
    },
    user_type: {
      type: String,
      required: [true, '유저 타입은 필수입니다.'],
      enum: ['customer', 'admin', 'seller'],
      default: 'customer',
    },
    // 비밀번호 재설정용 (토큰은 해시로만 저장, 조회 시 기본 제외)
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true } // createdAt, updatedAt 자동 생성
);

module.exports = mongoose.model('User', userSchema);
