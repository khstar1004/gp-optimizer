// @ts-nocheck
/**
 * 타격 피드백 — 데미지 넘버와 전투 로그
 *
 * 게임이 「맞았다」를 알리는 방식은 두 가지다. 맞은 자리에서 **숫자가 튀어오르고**,
 * 화면 한쪽에 **한 줄이 쌓인다**. 이 화면에도 그 둘이 필요하다 — HP 막대만으로는
 * 「방금 이 발이 저 동에 얼마를 넣었는가」를 알 수 없고, 12 발이 흐르는 동안 무슨
 * 일이 있었는지 되짚을 방법도 없다.
 *
 * 둘 다 **시각 t 의 순수 함수**로 만든다. 발이 떨어질 때 이벤트를 「발생시키는」 방식이
 * 아니라, 계획이 정해지는 순간 전체 목록을 미리 계산해 두고 t 로 잘라 보여 준다.
 * 그래야 재생 막대를 되감아도 같은 숫자가 같은 자리에서 다시 튄다.
 */

const css = (h) => Cesium.Color.fromCssColorString(h);

/** 튀어오르는 숫자 하나를 캔버스로. 색·굵기가 등급을 그대로 말한다. */
function numberSprite(text, color, big) {
  const S = 2;
  const pad = 10 * S;
  const size = (big ? 30 : 22) * S;
  const c = document.createElement('canvas');
  const probe = c.getContext('2d');
  probe.font = `800 ${size}px "Chakra Petch", sans-serif`;
  const w = Math.ceil(probe.measureText(text).width) + pad * 2;
  const h = Math.ceil(size * 1.5) + pad;
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.font = `800 ${size}px "Chakra Petch", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 6 * S;
  g.strokeStyle = 'rgba(3,6,9,0.92)';
  g.strokeText(text, w / 2, h / 2);
  g.fillStyle = color;
  g.fillText(text, w / 2, h / 2);
  return c;
}

/**
 * 데미지 넘버 풀.
 *
 * 엔티티를 미리 만들어 두고 돌려 쓴다 — 발마다 만들었다 지우면 12 발 × 대상 수만큼
 * 엔티티가 생겼다 사라지고, 그 사이 Cesium 이 매번 프리미티브를 다시 굽는다.
 */
export class DamageNumbers {
  constructor(dataSource, poolSize = 28) {
    this.ds = dataSource;
    this.pool = [];
    this.cache = new Map();
    for (let i = 0; i < poolSize; i++) {
      this.pool.push(dataSource.entities.add({
        id: `sk-dmg-${i}`,
        billboard: {
          image: numberSprite('0', '#fff', false),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(150, 1.0, 5000, 0.35),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 7000),
        },
        show: false,
      }));
    }
  }

  _sprite(text, color, big) {
    const key = `${text}|${color}|${big ? 1 : 0}`;
    let img = this.cache.get(key);
    if (!img) {
      img = numberSprite(text, color, big);
      this.cache.set(key, img);
      if (this.cache.size > 400) this.cache.clear();
    }
    return img;
  }

  /**
   * 시각 t 에 살아 있는 숫자들을 그린다.
   *
   * @param hits [{ at, lon, lat, h, text, color, big }] — 미리 계산해 둔 전체 목록
   */
  update(t, hits) {
    const LIFE = 1.7;
    let slot = 0;
    for (const hit of hits) {
      const age = t - hit.at;
      if (age < 0 || age > LIFE) continue;
      if (slot >= this.pool.length) break;
      const e = this.pool[slot++];
      const u = age / LIFE;
      // 튀어올랐다 잦아든다 — 처음이 빠르고 끝이 느리다
      const rise = 14 * (1 - (1 - u) ** 2.2);
      e.show = true;
      e.position = Cesium.Cartesian3.fromDegrees(hit.lon, hit.lat, hit.h + rise);
      const img = this._sprite(hit.text, hit.color, hit.big);
      if (e._img !== img) { e._img = img; e.billboard.image = img; }
      e.billboard.width = img.width / 2 * (hit.big ? 0.62 : 0.5);
      e.billboard.height = img.height / 2 * (hit.big ? 0.62 : 0.5);
      // 마지막 35 % 에서만 사라진다 — 너무 일찍 흐려지면 읽을 시간이 없다
      e.billboard.color = Cesium.Color.WHITE.withAlpha(
        u < 0.65 ? 1 : 1 - (u - 0.65) / 0.35);
    }
    for (; slot < this.pool.length; slot++) this.pool[slot].show = false;
  }

  clear() {
    for (const e of this.pool) e.show = false;
  }
}

// ───────────────────────── 전투 로그 ─────────────────────────

export const FEED_ICON = {
  impact: '◉', destroyed: '✖', severe: '▲', moderate: '△', light: '·',
  magazine: '⚠', done: '■',
};

/**
 * 화면 한쪽에 쌓이는 전투 로그.
 *
 * 리스트를 매 프레임 다시 만들지 않는다 — 보여야 할 개수가 바뀔 때만 손댄다.
 * 되감으면 줄이 사라지고, 다시 감으면 같은 순서로 다시 나타난다.
 */
export class KillFeed {
  constructor(host) {
    this.el = document.createElement('div');
    this.el.id = 'strike-feed';
    this.el.className = 'hidden';
    host?.appendChild(this.el);
    this.shown = -1;
    this.events = [];
  }

  setEvents(events) {
    this.events = [...events].sort((a, b) => a.at - b.at);
    this.shown = -1;
    this.el.innerHTML = '';
  }

  /** 시각 t 까지의 줄만 남긴다. */
  syncTo(t) {
    const n = this.events.filter((e) => e.at <= t).length;
    if (n === this.shown) return;
    this.shown = n;
    const recent = this.events.slice(Math.max(0, n - 9), n).reverse();
    this.el.classList.toggle('hidden', n === 0);
    this.el.innerHTML = recent.map((e, i) => `
      <div class="sf-row${i === 0 ? ' sf-new' : ''}" style="--sf: ${e.color}">
        <span class="sf-ic">${FEED_ICON[e.kind] ?? '·'}</span>
        <span class="sf-t">${clock(e.at)}</span>
        <span class="sf-x">${escape(e.text)}</span>
      </div>`).join('');
  }

  setVisible(v) { this.el.classList.toggle('sf-off', !v); }

  clear() {
    this.events = [];
    this.shown = -1;
    this.el.innerHTML = '';
    this.el.classList.add('hidden');
  }

  destroy() { this.el.remove(); }
}

function clock(s) {
  const v = Math.max(0, s);
  return `${Math.floor(v / 60).toString().padStart(2, '0')}:${Math.floor(v % 60).toString().padStart(2, '0')}`;
}

function escape(s) {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
