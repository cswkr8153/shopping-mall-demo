const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 이메일/비밀번호 어느 쪽이 틀렸는지 알려주지 않기 위해 같은 메시지 사용
const INVALID_CREDENTIALS = '이메일 또는 비밀번호가 올바르지 않습니다.';

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: INVALID_CREDENTIALS });
    }

    const isMatch = await bcrypt.compare(String(password), user.password);
    if (!isMatch) {
      return res.status(401).json({ message: INVALID_CREDENTIALS });
    }

    const safeUser = user.toObject();
    delete safeUser.password;
    const token = jwt.sign({ id: user._id, user_type: user.user_type }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });

    res.json({ message: '로그인되었습니다.', token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// 비밀번호 찾기: 재설정 링크 발급
exports.forgotPassword = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: '이메일을 입력해주세요.' });
    }

    // 가입 여부를 노출하지 않기 위해 항상 같은 응답을 반환
    const response = { message: '입력하신 이메일로 비밀번호 재설정 링크를 보냈습니다.' };

    const user = await User.findOne({ email });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = hashToken(token);
      user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await user.save();

      // CLIENT_URL에 주소가 여러 개(쉼표)여도 첫 번째 주소로 링크를 만듦
      const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
      const link = `${clientUrl}/reset-password?token=${token}`;
      // TODO: 메일 발송 서비스 연동 시 이 위치에서 link를 이메일로 전송
      console.log(`[password reset] ${email}: ${link}`);
      // 개발 환경 전용: 메일 대신 응답으로 링크 제공 (운영에서는 반드시 끌 것)
      if (process.env.EXPOSE_RESET_LINK === 'true') response.devResetLink = link;
    }

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 비밀번호 재설정: 토큰 확인 후 새 비밀번호 저장
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: '토큰과 새 비밀번호를 입력해주세요.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: '비밀번호는 6자 이상이어야 합니다.' });
    }

    const user = await User.findOne({
      resetPasswordToken: hashToken(String(token)),
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires');
    if (!user) {
      return res.status(400).json({ message: '유효하지 않거나 만료된 링크입니다.' });
    }

    user.password = await bcrypt.hash(String(password), 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 토큰으로 현재 로그인한 사용자 조회
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.auth.id).select('-password');
    if (!user) return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};
