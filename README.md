# 2026 삼성전자 성과급 계산기

사용자가 입력한 가정값으로 OPI1/OPI2를 계산하는 정적 웹앱입니다. GitHub Pages에 바로 올려서 사용할 수 있도록 `index.html`, `styles.css`, `app.js`만으로 구성했습니다.

## 기본 가정

- 사업부: 메모리, 파운드리, S.LSI, 공통
- OPI1: 연봉의 50%
- OPI2 재원: 사업부별 영업이익의 10.5%
- OPI2 배분: 균등배분 40%, 사업부별 배분 60%
- 공통: 선택한 사업부의 70% 수준
- 평균연봉: 8,000만 원
- 2026 예상 영업이익 기본값
  - 메모리: 320조 원
  - 파운드리: 0원
  - S.LSI: 0원
- 인원 기본값
  - 메모리: 27,400명
  - 공통: 29,000명
  - 파운드리: 14,000명
  - S.LSI: 6,900명

## 계산 방식

공통조직의 OPI2는 추가 재원 방식이 아니라, 가중인원 기반 재원보존형으로 계산합니다.

- 공통 가중인원 = 공통 인원 × 공통 배분율
- 균등배분 가중인원 = 메모리 인원 + 파운드리 인원 + S.LSI 인원 + 공통 가중인원
- 사업부별 배분에서는 사용자가 선택한 사업부의 배분 대상 인원에 공통 가중인원을 더합니다.
- 공통은 선택 사업부 기준금액의 공통 배분율만큼 받습니다.

## GitHub Pages 배포 방법

### 방법 1. GitHub 웹에서 업로드

1. GitHub에서 새 repository를 만듭니다.
2. 이 폴더의 파일들을 repository 루트에 업로드합니다.
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
3. repository의 **Settings → Pages**로 이동합니다.
4. **Build and deployment**에서 Source를 **Deploy from a branch**로 선택합니다.
5. Branch를 `main`, folder를 `/root`로 선택합니다.
6. 저장하면 몇 분 뒤 GitHub Pages URL이 생성됩니다.

### 방법 2. Git 명령어로 업로드

```bash
git init
git add .
git commit -m "Add Samsung bonus calculator"
git branch -M main
git remote add origin https://github.com/사용자명/저장소명.git
git push -u origin main
```

그 다음 GitHub repository의 **Settings → Pages**에서 `main / root`를 선택하면 됩니다.

## 로컬 실행

별도 빌드가 필요 없습니다. `index.html`을 브라우저로 열면 바로 실행됩니다.

## 주의사항

이 사이트는 사용자가 입력한 가정값으로 계산하는 비공식 시뮬레이터입니다. 실제 회사의 성과급 제도, 지급률, 지급 대상, 기준 연봉, 세금 및 개인별 평가 결과와 다를 수 있습니다.
