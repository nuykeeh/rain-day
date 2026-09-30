// 입력 매핑. 실물 장치가 다르게 잡히면 여기만 고친다. (PRD 7.3)

// 키보드는 반드시 event.code(물리 키)로 판정한다.
// 한글 입력 상태에서 event.key 는 'ㅋ' 등으로 바뀌지만 code 는 물리 키 그대로다.
export const KEYBOARD = [
  { L: 'KeyZ', M: 'KeyX', R: 'KeyC' },      // P1
  { L: 'KeyV', M: 'KeyB', R: 'KeyN' },      // P2
  { L: 'Comma', M: 'Period', R: 'Slash' },  // P3
];
