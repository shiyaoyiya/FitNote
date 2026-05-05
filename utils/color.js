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