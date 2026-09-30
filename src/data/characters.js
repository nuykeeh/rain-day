// 캐릭터 정의. 이름·색·이미지·대사를 여기서만 바꾼다. (PRD 1-2, 3)
// image 가 비었거나 로드 실패하면 플레이스홀더(색 원 + 배낭 + 눈)로 그린다.

import { S } from '../strings.js';

export const CHARACTERS = [
  {
    id: 'rabbit',
    name: S.chars.rabbit,
    color: '#5FD9CE',
    image: '',
    keys: ['Z', 'X', 'C'],
    rival: null,
    lines: { win: '계획대로야. 다들 잘 따라왔어.', winLost: '…리더로서 할 말이 없네.', lose: '이번엔 양보한 걸로 하자.' },
  },
  {
    id: 'frog',
    name: S.chars.frog,
    color: '#8BE04B',
    image: '',
    keys: ['V', 'B', 'N'],
    rival: 'monkey',
    lines: { win: '…당연한 결과다. 원숭이는 신경 안 썼다.', winLost: '점수는 이겼다. …지구는 졌다.', lose: '…다음 임무에서 만회한다.' },
  },
  {
    id: 'monkey',
    name: S.chars.monkey,
    color: '#FF8A3D',
    image: '',
    keys: [',', '.', '/'],
    rival: 'frog',
    lines: { win: '봤어? 봤지? 내가 제일 많이 주웠지?', winLost: '그래도 내가 1등이잖아! …어, 지구가?', lose: '에이 연습이었어! 한 판 더!' },
  },
];

export function charOf(slot) {
  return CHARACTERS[slot] ?? CHARACTERS[0];
}
