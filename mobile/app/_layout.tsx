import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { useAuthStore } from '../src/store/authStore'
import Navbar from '../src/components/Navbar'

export default function RootLayout() {
  const { loadAuth } = useAuthStore()

  useEffect(() => {
    loadAuth()
  }, [])

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          header: () => <Navbar />,
          contentStyle: { backgroundColor: '#0A0A0A' },
        }}
      />
    </>
  )
}