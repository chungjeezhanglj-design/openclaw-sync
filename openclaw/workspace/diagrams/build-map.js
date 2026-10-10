// Generate a colored China map SVG with three-step terrain classification
const fs = require('fs');

const geo = JSON.parse(fs.readFileSync('/tmp/china-full.json', 'utf8'));

// Step classification: 1 = 第一阶梯 (4000m+), 2 = 第二阶梯 (1000-2000m), 3 = 第三阶梯 (<500m)
// 特殊处理: 四川/内蒙古/黑龙江 跨越阶梯 → 按主体归类
const STEP = {
  540000: 1,  // 西藏 → Step 1
  630000: 1,  // 青海 → Step 1
  // Step 2
  650000: 2,  // 新疆
  150000: 2,  // 内蒙古
  620000: 2,  // 甘肃
  640000: 2,  // 宁夏
  140000: 2,  // 山西
  610000: 2,  // 陕西
  510000: 2,  // 四川
  500000: 2,  // 重庆
  520000: 2,  // 贵州
  530000: 2,  // 云南
  450000: 2,  // 广西 (主体在第二阶梯)
  // Step 3
  110000: 3, 120000: 3, 130000: 3, 370000: 3, 410000: 3,
  210000: 3, 220000: 3, 230000: 3,
  310000: 3, 320000: 3, 330000: 3, 340000: 3, 350000: 3, 360000: 3,
  420000: 3, 430000: 3, 440000: 3, 460000: 3,
  710000: 3, 810000: 3, 820000: 3,
};

// Step color palette
const COLORS = {
  1: { fill: '#cbd5e1', stroke: '#475569', name: '第一级阶梯', elev: '4000 m+', sub: '青藏高原 · 柴达木盆地' },
  2: { fill: '#fde68a', stroke: '#a16207', name: '第二级阶梯', elev: '1000 – 2000 m', sub: '内蒙古/黄土/云贵高原 · 四川/塔里木/准噶尔盆地' },
  3: { fill: '#bbf7d0', stroke: '#15803d', name: '第三级阶梯', elev: '< 500 m', sub: '东北/华北/长江中下游平原 · 江南丘陵' },
};

// Equirectangular projection bounds (approximate for China)
const LON_MIN = 73, LON_MAX = 136;
const LAT_MIN = 17, LAT_MAX = 54;

// SVG canvas
const W = 1080, H = 760;
const PAD_L = 70, PAD_R = 60, PAD_T = 90, PAD_B = 130;
const MAP_W = W - PAD_L - PAD_R;
const MAP_H = H - PAD_T - PAD_B;

function project(lon, lat) {
  const x = PAD_L + ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * MAP_W;
  const y = PAD_T + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_H;
  return [x, y];
}

function ringToPath(ring) {
  return ring.map((pt, i) => {
    const [x, y] = project(pt[0], pt[1]);
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ') + ' Z';
}

function geomToPaths(geom) {
  const paths = [];
  if (geom.type === 'Polygon') {
    for (const ring of geom.coordinates) paths.push(ringToPath(ring));
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) {
      for (const ring of poly) paths.push(ringToPath(ring));
    }
  }
  return paths;
}

// Province label positions (lon, lat, fontSize)
const LABELS = {
  110000: ['北京', 116.7, 40.2, 11],
  120000: ['天津', 117.5, 39.4, 10],
  130000: ['河北', 115.0, 38.3, 13],
  140000: ['山西', 112.5, 37.5, 13],
  150000: ['内蒙古', 110.0, 42.0, 18],
  210000: ['辽宁', 122.5, 41.0, 13],
  220000: ['吉林', 126.0, 43.8, 12],
  230000: ['黑龙江', 127.5, 48.5, 15],
  310000: ['上海', 121.6, 31.0, 10],
  320000: ['江苏', 119.5, 33.0, 12],
  330000: ['浙江', 120.5, 29.0, 12],
  340000: ['安徽', 117.2, 32.0, 12],
  350000: ['福建', 118.5, 26.2, 12],
  360000: ['江西', 115.8, 27.8, 12],
  370000: ['山东', 118.0, 36.2, 13],
  410000: ['河南', 113.5, 33.5, 13],
  420000: ['湖北', 112.0, 31.0, 12],
  430000: ['湖南', 112.0, 27.5, 12],
  440000: ['广东', 113.3, 23.3, 13],
  450000: ['广西', 108.5, 23.5, 12],
  460000: ['海南', 110.3, 19.2, 11],
  500000: ['重庆', 108.0, 30.0, 11],
  510000: ['四川', 102.8, 30.2, 16],
  520000: ['贵州', 106.8, 27.0, 12],
  530000: ['云南', 102.0, 24.0, 13],
  540000: ['西藏', 88.0, 31.0, 20],
  610000: ['陕西', 108.8, 35.0, 13],
  620000: ['甘肃', 103.5, 36.5, 16],
  630000: ['青海', 96.0, 35.5, 16],
  640000: ['宁夏', 106.3, 37.5, 10],
  650000: ['新疆', 84.0, 41.5, 22],
  710000: ['台湾', 121.0, 23.8, 10],
  810000: ['香港', 114.18, 22.32, 8],
  820000: ['澳门', 113.55, 22.18, 8],
};

// South China Sea inset
const SCS_BOUNDS = { lonMin: 105, lonMax: 122, latMin: 3, latMax: 23 };
const SCS_RECT = {
  x: PAD_L + ((SCS_BOUNDS.lonMin - LON_MIN) / (LON_MAX - LON_MIN)) * MAP_W,
  y: PAD_T + ((LAT_MAX - SCS_BOUNDS.latMax) / (LAT_MAX - LAT_MIN)) * MAP_H,
  w: ((SCS_BOUNDS.lonMax - SCS_BOUNDS.lonMin) / (LON_MAX - LON_MIN)) * MAP_W,
  h: ((SCS_BOUNDS.latMax - SCS_BOUNDS.latMin) / (LAT_MAX - LAT_MIN)) * MAP_H,
};

// Build SVG
let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif">
<style>
  .title { font-size: 22px; font-weight: 700; fill: #172033; }
  .sub { font-size: 13px; fill: #5b6475; }
  .province-label { font-size: 11px; font-weight: 600; fill: #1f2937; text-anchor: middle; pointer-events: none; }
  .legend-title { font-size: 13px; font-weight: 700; fill: #172033; }
  .legend-text { font-size: 11.5px; fill: #334155; }
  .bound-label { font-size: 11px; font-weight: 700; fill: #b91c1c; }
  .scs-label { font-size: 10px; fill: #1e40af; font-weight: 600; }
</style>

<rect width="${W}" height="${H}" fill="#f8fafc"/>

<!-- Sea background (extends beyond map) -->
<rect x="${PAD_L}" y="${PAD_T}" width="${MAP_W}" height="${MAP_H}" fill="#dbeafe" opacity="0.5"/>
`;

// Draw provinces
for (const feat of geo.features) {
  const adcode = feat.properties.adcode;
  if (!STEP[adcode]) continue; // skip JD line etc.
  const c = COLORS[STEP[adcode]];
  const paths = geomToPaths(feat.geometry);
  const d = paths.join(' ');
  svg += `<path d="${d}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="0.6" stroke-linejoin="round"/>\n`;
}

// Province labels
for (const [code, [name, lon, lat, fs]] of Object.entries(LABELS)) {
  const [x, y] = project(lon, lat);
  // Shorten very long names
  svg += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="province-label" font-size="${fs}">${name}</text>\n`;
}

// Boundary mountain labels — placed below the map in a clean callout band
const BOUNDS_Y = PAD_T + MAP_H + 8;
svg += `<line x1="${(PAD_L+30).toFixed(1)}" y1="${BOUNDS_Y}" x2="${(PAD_L+80).toFixed(1)}" y2="${BOUNDS_Y}" stroke="#b91c1c" stroke-width="2" stroke-dasharray="4 3"/>`;
svg += `<text x="${(PAD_L+88).toFixed(1)}" y="${(BOUNDS_Y+4).toFixed(1)}" class="bound-label">一/二级阶梯分界：昆仑山 — 祁连山 — 横断山脉</text>`;
svg += `<line x1="${(PAD_L+30).toFixed(1)}" y1="${(BOUNDS_Y+22).toFixed(1)}" x2="${(PAD_L+80).toFixed(1)}" y2="${(BOUNDS_Y+22).toFixed(1)}" stroke="#b91c1c" stroke-width="2" stroke-dasharray="4 3"/>`;
svg += `<text x="${(PAD_L+88).toFixed(1)}" y="${(BOUNDS_Y+26).toFixed(1)}" class="bound-label">二/三级阶梯分界：大兴安岭 — 太行山 — 巫山 — 雪峰山</text>`;

// Legend (compact horizontal bar at bottom-left)
const LEG_Y = H - 28;
const LEG_X = PAD_L;
svg += `<g transform="translate(${LEG_X}, ${LEG_Y})">
  <text x="0" y="-4" class="legend-title">图例：</text>
`;
let lx = 50;
for (const [step, c] of Object.entries(COLORS)) {
  svg += `  <rect x="${lx}" y="-12" width="18" height="14" fill="${c.fill}" stroke="${c.stroke}" stroke-width="0.8" rx="2"/>
  <text x="${lx+24}" y="0" class="legend-text" font-weight="700">${c.name}</text>
  <text x="${lx+24}" y="14" class="legend-text" fill="#64748b">${c.elev}</text>
`;
  lx += 175;
}
svg += `</g>\n`;

// South China Sea inset (right-middle, in the empty sea area between 台湾 and 海南)
const insetW = 110, insetH = 80;
const insetX = W - PAD_R - insetW - 8, insetY = PAD_T + MAP_H * 0.55;
svg += `<g transform="translate(${insetX.toFixed(1)}, ${insetY.toFixed(1)})">
  <rect x="0" y="0" width="${insetW}" height="${insetH}" fill="#dbeafe" stroke="#3b82f6" stroke-width="0.8" opacity="0.9"/>
  <text x="${(insetW/2).toFixed(1)}" y="${(insetH/2-2).toFixed(1)}" class="scs-label" text-anchor="middle">南海诸岛</text>
  <text x="${(insetW/2).toFixed(1)}" y="${(insetH/2+12).toFixed(1)}" class="scs-label" text-anchor="middle" font-size="8">(示意图)</text>
</g>`;

// Title
svg += `<text x="${W/2}" y="38" text-anchor="middle" class="title">中国地势三级阶梯 · 行政区划分布图</text>
<text x="${W/2}" y="62" text-anchor="middle" class="sub">China Three-Step Terrain · Provincial Distribution</text>`;

svg += `</svg>`;

fs.writeFileSync('/Users/zhanglj/openclaw/workspace/diagrams/china-three-steps-map.html',
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>中国三级阶梯地图</title><body style="margin:0;background:#f8fafc;font-family:-apple-system,sans-serif"><main style="max-width:1100px;margin:20px auto;padding:0 16px">${svg}</main></body>`);

console.log('Generated:', '/Users/zhanglj/openclaw/workspace/diagrams/china-three-steps-map.html');
console.log('Size:', fs.statSync('/Users/zhanglj/openclaw/workspace/diagrams/china-three-steps-map.html').size, 'bytes');