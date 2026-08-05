/**
 * 全局状态管理 (Pinia)
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getStorageData, setStorageData } from '../utils/request'

export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref(getStorageData('token', ''))
  const userInfo = ref(getStorageData('userInfo', {
    uid: '',
    nickname: '',
    avatar: '',
    phone: '',
  }))

  // 计算属性
  const isLoggedIn = computed(() => !!token.value)

  // 操作
  function setToken(val) {
    token.value = val
    setStorageData('token', val)
  }

  function setUserInfo(info) {
    userInfo.value = { ...userInfo.value, ...info }
    setStorageData('userInfo', userInfo.value)
  }

  function logout() {
    token.value = ''
    userInfo.value = { uid: '', nickname: '', avatar: '', phone: '' }
    setStorageData('token', '')
    setStorageData('userInfo', userInfo.value)
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    setToken,
    setUserInfo,
    logout,
  }
})

export const useAppStore = defineStore('app', () => {
  const cloudReady = ref(false)
  const networkType = ref('unknown')
  const platform = ref('')

  function setCloudReady(val) {
    cloudReady.value = val
  }

  function setNetworkType(type) {
    networkType.value = type
  }

  function setPlatform(p) {
    platform.value = p
  }

  return {
    cloudReady,
    networkType,
    platform,
    setCloudReady,
    setNetworkType,
    setPlatform,
  }
})
