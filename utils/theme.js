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
    uni.setNavigationBarColor({
      frontColor: isDark ? '#ffffff' : '#000000',
      backgroundColor: isDark ? '#121212' : '#f5f5f5'
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
