export function getContrastColor(hex) {
  if (hex && typeof hex === 'object' && 'value' in hex) {
    hex = hex.value;
  }
  let str = String(hex).replace(/^#/, '').trim();
  if (str.length === 3) {
    str = str[0] + str[0] + str[1] + str[1] + str[2] + str[2];
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(str)) {
    return '#000000';
  }
  const r = parseInt(str.substr(0, 2), 16);
  const g = parseInt(str.substr(2, 2), 16);
  const b = parseInt(str.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#FFFFFF';
}

export const PRESET_COLORS = [
  { name: '清水蓝', value: '#93d5dc' },
  { name: '松石绿', value: '#4DB6AC' },
  { name: '藤萝紫', value: '#8076a3' },
  { name: '姜红', value: '#eeb8c3' },
  { name: '克莱因蓝', value: '#002fa7' },
  { name: '马尔斯绿', value: '#01847f' },
  { name: '申布伦黄', value: '#fbd26a' },
  { name: '提香红', value: '#d44848' },
  { name: '粉红', value: '#f2b9b2' },
  { name: '玛瑙灰', value: '#cfccc9' },
  { name: '汉白玉', value: '#f8f4ed' }
];

function hexToRgb(hex) {
  let str = String(hex).replace(/^#/, '').trim();
  if (str.length === 3) {
    str = str[0] + str[0] + str[1] + str[1] + str[2] + str[2];
  }
  const r = parseInt(str.substr(0, 2), 16);
  const g = parseInt(str.substr(2, 2), 16);
  const b = parseInt(str.substr(4, 2), 16);
  return { r, g, b };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function generateThemeMethod2(color, mode = 'dark') {
  if (!color || typeof color !== 'string') {
    return { surface: mode === 'dark' ? '#121212' : '#f5f5f5' };
  }

  let hex = color;
  if (color.value) {
    hex = color.value;
  }

  const { r, g, b } = hexToRgb(hex);

  let surface;
  if (mode === 'dark') {
    const surfaceR = Math.round(r * 0.15);
    const surfaceG = Math.round(g * 0.15);
    const surfaceB = Math.round(b * 0.15);
    surface = rgbToHex(surfaceR, surfaceG, surfaceB);
  } else {
    const surfaceR = Math.round(r * 0.3 + 255 * 0.7);
    const surfaceG = Math.round(g * 0.3 + 255 * 0.7);
    const surfaceB = Math.round(b * 0.3 + 255 * 0.7);
    surface = rgbToHex(surfaceR, surfaceG, surfaceB);
  }

  return { surface };
}