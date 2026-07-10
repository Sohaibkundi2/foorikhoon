import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL
})

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch (e) {
    // no token yet
  }
  return config
})

export default api