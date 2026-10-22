# Vercel 배포 가이드 (client, server 각각 별도 프로젝트)

배포는 **Vercel 프로젝트 2개**로 해요. 같은 GitHub 저장소를 두 번 가져와서 Root Directory만 다르게 지정합니다.

| 프로젝트 | Root Directory | Framework Preset | 역할 |
|---|---|---|---|
| 서버 | `server` | **Other** | Express API (서버리스 함수) |
| 클라이언트 | `client` | **Vite** | React 화면 |

> 저장소: https://github.com/cswkr8153/shopping-mall-demo (저장소 루트가 곧 이 프로젝트 폴더라서 Root Directory는 `server`, `client` 입니다)
> `.env` 파일과 스크린샷 이미지는 저장소에 올라가지 않아요. 환경변수는 Vercel 화면에서 직접 입력하세요.

## 배포 순서 (서버 → 클라이언트 → 서버에 클라이언트 주소 알려주기)

서로의 주소를 알아야 해서 한 바퀴 돌아야 합니다.

1. **서버 먼저 배포** (아래 환경변수 중 `CLIENT_URL`은 일단 비워 둬도 됨) → 서버 주소를 확인 (예: `https://my-shop-api.vercel.app`)
2. 서버 주소로 동작 확인: `https://<서버>/api` 를 열면 `{"message":"Shopping mall API is running"}` 가 나와야 함
3. **클라이언트 배포** — `VITE_API_URL` 에 `https://<서버>/api` 를 넣고 배포 → 클라이언트 주소 확인 (예: `https://my-shop.vercel.app`)
4. **서버 프로젝트의 `CLIENT_URL`** 에 클라이언트 주소를 넣고 **서버를 다시 배포(Redeploy)**
5. 클라이언트 주소로 접속해서 로그인/상품 목록/장바구니를 확인

## 서버 환경변수 (Vercel > 서버 프로젝트 > Settings > Environment Variables)

| 이름 | 값 | 비고 |
|---|---|---|
| `MONGODB_ATLAS_URL` | Atlas 연결 주소 | `<db_password>` 자리표시자 제거, 특수문자는 `%40` 처럼 인코딩 |
| `JWT_SECRET` | 길고 무작위인 새 값 | 개발용과 다른 값을 쓰는 걸 권장 (바꾸면 기존 로그인은 모두 풀림) |
| `JWT_EXPIRES_IN` | `1d` | |
| `CLIENT_URL` | `https://<클라이언트 주소>` | 쉼표로 여러 개 가능. **이 주소에서 온 요청만 허용됨** (없으면 경고 후 모두 허용) |
| `PORTONE_API_KEY` | 포트원 REST API 키 | 결제 검증용 |
| `PORTONE_API_SECRET` | 포트원 REST API Secret | **절대 클라이언트에 넣지 말 것** |

### 넣으면 안 되는 값 (개발 전용)

- `EXPOSE_RESET_LINK` : **넣지 마세요.** `true`면 비밀번호 재설정 링크가 응답에 그대로 노출되어 **누구나 남의 비밀번호를 바꿀 수 있어요.**
- `PORTONE_INCLUDE_SANDBOX` : **넣지 마세요.** `true`면 테스트(가짜) 결제도 인정되어 **결제 없이 주문이 확정될 수 있어요.**
- `PORT` : Vercel에서는 필요 없어요.

## 클라이언트 환경변수 (Vercel > 클라이언트 프로젝트 > Settings > Environment Variables)

`VITE_` 값은 빌드할 때 화면 코드에 포함돼서 **누구나 볼 수 있어요.** 바꾸면 **다시 배포**해야 반영됩니다.

| 이름 | 값 |
|---|---|
| `VITE_API_URL` | `https://<서버 주소>/api` |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary 클라우드 이름 |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Unsigned 업로드 프리셋 이름 |
| `VITE_PORTONE_IMP_CODE` | 포트원 가맹점(고객사) 식별코드 (`imp...`) |
| `VITE_PORTONE_PG` | (선택) 기본값 `html5_inicis` |

## 배포 전에 꼭 확인할 것

- [ ] **MongoDB Atlas > Network Access** 에 `0.0.0.0/0`(어디서나 허용)을 추가했나요? Vercel 서버리스 함수는 접속 IP가 계속 바뀌어서, 이걸 안 하면 서버가 DB에 연결하지 못하고 모든 API가 `503` 을 돌려줘요. (허용을 열어 두는 대신 DB 사용자 비밀번호를 강하게 유지하세요)
- [ ] Atlas DB에 데이터가 있나요? (`server/scripts/migrate-local-to-atlas.js` 로 로컬 데이터를 옮길 수 있어요)
- [ ] 서버 환경변수에 **`EXPOSE_RESET_LINK`, `PORTONE_INCLUDE_SANDBOX` 가 없는지** 다시 확인
- [ ] 포트원 콘솔에서 **실결제 채널**(KG이니시스 실제 상점 아이디)이 설정돼 있나요? 지금은 테스트 채널이에요
- [ ] 클라이언트 `VITE_API_URL` 끝이 `/api` 인가요? (`https://<서버>/api`)

## 알아 두면 좋은 점

- **비밀번호 찾기는 운영에서 동작하지 않아요.** 재설정 링크를 이메일로 보내는 기능이 아직 없고, 개발용 노출(`EXPOSE_RESET_LINK`)은 위험해서 꺼야 하기 때문이에요. 메일 발송(SendGrid, Resend 등)을 붙이기 전까지는 사용할 수 없습니다.
- **결제 웹훅이 없어요.** 결제 직후 브라우저가 닫히면 주문이 "결제 대기"로 남을 수 있어요. 서버 주소가 생겼으니 포트원 웹훅을 붙일 수 있습니다.
- Vercel **Preview 배포**(브랜치/PR마다 생기는 임시 주소)는 `CLIENT_URL` 에 없는 주소라 서버가 `403` 으로 막아요. 미리보기에서 시험하려면 그 주소도 `CLIENT_URL` 에 추가하세요.
- 서버리스 함수는 오래 안 쓰면 잠들어서 **첫 요청이 1~2초 느릴 수 있어요.**
- 로컬 개발은 그대로예요: 서버 `npm run dev`, 클라이언트 `npm run dev` (클라이언트는 `/api` 를 `localhost:5001` 로 프록시).
