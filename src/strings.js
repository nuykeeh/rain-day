// 화면에 보이는 모든 문자열. 다른 파일에 한국어를 직접 쓰지 않는다. (PRD 1-4)

export const S = {
  title: 'R.A.I.N. DAY',
  subtitle: 'UNIVERSE SALVAGERS',

  prologue: [
    '인간의 탐욕이 지구를 병들게 했다.',
    '오염 속에서 새로운 진화가 시작됐다.',
    '그리고 하늘에서 쓰레기가 불타며 떨어졌다.',
    '우주청소팀 U.S., 출동.',
  ],
  prologueTag: ['', 'Spring cleaning', 'R.A.I.N. Day', ''],

  pressAnyToJoin: '아무 버튼이나 눌러 참가',
  attractHowTo: '참가한 뒤 L · R 버튼으로 조작법을 볼 수 있어요',
  totalTons: (n) => `지금까지 U.S.가 치운 우주 쓰레기 ${n} 톤`,
  earthRecord: (saved, lost) => `지켜낸 지구 ${saved}회  ·  망한 지구 ${lost}회`,

  joinTitle: '대원 모집',
  joinHint: '버튼을 눌러 참가',
  joinReady: '출발 준비 완료!',
  joinPressGo: (k) => `${k} 누르면 바로 출발`,
  joinPressHowTo: (l, r) => `${l} · ${r}  조작법 보기`,
  joinFooter: '참가자가 모두 출발을 누르면 바로 시작  ·  1명이면 솔로 임무',

  howToTitle: '조작법',
  howToRules: '배낭에 모아 한 번에 넣을수록 점수가 뛴다  ·  배낭이 무거우면 느려진다',
  howToClose: 'L · R = 닫기     M = 출발 준비',
  briefMove: '이동',
  briefGrab: '잡기 · 수거선 아래에서는 넣기',
  briefDash: '두 번 빠르게 = 그 방향으로 박치기',
  briefHold: '길게 = 특수 능력',
  briefGoal: '90초 동안 지구를 지켜라. 점수는 각자 챙긴다.',
  abilityOf: {
    rabbit: '토끼 — 그물 설치',
    frog: '개구리 — 혀로 훔치기',
    monkey: '원숭이 — 꼬리 채찍',
  },

  ready: ['3', '2', '1', 'GO!'],

  hudEarth: '지구',
  hudTime: '남은 시간',
  hudRush: 'R.A.I.N. 러시',
  hudWarn: '지구 위험!',
  hudReady: '능력 준비',

  popBig: '대박!',
  popNice: '좋아!',
  popSteal: '뺏겼다!',
  popStole: '훔쳤다!',
  popFull: '배낭 꽉 참',
  packLeft: (n) => `${n}칸`,
  packFull: '꽉 참',
  popNet: '그물!',
  popWhip: '꼬리!',
  popTogether: '같이!',
  popNeedTwo: '둘이서!',
  popMagnet: '자석',
  popBooster: '부스터',
  popCool: '아직',

  resultWin: '지구 방어 성공',
  resultLose: '지구는 망했다',
  resultLoseSub: '…그래도, 가장 많이 챙긴 대원은?',
  resultRank: (n) => `${n}위`,
  resultPoint: (n) => `${n}점`,
  resultTons: (n, total) => `이번 판 수거량 +${n}톤  /  누적 ${total}톤`,
  resultHint: '아무 버튼이나 누르면 대기 화면으로',

  tune: {
    title: '튜닝 패널  (F3 닫기)',
    copy: 'JSON 복사',
    copied: '복사됨!',
    reset: '기본값 복원',
    note: '값은 이 브라우저에 저장된다. 확정되면 JSON을 복사해 config.js 에 반영할 것.',
  },

  // 라이벌끼리 부딪혔을 때 (PRD 4.6)
  rivalLines: {
    frog: '…일부러 그런 거 아니다.',
    monkey: '야! 너 지금 나 쳤지?!',
  },

  chars: { rabbit: '토끼', frog: '개구리', monkey: '원숭이' },
};
