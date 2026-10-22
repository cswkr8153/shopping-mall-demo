const mongoose = require('mongoose');

const MAX_QUANTITY = 99;

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, '상품은 필수입니다.'],
    },
    quantity: {
      type: Number,
      required: [true, '수량은 필수입니다.'],
      default: 1,
      min: [1, '수량은 1개 이상이어야 합니다.'],
      max: [MAX_QUANTITY, `수량은 ${MAX_QUANTITY}개 이하여야 합니다.`],
      validate: { validator: Number.isInteger, message: '수량은 정수여야 합니다.' },
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    // 유저당 장바구니 1개
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '유저는 필수입니다.'],
      unique: true,
    },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true } // createdAt, updatedAt 자동 생성
);

module.exports = mongoose.model('Cart', cartSchema);
module.exports.MAX_QUANTITY = MAX_QUANTITY;
