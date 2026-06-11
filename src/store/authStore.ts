import { create } from 'zustand'

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
}
// create the store
export const useAuthStore = create<AuthStore>((set) => ({
  user: null,   // starts as null (not logged in)
  token: null,

  // when user logs in → save to store + localStorage
  setAuth: (user, token) => {
    localStorage.setItem('token', token)  // persist across page refresh
    set({ user, token })                  // update store
  },

  // when user logs out → clear everything
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  }
}))