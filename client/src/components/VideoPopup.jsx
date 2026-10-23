import { useEffect, useState } from 'react'
import './VideoPopup.css'

// 홈 첫 방문 시 뜨는 영상 팝업. 영상을 바꾸려면 VIDEO_ID 만 교체하면 됨.
const VIDEO_ID = 'X7Gnq97_dpY'
const HIDE_KEY = 'videoPopupHiddenUntil'

function isHidden() {
  try {
    return Number(localStorage.getItem(HIDE_KEY)) > Date.now()
  } catch {
    return false
  }
}

function hideForToday() {
  try {
    localStorage.setItem(HIDE_KEY, String(Date.now() + 24 * 60 * 60 * 1000))
  } catch {
    // 저장이 막힌 환경에서는 이번 방문 동안만 닫힘
  }
}

function VideoPopup() {
  const [open, setOpen] = useState(() => !isHidden())

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  const close = () => setOpen(false)
  const closeToday = () => {
    hideForToday()
    setOpen(false)
  }

  // 자동 재생은 음소거로 시작 (브라우저 정책). 소리는 플레이어에서 직접 켬.
  const src = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&mute=1&rel=0&playsinline=1`

  return (
    <div className="vp-backdrop" onClick={close} role="presentation">
      <div className="vp" role="dialog" aria-modal="true" aria-label="건담 영상" onClick={(e) => e.stopPropagation()}>
        <div className="vp-head">
          <span className="vp-tag">GUNDAM // MOVIE</span>
          <button type="button" className="vp-x" onClick={close} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="vp-frame">
          <iframe
            src={src}
            title="건담 영상"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
        <div className="vp-foot">
          <button type="button" className="vp-link" onClick={closeToday}>
            오늘 하루 보지 않기
          </button>
          <button type="button" className="vp-link" onClick={close}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

export default VideoPopup
