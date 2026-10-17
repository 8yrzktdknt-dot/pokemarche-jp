/**
 * Illustrations des cartes Pack Rush, dessinées par le code (SVG) : univers cosmique original (astres, nébuleuses,
 * constellations), aucune image ni personnage sous licence. Chaque carte a son motif (`kind`), sa teinte (`hue`) et
 * sa graine (`seed`, étoiles et nébuleuses), enregistrés avec la carte sur le serveur ; le cadre suit la rareté.
 */
export type PrRarity = 'C' | 'U' | 'R' | 'SR' | 'SSR';
export const PR_RARITIES: PrRarity[] = ['C', 'U', 'R', 'SR', 'SSR'];

export interface PrArt { kind?: string; hue?: number; seed?: number }

/** Couleurs du cadre et symbole de chaque rareté. */
export const RARITY_STYLE: Record<PrRarity, { frame: string[]; symbol: string; glow: string }> = {
  C: { frame: ['#5E7D6B', '#8FA89A'], symbol: '●', glow: '#8FA89A' },
  U: { frame: ['#9AA7B4', '#E3E8EE'], symbol: '◆', glow: '#C9D3DD' },
  R: { frame: ['#C9971F', '#F4C542'], symbol: '★', glow: '#F4C542' },
  SR: { frame: ['#F4C542', '#E86FB5', '#7C6CF0'], symbol: '★★', glow: '#E86FB5' },
  SSR: { frame: ['#FF5E7E', '#F4C542', '#3DDC97', '#4FA3FF', '#B26CFF'], symbol: '★★★', glow: '#FFFFFF' },
};

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 250, H = 350;
const CX = W / 2, CY = 150;
const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${Math.round(((h % 360) + 360) % 360)},${s}%,${l}%,${a})`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Motif central selon le type d'astre. */
function motif(kind: string, h: number, r: () => number): string {
  switch (kind) {
    case 'planet': {
      const tilt = -20 + r() * 40;
      return `<circle cx="${CX}" cy="${CY}" r="46" fill="url(#body)"/>
        <ellipse cx="${CX}" cy="${CY}" rx="78" ry="16" fill="none" stroke="${hsl(h + 50, 80, 75, 0.85)}" stroke-width="5" transform="rotate(${tilt} ${CX} ${CY})"/>
        <path d="M${CX - 46} ${CY} a46 46 0 0 0 92 0" fill="url(#body)" transform="rotate(${tilt} ${CX} ${CY})"/>`;
    }
    case 'comet':
      return `<path d="M${CX + 30} ${CY - 30} L${CX - 95} ${CY + 70} L${CX - 70} ${CY + 85} Z" fill="url(#tail)" opacity="0.9"/>
        <circle cx="${CX + 30}" cy="${CY - 30}" r="20" fill="${hsl(h + 30, 90, 85)}" filter="url(#glow)"/>`;
    case 'nebula':
      return [0, 1, 2, 3].map((i) => `<ellipse cx="${CX - 30 + r() * 60}" cy="${CY - 30 + r() * 60}" rx="${40 + r() * 40}" ry="${25 + r() * 30}" fill="${hsl(h + i * 35, 85, 60, 0.55)}" filter="url(#blur)" transform="rotate(${r() * 180} ${CX} ${CY})"/>`).join('')
        + `<circle cx="${CX}" cy="${CY}" r="10" fill="#fff" filter="url(#glow)"/>`;
    case 'star': {
      const pts = Array.from({ length: 16 }, (_, i) => {
        const a = (i * Math.PI) / 8, rad = i % 2 ? 22 : 70;
        return `${CX + Math.cos(a) * rad},${CY + Math.sin(a) * rad}`;
      }).join(' ');
      return `<polygon points="${pts}" fill="${hsl(h + 40, 95, 80)}" filter="url(#glow)"/><circle cx="${CX}" cy="${CY}" r="18" fill="#fff"/>`;
    }
    case 'crystal':
      return [0, 1, 2, 3, 4].map((i) => {
        const a = -90 + (i - 2) * 24, len = 60 + r() * 30, w = 14 + r() * 8;
        return `<polygon points="${CX},${CY + 40} ${CX - w},${CY + 10} ${CX},${CY + 40 - len - 30} ${CX + w},${CY + 10}" fill="${hsl(h + i * 12, 75, 55 + i * 5, 0.9)}" stroke="${hsl(h, 90, 85)}" stroke-width="1.5" transform="rotate(${a + 90} ${CX} ${CY + 40})"/>`;
      }).join('');
    case 'moon':
      return `<circle cx="${CX}" cy="${CY}" r="52" fill="${hsl(h + 30, 30, 85)}" filter="url(#glow)"/>
        <circle cx="${CX + 26}" cy="${CY - 14}" r="48" fill="url(#bg)"/>
        <circle cx="${CX - 26}" cy="${CY + 14}" r="6" fill="${hsl(h, 20, 70, 0.6)}"/><circle cx="${CX - 12}" cy="${CY + 32}" r="4" fill="${hsl(h, 20, 70, 0.6)}"/>`;
    case 'galaxy':
      return [0, 1].map((k) => {
        const d = Array.from({ length: 40 }, (_, i) => {
          const t = i / 39, a = t * 3.6 * Math.PI + k * Math.PI, rad = 6 + t * 80;
          return `${i ? 'L' : 'M'}${(CX + Math.cos(a) * rad).toFixed(1)} ${(CY + Math.sin(a) * rad * 0.6).toFixed(1)}`;
        }).join(' ');
        return `<path d="${d}" fill="none" stroke="${hsl(h + k * 60, 85, 70, 0.8)}" stroke-width="9" stroke-linecap="round" filter="url(#blur)"/>`;
      }).join('') + `<ellipse cx="${CX}" cy="${CY}" rx="18" ry="12" fill="#fff" filter="url(#glow)"/>`;
    case 'eclipse':
      return `<circle cx="${CX}" cy="${CY}" r="58" fill="none" stroke="${hsl(h + 30, 95, 70)}" stroke-width="10" filter="url(#glow)"/>
        <circle cx="${CX}" cy="${CY}" r="52" fill="#05080A"/>`;
    case 'pulsar':
      return `<polygon points="${CX - 8},${CY} ${CX},${CY - 120} ${CX + 8},${CY}" fill="url(#beam)"/>
        <polygon points="${CX - 8},${CY} ${CX},${CY + 120} ${CX + 8},${CY}" fill="url(#beam)"/>
        <circle cx="${CX}" cy="${CY}" r="16" fill="${hsl(h + 180, 90, 80)}" filter="url(#glow)"/>`;
    default: {
      // Constellation : étoiles reliées.
      const pts = Array.from({ length: 6 }, () => [CX - 80 + r() * 160, CY - 70 + r() * 140]);
      return `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${hsl(h + 40, 80, 80, 0.8)}" stroke-width="2"/>`
        + pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${4 + r() * 3}" fill="#fff" filter="url(#glow)"/>`).join('');
    }
  }
}

/** Illustration complète d'une carte (SVG). `owned` faux : silhouette sombre (carte manquante). */
export function cardSvg(card: { name: string; number: number; rarity: PrRarity; art: PrArt }, total: number, owned = true): string {
  const { kind = 'star', hue = 200, seed = 1 } = card.art ?? {};
  const r = rng(seed);
  const st = RARITY_STYLE[card.rarity] ?? RARITY_STYLE.C;
  const stops = st.frame.map((c, i) => `<stop offset="${(i / Math.max(1, st.frame.length - 1)) * 100}%" stop-color="${c}"/>`).join('');
  const stars = Array.from({ length: 46 }, () => `<circle cx="${(r() * W).toFixed(1)}" cy="${(r() * 260).toFixed(1)}" r="${(0.4 + r() * 1.4).toFixed(2)}" fill="#fff" opacity="${(0.3 + r() * 0.7).toFixed(2)}"/>`).join('');
  const art = owned ? motif(kind, hue, r) : `<text x="${CX}" y="${CY + 22}" text-anchor="middle" font-family="sans-serif" font-size="72" font-weight="700" fill="rgba(255,255,255,0.18)">?</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="frame" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient>
    <radialGradient id="bg" cx="50%" cy="40%" r="75%"><stop offset="0%" stop-color="${owned ? hsl(hue + 30, 65, 30) : '#16231C'}"/><stop offset="100%" stop-color="${owned ? hsl(hue, 70, 8) : '#0A120E'}"/></radialGradient>
    <radialGradient id="body" cx="35%" cy="35%" r="70%"><stop offset="0%" stop-color="${hsl(hue + 20, 80, 75)}"/><stop offset="100%" stop-color="${hsl(hue - 20, 70, 28)}"/></radialGradient>
    <linearGradient id="tail" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${hsl(hue + 30, 95, 85)}"/><stop offset="100%" stop-color="${hsl(hue, 90, 50, 0)}"/></linearGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${hsl(hue + 180, 90, 85, 0)}"/><stop offset="50%" stop-color="${hsl(hue + 180, 90, 85)}"/><stop offset="100%" stop-color="${hsl(hue + 180, 90, 85, 0)}"/></linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
    <clipPath id="win"><rect x="14" y="14" width="${W - 28}" height="250" rx="10"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" rx="16" fill="url(#frame)"/>
  <rect x="7" y="7" width="${W - 14}" height="${H - 14}" rx="12" fill="#0B1712"/>
  <g clip-path="url(#win)"><rect x="14" y="14" width="${W - 28}" height="250" fill="url(#bg)"/>${stars}${art}</g>
  <rect x="14" y="14" width="${W - 28}" height="250" rx="10" fill="none" stroke="url(#frame)" stroke-width="2"/>
  <text x="${CX}" y="296" text-anchor="middle" font-family="sans-serif" font-size="${card.name.length > 11 ? 19 : 22}" font-weight="800" fill="${owned ? '#F2F5F3' : '#5F7468'}">${owned ? esc(card.name) : '???'}</text>
  <text x="22" y="333" font-family="sans-serif" font-size="13" font-weight="700" fill="#8FA89A">${String(card.number).padStart(3, '0')}/${String(total).padStart(3, '0')}</text>
  <text x="${W - 22}" y="333" text-anchor="end" font-family="sans-serif" font-size="14" font-weight="700" fill="${st.glow}">${st.symbol} ${card.rarity}</text>
</svg>`;
}

export const cardImage = (card: Parameters<typeof cardSvg>[0], total: number, owned = true) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(cardSvg(card, total, owned))}`;

/** Visuel du pack (booster scellé) : dégradé cosmique, nom du set. */
export function packImage(title: string, subtitle: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 340" width="220" height="340">
  <defs>
    <linearGradient id="foil" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1FAE6B"/><stop offset="45%" stop-color="#0E3B2A"/><stop offset="100%" stop-color="#F4C542"/></linearGradient>
    <radialGradient id="neb" cx="50%" cy="45%" r="60%"><stop offset="0%" stop-color="#F4C542" stop-opacity="0.9"/><stop offset="60%" stop-color="#7C6CF0" stop-opacity="0.35"/><stop offset="100%" stop-color="#0B1712" stop-opacity="0"/></radialGradient>
  </defs>
  <path d="M10 18 L20 8 L30 18 L40 8 L50 18 L60 8 L70 18 L80 8 L90 18 L100 8 L110 18 L120 8 L130 18 L140 8 L150 18 L160 8 L170 18 L180 8 L190 18 L200 8 L210 18 L210 322 L200 332 L190 322 L180 332 L170 322 L160 332 L150 322 L140 332 L130 322 L120 332 L110 322 L100 332 L90 322 L80 332 L70 322 L60 332 L50 322 L40 332 L30 322 L20 332 L10 322 Z" fill="url(#foil)"/>
  <rect x="22" y="40" width="176" height="260" rx="14" fill="#0B1712" opacity="0.85"/>
  <circle cx="110" cy="150" r="80" fill="url(#neb)"/>
  <polygon points="110,92 122,138 170,140 131,166 146,212 110,184 74,212 89,166 50,140 98,138" fill="#F4C542"/>
  <text x="110" y="258" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="900" fill="#F2F5F3">PACK RUSH</text>
  <text x="110" y="282" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#F4C542">${esc(title)}</text>
  <text x="110" y="64" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="#8FA89A">${esc(subtitle)}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
