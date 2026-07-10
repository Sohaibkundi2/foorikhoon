import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

interface User {
  id: string
  email: string
  role: string
}

interface AuthStore {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
  loadAuth: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,

  setAuth: async (user, token) => {
    await SecureStore.setItemAsync('token', token)
    await SecureStore.setItemAsync('user', JSON.stringify(user))
    set({ user, token })
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('token')
    await SecureStore.deleteItemAsync('user')
    set({ user: null, token: null })
  },

  loadAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('token')
      const userStr = await SecureStore.getItemAsync('user')
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr) })
      }
    } catch (e) {
      // nothing stored yet
    }
  }
}))