# 🏖️ Ocean Birthday — 해변에서 보내는 생일 편지

스크롤하면 한낮(12:00)에서 밤(22:00)까지 해변의 하루가 흐르는 인터랙티브 생일 편지.
바닐라 HTML/CSS/JS 정적 사이트 — 빌드 과정 없음.

## 구성

- **비밀번호 게이트**: 편지 내용 전체가 AES-256-GCM으로 암호화되어 있음. 비밀번호는 저장소 어디에도 없음 (PBKDF2로 즉석 키 유도). 소스를 뜯어봐도 내용을 볼 수 없음.
- **시간 시스템**: 스크롤 = 시간. 하늘/바다/모래 색, 태양·달 위치, 윤슬 색이 실시간 보간. 우측 상단에 해변 시계.
- **윤슬 캔버스**: 태양(밤엔 달) 아래 물결 반짝임을 캔버스로 렌더링. 노을 땐 금빛, 밤엔 달빛.
- **파도 소리**: Web Audio로 생성 (오디오 파일 없음). 우측 상단 🔊 토글.
- **게임/이스터에그**:
  - 🐚 조개 3개 찾기 → 비밀 유리병(보너스 메시지) 등장
  - 🌊 웨이브 타기 버튼 → 서퍼가 파도를 탐
  - 🥂 파라솔 옆 잔 누르기 → 짠!
  - ☀️ 해를 5번 연타 → 스파클
- **편지**: 노을 섹션의 떠밀려온 유리병 클릭 → 편지 열림 / 닫기 버튼으로 다시 봉인.

## 내용 수정 → 재암호화

1. `tools/content.source.json` 수정 (편지, 추억, 사진 캡션, 힌트 등 모든 텍스트)
2. 암호화:
   ```bash
   node tools/encrypt.mjs <비밀번호>
   ```
   → `content.enc.js` 재생성. **`tools/content.source.json`은 절대 깃헙에 올리지 말 것** (`.gitignore` 처리됨).

비밀번호는 저장소 어디에도 기록하지 않는다 (암호화 시 커맨드 인자로만 사용).

## 사진

`assets/photos/`에 `photo1.jpg` ~ `photo4.jpg` 넣기 (정사각형에 가까울수록 예쁨).
파일명/개수를 바꾸려면 `content.source.json`의 `photos` 배열 수정 후 재암호화.

## 배포 (GitHub Pages)

```bash
cd ocean-birthday
git init && git add . && git commit -m "🎂"
gh repo create <repo-name> --public --source=. --push
gh api repos/{owner}/<repo-name>/pages -X POST -f 'source[branch]=main' -f 'source[path]=/'
```

또는 깃헙 웹에서: 새 public 저장소 → 파일 업로드 → Settings → Pages → Branch `main` / root.

무료 GitHub Pages는 public 저장소가 필요하지만, 내용이 암호화되어 있어 소스가 공개돼도 편지는 읽을 수 없음.
(private 저장소로 하고 싶으면 Netlify/Vercel 무료 배포 사용.)

## 로컬 미리보기

```bash
python3 -m http.server 8795 --directory ocean-birthday
```
