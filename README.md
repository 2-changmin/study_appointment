# 약속메이트

친구와 계획을 공유하고 서로 승인하며 함께 실천하기 위한 2인용 웹앱입니다. 계획을 지키지 못했을 때의 벌금은 계획당 10,000원으로 고정됩니다.

## 주요 기능

- 두 명의 허용된 ChatGPT 계정만 로그인 가능
- 6자리 방 코드를 이용한 친구 연결
- 개인 계획 작성 및 기한 설정
- 친구 계획 확인 및 승인
- 본인이 작성한 계획 수정·삭제
- 계획 수정 시 기존 승인 취소 및 재승인 요청
- 친구가 새 계획을 등록하면 휴대폰 푸시 알림 전송
- 아이폰과 안드로이드 홈 화면 설치 지원
- 모바일과 데스크톱 반응형 화면

## 실행 조건

- Node.js `22.13.0` 이상
- npm

## 환경변수

이메일 주소와 푸시 키 같은 개인 정보는 코드에 넣지 않고 환경변수로 관리합니다. `.env.example`을 복사해 실제 값을 채워 넣으세요.

```bash
cp .env.example .env
cp .env .dev.vars
```

`.env`와 `.dev.vars`는 `.gitignore`에 포함되어 있어 깃에 올라가지 않습니다. (로컬 실행 도구에 따라 읽는 파일이 달라 두 파일을 같은 내용으로 두는 것이 안전합니다.)

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `ALLOWED_EMAILS` | 아니요 | 접근을 허용할 ChatGPT 계정 이메일. 쉼표로 구분합니다. 지정하지 않으면 `app/allowed-users.ts`의 해시 목록을 사용합니다. |
| `VAPID_SUBJECT` | 아니요 | 푸시 발송자 연락처. 생략하면 사이트 주소가 사용됩니다. |
| `VAPID_PUBLIC_KEY` | 푸시 사용 시 | VAPID 공개키 |
| `VAPID_PRIVATE_KEY` | 푸시 사용 시 | VAPID 비밀키 |

이 프로젝트는 `.openai/hosting.json`의 프로젝트 설정을 통해 배포되며, 저장소에 wrangler 설정 파일을 두지 않습니다. 배포 환경에 값을 등록하려면 호스팅 쪽 환경변수 설정을 이용합니다.

허용 계정은 환경변수 없이도 동작하도록 이메일의 SHA-256 해시를 `app/allowed-users.ts`에 넣어 두었습니다. 저장소에 실제 주소가 남지 않으면서 배포 환경 설정 없이 동작합니다. 계정을 추가하려면 해시를 만들어 목록에 넣으세요.

```bash
node -e "console.log(require('crypto').createHash('sha256').update('주소'.toLowerCase()).digest('hex'))"
```

## 로컬 실행

```bash
npm install
npm run dev
```

배포용 빌드를 확인하려면 다음 명령을 실행합니다.

```bash
npm run build
```

## 주요 폴더

- `app/`: 화면, 로그인 권한 검사 및 API 코드
- `.env.example`: 필요한 환경변수 이름 목록(실제 값은 `.env`에 보관)
- `db/schema.ts`: 방, 사용자, 계획 및 푸시 구독 데이터 구조
- `drizzle/`: 데이터베이스 변경 이력
- `public/manifest.webmanifest`: 홈 화면 설치 설정
- `public/sw.js`: 백그라운드 푸시 알림 처리
- `.openai/hosting.json`: Sites 배포 및 데이터베이스 연결 설정

## 로그인과 접근 권한

사이트는 ChatGPT 로그인을 통해 사용자의 이메일을 확인합니다. 허용된 계정은 `app/allowed-users.ts`에 이메일 해시로 보관하며(`ALLOWED_EMAILS` 환경변수를 지정하면 그 목록이 우선), 화면뿐 아니라 모든 데이터 API에서도 권한을 다시 검사합니다.

허용되지 않은 계정은 로그인하더라도 계획을 조회하거나 작성·수정·삭제·승인할 수 없습니다.

## 푸시 알림

두 사용자는 설치된 약속메이트에서 각각 `알림 켜기`를 선택해야 합니다. 한 사용자가 새 계획을 등록하면 상대방의 구독된 기기로 알림이 전송됩니다.

푸시 알림에는 다음 운영 환경값이 필요합니다.

- `VAPID_SUBJECT` (선택, 생략하면 사이트 주소 사용)
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

비밀키는 소스 코드나 Git 저장소에 저장하지 않고 배포 환경의 비밀값으로 관리해야 합니다.

아이폰에서는 iOS 16.4 이상이 필요하며, Safari에서 사이트를 홈 화면에 추가한 후 설치된 웹앱으로 실행해야 푸시 알림을 사용할 수 있습니다.

## 데이터베이스 변경

`db/schema.ts`를 수정한 후 다음 명령으로 마이그레이션 파일을 생성합니다.

```bash
npm run db:generate
```

생성된 SQL 파일을 확인한 뒤 사이트와 함께 배포합니다.

## 주요 명령어

- `npm run dev`: 로컬 개발 서버 실행
- `npm run build`: 배포용 빌드 확인
- `npm run db:generate`: 데이터베이스 마이그레이션 생성
- `npm test`: 프로젝트 테스트 실행

## 배포된 사이트

[약속메이트 바로가기](https://yaksok-mate.leeyoonpaeng.chatgpt.site)

## 참고 자료

- [vinext](https://github.com/cloudflare/vinext)
- [Drizzle ORM의 Cloudflare D1 안내](https://orm.drizzle.team/docs/get-started/d1-new)
- [iOS 및 iPadOS 웹 푸시 안내](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
