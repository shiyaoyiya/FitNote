/**
 * 防抖 composable
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟毫秒数
 * @returns {Function} 防抖后的函数，带 cancel 方法
 */
export function useDebounce(fn, delay = 200) {
  let timer = null

  const debounced = (...args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  return debounced
}
