// 로고 마크: 건담 머리(노란 V핀 + 시안색 눈)를 단순화한 아이콘
function LogoMark({ size = 36 }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="피규어박스">
      <rect width="40" height="40" rx="9" fill="#0f1a3a" />
      <rect width="40" height="40" rx="9" fill="none" stroke="#2f5bff" strokeOpacity="0.55" />
      <path d="M20 21 8 5.5 12.2 3.6 21 16.5Z" fill="#ffd426" />
      <path d="M20 21 32 5.5 27.8 3.6 19 16.5Z" fill="#ffd426" />
      <path d="M12 20.5 16 14 24 14 28 20.5 27 30.5 22.5 35 17.5 35 13 30.5Z" fill="#f3f5f9" />
      <path d="M20 14.2 18.2 19.2 21.8 19.2Z" fill="#ef4444" />
      <path d="M14.6 22 19 23 19 25.4 14.6 24.4Z" fill="#38d9ff" />
      <path d="M25.4 22 21 23 21 25.4 25.4 24.4Z" fill="#38d9ff" />
      <path d="M16.5 28.5 23.5 28.5 22.5 31.5 17.5 31.5Z" fill="#aab4c8" />
    </svg>
  )
}

export default LogoMark
