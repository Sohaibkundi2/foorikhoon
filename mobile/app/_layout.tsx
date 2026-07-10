import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { useAuthStore } from '../src/store/authStore'

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
          headerStyle: { backgroundColor: '#0A0A0A' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#0A0A0A' },
        }}
      />
    </>
  )
}