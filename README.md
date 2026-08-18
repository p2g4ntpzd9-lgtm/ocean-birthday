# 🏖️ Ocean Birthday — 해변에서 보내는 생일 편지

스크롤하면 한낮(12:00)에서 밤(22:00)까지 해변의 하루가 흐르는 인터랙티브 생일 편지.
바닐라 HTML/CSS/JS 정적 사이트 — 빌드 과정 없음.

배포: https://p2g4ntpzd9-lgtm.github.io/ocean-birthday/

## 구성

- **비밀번호 게이트**: 편지 텍스트와 **사진·영상까지 전부** AES-256-GCM으로 암호화되어 있음. 비밀번호로 PBKDF2(21만 회) 키를 즉석 유도하므로 저장소에는 암호문만 존재. 소스를 뜯어봐도 내용을 볼 수 없음.
- **시간 시스템**: 스크롤 = 시간. 하늘/바다/모래 색, 태양·달 위치, 윤슬 색이 실시간 보간. 우측 상단에 해변 시계.
- **윤슬 캔버스**: 태양(밤엔 달) 아래 물결 반짝임을 캔버스로 렌더링. 노을 땐 금빛, 밤엔 달빛.
- **파도 소리**: Web Audio로 생성 (오디오 파일 없음). 우측 상단 🔊 토글.
- **고정 해변 세트**: 파라솔·비치체어·술잔이 고정된 모래 위에 놓이고, 첫 화면을 벗어나면 서서히 페이드아웃.
- **돌고래**: 배경 바다를 주기적으로 점프하며 가로지름.
- **게임/이스터에그**:
  - 🐚 조개 3개 찾기 → 비밀 유리병(보너스 메시지) 등장
  - 🌊 Float 버튼 → 물 위에 둥둥 → "Try again" → 🚤 제트스키 → 다시 둥둥 (번갈아 반복)
  - 🥂 파라솔 옆 잔 누르기 → 짠!
  - ☀️ 해를 5번 연타 → 스파클
- **편지**: 노을 섹션의 떠밀려온 유리병 클릭 → 편지 열림 / 닫기 버튼으로 다시 봉인.

## 내용 수정 → 재암호화

1. `tools/content.source.json` 수정 (편지, 추억, 사진 캡션, 힌트 등 모든 텍스트)
2. 사진 추가/교체는 `assets/photos/`에 원본을 넣고 `photos` 배열의 `file` 이름을 맞춤
3. 암호화 (텍스트 + 사진 한 번에):
   ```bash
   node tools/encrypt.mjs <비밀번호>
   ```
   → `content.enc.js`와 각 사진의 `<파일명>.enc`가 재생성됨
4. 커밋 & 푸시하면 배포 반영

**비밀번호는 저장소 어디에도 기록하지 않는다** (암호화 시 커맨드 인자로만 사용).
`tools/content.source.json`과 사진 **원본**은 `.gitignore`로 제외되어 절대 올라가지 않음 —
공개되는 것은 `.enc` 암호문뿐이다.

## 사진

정사각형에 가까울수록 예쁘게 나옴. 원본은 로컬에만 두고, 최대 1600px로 리사이즈해두면 로딩이 가볍다:

```bash
sips --resampleHeightWidthMax 1600 assets/photos/*.jpg
```

`.mp4`/`.mov`/`.webm`을 넣으면 폴라로이드 안에서 무음 루프 영상으로 재생됨.

## 배포 (GitHub Pages)

```bash
gh repo create <repo-name> --public --source=. --push
gh api "repos/{owner}/<repo-name>/pages" -X POST -f 'source[branch]=main' -f 'source[path]=/'
```

무료 GitHub Pages는 public 저장소가 필요하지만, 텍스트와 사진이 모두 암호화되어 있어
소스가 공개돼도 비밀번호 없이는 아무것도 읽거나 볼 수 없음.

## 로컬 미리보기

```bash
python3 -m http.server 8795 --directory ocean-birthday
```
