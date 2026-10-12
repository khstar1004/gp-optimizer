/**
 * MGRS(군사좌표) 정변환 — proj4js/mgrs (MIT) 포팅
 * lon/lat(WGS84) → "52S CG 12345 67890" 형식
 */
const NUM_100K_SETS = 6;
const SET_ORIGIN_COLUMN_LETTERS = 'AJSAJS';
const SET_ORIGIN_ROW_LETTERS = 'AFAFAF';
const A = 65, I = 73, O = 79, V = 86, Z = 90;

function degToRad(deg: number): number { return deg * (Math.PI / 180); }

/** mgrs.js LLtoUTM 포팅 (WGS84) */
export function LLtoUTM(lat: number, lon: number): { northing: number; easting: number; zoneNumber: number; zoneLetter: string } {
  const a = 6378137;
  const eccSquared = 0.00669438;
  const k0 = 0.9996;
  const LatRad = degToRad(lat);
  const LongRad = degToRad(lon);
  let ZoneNumber = Math.floor((lon + 180) / 6) + 1;
  if (lon === 180) ZoneNumber = 60;
  // 노르웨이/스발바르 예외 생략 (한반도 무관)
  const LongOrigin = (ZoneNumber - 1) * 6 - 180 + 3;
  const LongOriginRad = degToRad(LongOrigin);
  const eccPrimeSquared = eccSquared / (1 - eccSquared);
  const N = a / Math.sqrt(1 - eccSquared * Math.sin(LatRad) * Math.sin(LatRad));
  const T = Math.tan(LatRad) * Math.tan(LatRad);
  const C = eccPrimeSquared * Math.cos(LatRad) * Math.cos(LatRad);
  const Aa = Math.cos(LatRad) * (LongRad - LongOriginRad);
  const M = a * (
    (1 - eccSquared / 4 - 3 * eccSquared * eccSquared / 64 - 5 * eccSquared * eccSquared * eccSquared / 256) * LatRad
    - (3 * eccSquared / 8 + 3 * eccSquared * eccSquared / 32 + 45 * eccSquared * eccSquared * eccSquared / 1024) * Math.sin(2 * LatRad)
    + (15 * eccSquared * eccSquared / 256 + 45 * eccSquared * eccSquared * eccSquared / 1024) * Math.sin(4 * LatRad)
    - (35 * eccSquared * eccSquared * eccSquared / 3072) * Math.sin(6 * LatRad));
  const UTMEasting = k0 * N * (Aa + (1 - T + C) * Aa * Aa * Aa / 6
    + (5 - 18 * T + T * T + 72 * C - 58 * eccPrimeSquared) * Aa * Aa * Aa * Aa * Aa / 120) + 500000;
  let UTMNorthing = k0 * (M + N * Math.tan(LatRad) * (Aa * Aa / 2
    + (5 - T + 9 * C + 4 * C * C) * Aa * Aa * Aa * Aa / 24
    + (61 - 58 * T + T * T + 600 * C - 330 * eccPrimeSquared) * Aa * Aa * Aa * Aa * Aa * Aa / 720));
  if (lat < 0) UTMNorthing += 10000000;
  return { northing: Math.round(UTMNorthing), easting: Math.round(UTMEasting), zoneNumber: ZoneNumber, zoneLetter: getLetterDesignator(lat) };
}

/** mgrs.js UTMtoLL 포팅 (WGS84 역변환) — 격자 오버레이용 */
export function UTMtoLL(northing: number, easting: number, zoneNumber: number, northHemi = true): { lat: number; lon: number } {
  const k0 = 0.9996;
  const a = 6378137;
  const eccSquared = 0.00669438;
  const e1 = (1 - Math.sqrt(1 - eccSquared)) / (1 + Math.sqrt(1 - eccSquared));
  const x = easting - 500000;
  let y = northing;
  if (!northHemi) y -= 10000000;
  const LongOrigin = (zoneNumber - 1) * 6 - 180 + 3;
  const eccPrimeSquared = eccSquared / (1 - eccSquared);
  const M = y / k0;
  const mu = M / (a * (1 - eccSquared / 4 - 3 * eccSquared * eccSquared / 64
    - 5 * eccSquared * eccSquared * eccSquared / 256));
  const phi1Rad = mu
    + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu)
    + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu)
    + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu);
  const N1 = a / Math.sqrt(1 - eccSquared * Math.sin(phi1Rad) * Math.sin(phi1Rad));
  const T1 = Math.tan(phi1Rad) * Math.tan(phi1Rad);
  const C1 = eccPrimeSquared * Math.cos(phi1Rad) * Math.cos(phi1Rad);
  const R1 = a * (1 - eccSquared) / Math.pow(1 - eccSquared * Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
  const D = x / (N1 * k0);
  let lat = phi1Rad - (N1 * Math.tan(phi1Rad) / R1) * (D * D / 2
    - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * eccPrimeSquared) * D * D * D * D / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * eccPrimeSquared - 3 * C1 * C1) * D * D * D * D * D * D / 720);
  lat = lat * (180 / Math.PI);
  let lon = (D - (1 + 2 * T1 + C1) * D * D * D / 6
    + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * eccPrimeSquared + 24 * T1 * T1) * D * D * D * D * D / 120)
    / Math.cos(phi1Rad);
  lon = LongOrigin + lon * (180 / Math.PI);
  return { lat, lon };
}

function getLetterDesignator(lat: number): string {
  const letters = 'CDEFGHJKLMNPQRSTUVWX';
  if (lat <= 84 && lat >= -80) {
    const idx = Math.floor((lat + 80) / 8);
    return letters.charAt(Math.min(idx, letters.length - 1));
  }
  return 'Z';
}

/** mgrs.js getLetter100kID 포팅 */
function getLetter100kID(column: number, row: number, parm: number): string {
  const index = parm - 1;
  const colOrigin = SET_ORIGIN_COLUMN_LETTERS.charCodeAt(index);
  const rowOrigin = SET_ORIGIN_ROW_LETTERS.charCodeAt(index);
  let colInt = colOrigin + column - 1;
  let rowInt = rowOrigin + row;
  let rollover = false;
  if (colInt > Z) { colInt = colInt - Z + A - 1; rollover = true; }
  if (colInt === I || (colOrigin < I && colInt > I) || ((colInt > I || colOrigin < I) && rollover)) colInt++;
  if (colInt === O || (colOrigin < O && colInt > O) || ((colInt > O || colOrigin < O) && rollover)) {
    colInt++;
    if (colInt === I) colInt++;
  }
  if (colInt > Z) colInt = colInt - Z + A - 1;
  if (rowInt > V) { rowInt = rowInt - V + A - 1; rollover = true; } else rollover = false;
  if (rowInt === I || (rowOrigin < I && rowInt > I) || ((rowInt > I || rowOrigin < I) && rollover)) rowInt++;
  if (rowInt === O || (rowOrigin < O && rowInt > O) || ((rowInt > O || rowOrigin < O) && rollover)) {
    rowInt++;
    if (rowInt === I) rowInt++;
  }
  if (rowInt > V) rowInt = rowInt - V + A - 1;
  return String.fromCharCode(colInt) + String.fromCharCode(rowInt);
}

/** lon/lat → MGRS 문자열 (기본 5자리 = 1m 정밀) */
export function toMGRS(lon: number, lat: number, accuracy = 5): string {
  const utm = LLtoUTM(lat, lon);
  const setParm = ((utm.zoneNumber - 1) % NUM_100K_SETS) + 1;
  const setColumn = Math.floor(utm.easting / 100000);
  const setRow = Math.floor(utm.northing / 100000) % 20;
  const id100k = getLetter100kID(setColumn, setRow, setParm);
  const seasting = String(utm.easting % 100000).padStart(5, '0').substring(0, accuracy);
  const snorthing = String(utm.northing % 100000).padStart(5, '0').substring(0, accuracy);
  return `${utm.zoneNumber}${utm.zoneLetter} ${id100k} ${seasting} ${snorthing}`;
}

