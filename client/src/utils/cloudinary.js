const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const WIDGET_SRC = 'https://upload-widget.cloudinary.com/global/all.js'

export const isCloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET)

let scriptPromise

// Cloudinary 업로드 위젯 스크립트를 한 번만 불러옴
const loadWidgetScript = () => {
  if (window.cloudinary) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = WIDGET_SRC
      script.async = true
      script.onload = resolve
      script.onerror = () => {
        scriptPromise = undefined
        reject(new Error('Cloudinary 위젯을 불러오지 못했습니다.'))
      }
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

// 위젯을 열고, 업로드가 끝나면 onSuccess(이미지 URL)를 호출
export async function openImageUploader({ onSuccess, onError }) {
  try {
    await loadWidgetScript()
  } catch (err) {
    onError?.(err.message)
    return
  }

  const widget = window.cloudinary.createUploadWidget(
    {
      cloudName: CLOUD_NAME,
      uploadPreset: UPLOAD_PRESET,
      sources: ['local', 'url', 'camera'],
      multiple: false,
      maxFiles: 1,
      cropping: false,
      clientAllowedFormats: ['png', 'jpg', 'jpeg', 'webp', 'gif'],
      maxFileSize: 5 * 1024 * 1024,
      language: 'ko',
    },
    (error, result) => {
      if (error) {
        onError?.(error.message || '이미지 업로드에 실패했습니다.')
        return
      }
      if (result?.event === 'success') {
        onSuccess(result.info.secure_url)
        widget.close()
      }
    },
  )
  widget.open()
}
