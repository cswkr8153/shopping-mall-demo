const SCRIPT_SRC = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

let scriptPromise

// 다음(카카오) 우편번호 서비스 스크립트를 한 번만 불러옴
const loadScript = () => {
  if (window.daum?.Postcode) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.onload = resolve
      script.onerror = () => {
        scriptPromise = undefined
        reject(new Error('주소 검색 서비스를 불러오지 못했습니다.'))
      }
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

// 주소 검색 창을 열고, 주소를 고르면 onComplete({ zipCode, address })를 호출
export async function openAddressSearch({ onComplete, onError }) {
  try {
    await loadScript()
  } catch (err) {
    onError?.(err.message)
    return
  }

  new window.daum.Postcode({
    oncomplete: (data) => {
      // 사용자가 도로명(R)/지번(J) 중 고른 주소를 사용
      let address = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress
      if (data.userSelectedType === 'R' && data.buildingName && data.apartment === 'Y') {
        address += ` (${data.buildingName})`
      }
      onComplete({ zipCode: data.zonecode, address })
    },
  }).open()
}
