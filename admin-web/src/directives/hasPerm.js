import { useUserStore } from '@/store/modules/user'

export default {
  mounted(el, binding) {
    const user = useUserStore()
    const required = String(binding.value)
    if (!user.perms.has(required)) {
      el.parentNode?.removeChild(el)
    }
  }
}
