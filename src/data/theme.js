// 색 토큰과 이미지 경로. 아트가 오면 여기만 바꾼다. (PRD 1-2)

export const THEME = {
  color: {
    bg: '#111114',
    bgDeep: '#08080A',
    card: '#1C1C21',
    accent: '#5FD9CE',
    warn: '#E8B04B',
    text: '#C0C0C6',
    textStrong: '#F2F2F5',
    dim: '#5A5A63',
    danger: '#FF5B4A',
    earth: '#3F7FD8',
    earthLand: '#4FA86B',
    ship: '#9AA3B8',
    letterbox: '#000000',
  },

  // 비어 있으면 도형으로 그린다. 'img/xxx.png' 형태.
  prologuePanels: ['', '', '', ''],
  background: '',
  shipImage: '',

  junkKinds: {
    scrap:  { label: '고철 조각', color: '#B9BCC4', image: '' },
    meteor: { label: '불타는 운석', color: '#FF7A3D', image: '' },
  },
};
