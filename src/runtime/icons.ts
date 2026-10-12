/**
 * 공용 라인 아이콘 세트 — 색상 이모지(OS 폰트 의존, 플랫폼마다 다르게 렌더링) 대체.
 *
 * 전부 24x24 뷰박스의 stroke 기반 라인 아이콘이라 currentColor 를 따라가고(호버·active 시
 * 자동으로 앰버색 전환), 크기는 font-size 상속(1em)이라 배치할 곳의 CSS만 맞추면 된다.
 * innerHTML 문자열을 쓰는 일반 .ts 러너타임과 JSX(App.tsx) 양쪽에서 이 한 곳만 참조한다.
 */

export type IconName =
  | 'twin' | 'map' | 'training' | 'build' | 'watch' | 'infil' | 'ipb' | 'fires'
  | 'decision' | 'guide'
  | 'tour' | 'eye' | 'walk' | 'run' | 'truck' | 'drone' | 'antenna' | 'sliders'
  | 'camera' | 'video' | 'tower' | 'hut' | 'ruin' | 'pin' | 'clipboard' | 'target'
  | 'plane' | 'printer' | 'trash' | 'ruler' | 'compass' | 'trophy' | 'graduate'
  | 'medal' | 'bulb' | 'arrow-right' | 'desktop' | 'close'
  | 'weather-clear' | 'weather-fog' | 'weather-snow' | 'weather-rain' | 'weather-night';

const S = 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
const DOT = 'fill="currentColor" stroke="none"';

/** 아이콘 내부 마크업(패스류) — 지오메트리의 단일 출처. */
const ICON_BODY: Record<IconName, string> = {
  twin: `<circle cx="12" cy="12" r="6.1"/><circle cx="12" cy="12" r="1.3" ${DOT}/>
    <line x1="12" y1="2" x2="12" y2="5.3"/><line x1="12" y1="18.7" x2="12" y2="22"/>
    <line x1="2" y1="12" x2="5.3" y2="12"/><line x1="18.7" y1="12" x2="22" y2="12"/>`,
  map: `<polygon points="12,3 21,8 12,13 3,8"/><polyline points="3,12 12,17 21,12"/><polyline points="3,16 12,21 21,16"/>`,
  training: `<line x1="3" y1="20" x2="21" y2="20"/><rect x="6" y="12" width="3" height="8"/>
    <rect x="11" y="7" width="3" height="13"/><rect x="16" y="15" width="3" height="5"/>`,
  build: `<rect x="3" y="4" width="18" height="16" rx="1"/><line x1="3" y1="10" x2="21" y2="10"/>
    <line x1="9" y1="10" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="10"/>`,
  watch: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5" opacity="0.55"/>
    <circle cx="12" cy="12" r="1.3" ${DOT}/><line x1="12" y1="12" x2="18" y2="6.5"/>`,
  infil: `<path d="M4 19c4 0 2-7 6-7s2-7 6-7" stroke-dasharray="2.6 2.6"/><polyline points="14.5,2.6 18.5,5 16.5,9"/>`,
  ipb: `<rect x="3" y="3" width="18" height="18"/><rect x="7.5" y="7.5" width="9" height="9"/>
    <line x1="12" y1="3" x2="12" y2="7.5"/><line x1="12" y1="16.5" x2="12" y2="21"/>
    <line x1="3" y1="12" x2="7.5" y2="12"/><line x1="16.5" y1="12" x2="21" y2="12"/>`,
  fires: `<path d="M12 2 14.1 9 21 9 15.6 13.4 17.6 21 12 16.6 6.4 21 8.4 13.4 3 9 9.9 9 Z"/>`,
  decision: `<circle cx="12" cy="4.3" r="1.9"/><circle cx="4.6" cy="18.5" r="1.9"/><circle cx="19.4" cy="18.5" r="1.9"/>
    <line x1="12" y1="6.2" x2="6" y2="16.8"/><line x1="12" y1="6.2" x2="18" y2="16.8"/><line x1="6.4" y1="18.5" x2="17.6" y2="18.5"/>`,
  guide: `<path d="M4 5c3-1 5.5-.5 8 1 2.5-1.5 5-2 8-1v13c-3-1-5.5-.5-8 1-2.5-1.5-5-2-8-1z"/><line x1="12" y1="6" x2="12" y2="19"/>`,
  tour: `<ellipse cx="12" cy="12" rx="9" ry="4.2"/><circle cx="19.4" cy="9.7" r="1.5" ${DOT}/>`,
  eye: `<path d="M2 12c3-6 7-8 10-8s7 2 10 8c-3 6-7 8-10 8s-7-2-10-8z"/><circle cx="12" cy="12" r="3"/>`,
  walk: `<circle cx="12" cy="5" r="2" ${DOT}/><line x1="12" y1="7.4" x2="12" y2="14"/>
    <line x1="12" y1="9.4" x2="8" y2="12.6"/><line x1="12" y1="9.4" x2="16" y2="7.6"/>
    <line x1="12" y1="14" x2="8.4" y2="20.6"/><line x1="12" y1="14" x2="15.2" y2="20.6"/>`,
  run: `<circle cx="14.2" cy="4.8" r="2" ${DOT}/><line x1="13.2" y1="7.2" x2="10" y2="13"/>
    <line x1="10" y1="13" x2="5.6" y2="11.8"/><line x1="10" y1="13" x2="7.6" y2="20.6"/>
    <line x1="13.2" y1="7.2" x2="17.8" y2="9.4"/><line x1="17.8" y1="9.4" x2="15.6" y2="15.4"/>
    <line x1="15.6" y1="15.4" x2="18.8" y2="20.2"/>`,
  truck: `<rect x="2" y="10" width="11" height="7" rx="1"/><path d="M13 12h4l3 3v2h-7z"/>
    <circle cx="7" cy="19" r="1.7"/><circle cx="17" cy="19" r="1.7"/>`,
  drone: `<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>
    <line x1="7.4" y1="7.4" x2="10.6" y2="10.6"/><line x1="16.6" y1="7.4" x2="13.4" y2="10.6"/>
    <line x1="7.4" y1="16.6" x2="10.6" y2="13.4"/><line x1="16.6" y1="16.6" x2="13.4" y2="13.4"/>
    <rect x="10" y="10" width="4" height="4"/>`,
  antenna: `<line x1="12" y1="21" x2="12" y2="13"/><path d="M7.5 13a4.5 4.5 0 0 1 9 0"/>
    <path d="M4.2 9.4a9.5 9.5 0 0 1 15.6 0"/><circle cx="12" cy="21" r="1" ${DOT}/>`,
  sliders: `<line x1="5" y1="4" x2="5" y2="20"/><circle cx="5" cy="9" r="2" ${DOT}/>
    <line x1="12" y1="4" x2="12" y2="20"/><circle cx="12" cy="15" r="2" ${DOT}/>
    <line x1="19" y1="4" x2="19" y2="20"/><circle cx="19" cy="7" r="2" ${DOT}/>`,
  camera: `<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7l1.4-2.2h4.2L15.5 7"/><circle cx="12" cy="14" r="4"/>`,
  video: `<rect x="3" y="6" width="12" height="12" rx="1.5"/><path d="M15 10l6-3v10l-6-3z"/>`,
  tower: `<line x1="12" y1="2" x2="5" y2="22"/><line x1="12" y1="2" x2="19" y2="22"/>
    <line x1="8.3" y1="12" x2="15.7" y2="12"/><line x1="6.6" y1="17" x2="17.4" y2="17"/><line x1="9.7" y1="7" x2="14.3" y2="7"/>`,
  hut: `<path d="M3 12l9-7 9 7"/><rect x="5.5" y="12" width="13" height="8"/><line x1="9.5" y1="20" x2="9.5" y2="15.5"/>`,
  ruin: `<path d="M4 20V10l4-4 4 4v2l3-3 5 5v6z"/><line x1="4" y1="20" x2="20" y2="20"/><line x1="9" y1="14" x2="12" y2="16.5"/>`,
  pin: `<path d="M12 21s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.3"/>`,
  clipboard: `<rect x="6" y="4" width="12" height="17" rx="1.5"/><rect x="9" y="2.4" width="6" height="3" rx="1"/>
    <line x1="8.5" y1="10" x2="15.5" y2="10"/><line x1="8.5" y1="14" x2="15.5" y2="14"/><line x1="8.5" y1="18" x2="13" y2="18"/>`,
  target: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" ${DOT}/>`,
  plane: `<path d="M21 4L3 11l6 2 2 7 3-4 5 2z"/>`,
  printer: `<rect x="6" y="3" width="12" height="6" rx="1"/><rect x="4" y="9" width="16" height="8" rx="1.5"/><rect x="8" y="15" width="8" height="6"/>`,
  trash: `<line x1="4" y1="7" x2="20" y2="7"/><path d="M6 7l1 13h10l1-13"/>
    <line x1="10" y1="4" x2="14" y2="4"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>`,
  ruler: `<path d="M4 4h16v16z"/><line x1="8" y1="4" x2="8" y2="7"/><line x1="12" y1="4" x2="12" y2="8"/><line x1="16" y1="4" x2="16" y2="7"/>`,
  compass: `<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5L12 12l-3.5 3.5L12 12z"/>`,
  trophy: `<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 5H4v2a3 3 0 0 0 3 3"/><path d="M17 5h3v2a3 3 0 0 1-3 3"/>
    <line x1="12" y1="13" x2="12" y2="17"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="9" y1="20" x2="9" y2="17.4"/><line x1="15" y1="20" x2="15" y2="17.4"/>`,
  graduate: `<path d="M2 9l10-4 10 4-10 4z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/><line x1="20" y1="9" x2="20" y2="15.2"/>`,
  medal: `<circle cx="12" cy="15" r="5"/><path d="M9 10.4L7 3h3l2 6.4"/><path d="M15 10.4L17 3h-3l-2 6.4"/><polyline points="10,15.2 11.6,16.8 14.2,13.6"/>`,
  bulb: `<line x1="9.5" y1="18" x2="14.5" y2="18"/><line x1="10.2" y1="21" x2="13.8" y2="21"/>
    <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>`,
  'arrow-right': `<line x1="3" y1="12" x2="16" y2="12"/><polyline points="11,7 16,12 11,17"/>`,
  desktop: `<rect x="3" y="4" width="18" height="12" rx="1.5"/><line x1="8" y1="20" x2="16" y2="20"/><line x1="12" y1="16" x2="12" y2="20"/>`,
  close: `<line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/>`,
  'weather-clear': `<circle cx="12" cy="12" r="4.4"/><line x1="12" y1="2.4" x2="12" y2="5.2"/><line x1="12" y1="18.8" x2="12" y2="21.6"/>
    <line x1="2.4" y1="12" x2="5.2" y2="12"/><line x1="18.8" y1="12" x2="21.6" y2="12"/>
    <line x1="5.1" y1="5.1" x2="7.1" y2="7.1"/><line x1="16.9" y1="16.9" x2="18.9" y2="18.9"/>
    <line x1="18.9" y1="5.1" x2="16.9" y2="7.1"/><line x1="7.1" y1="16.9" x2="5.1" y2="18.9"/>`,
  'weather-fog': `<path d="M6.5 11.5a4 4 0 0 1 7.6-2.2 3.3 3.3 0 0 1 4.4 3.1" opacity="0.85"/>
    <line x1="4" y1="14" x2="20" y2="14"/><line x1="6" y1="17.5" x2="18" y2="17.5"/><line x1="8" y1="21" x2="16" y2="21"/>`,
  'weather-snow': `<line x1="12" y1="3" x2="12" y2="21"/><line x1="4.5" y1="7.5" x2="19.5" y2="16.5"/><line x1="4.5" y1="16.5" x2="19.5" y2="7.5"/>
    <circle cx="12" cy="12" r="1" ${DOT}/>`,
  'weather-rain': `<path d="M7 13a4.6 4.6 0 0 1 .9-9.1A5.6 5.6 0 0 1 18.6 7 3.6 3.6 0 0 1 17.6 14H7z"/>
    <line x1="8.5" y1="17.5" x2="7.5" y2="20.5"/><line x1="12.5" y1="17.5" x2="11.5" y2="20.5"/><line x1="16.5" y1="17.5" x2="15.5" y2="20.5"/>`,
  'weather-night': `<path d="M20 14.2A8.4 8.4 0 1 1 9.8 4a7 7 0 0 0 10.2 10.2z"/>`,
};

/** innerHTML 문자열용 — 일반 .ts 러너타임 전체에서 사용. */
export function svgIcon(name: IconName, className = ''): string {
  const body = ICON_BODY[name] ?? '';
  const cls = `icon icon-${name}${className ? ` ${className}` : ''}`;
  return `<svg class="${cls}" viewBox="0 0 24 24" ${S} aria-hidden="true" focusable="false">${body}</svg>`;
}

/** App.tsx(JSX)에서 dangerouslySetInnerHTML로 소비하는 원본 문자열. */
export function iconMarkup(name: IconName): string {
  return svgIcon(name);
}
