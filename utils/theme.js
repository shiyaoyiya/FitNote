import { generateThemeMethod2 } from './color.js'

export function formatDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = dateObj.getMonth() + 1;
  const d = dateObj.getDate();
  return `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;
}

export function updateNavBar() {
  try {
    const data = uni.getStorageSync('fitness_day_settings')
    const isDark = data ? !!data.isDarkMode : true
    const customTheme = data?.customTheme || { dark: '#379bff', light: '#379bff' }
    const customColor = isDark ? customTheme.dark : customTheme.light

    // 根据自定义颜色计算导航栏背景色
    // 使用生成的主题色中的 surface 颜色作为导航栏背景
    let bgColor = isDark ? '#121212' : '#f5f5f5'
    if (customColor && customColor !== '#379bff') {
      const theme = generateThemeMethod2(customColor, isDark ? 'dark' : 'light')
      if (theme && theme.surface) {
        bgColor = theme.surface
      }
    }

    uni.setNavigationBarColor({
      frontColor: isDark ? '#ffffff' : '#000000',
      backgroundColor: bgColor
    })
  } catch (e) {
    uni.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: '#121212'
    })
  }
}

export function formatDateStr(date) {
  if (typeof date === 'string') {
    date = new Date(date.replace(/\./g, '/').replace(/-/g, '/'));
  }
  if (isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}
