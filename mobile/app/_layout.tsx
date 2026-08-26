import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
} from '@expo-google-fonts/inter'
import {
  InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif'
import {
  IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono'

import { useAuthStore } from '../src/store/authStore'
import TabBar from '../src/components/TabBar'
import { color } from '../src/theme'

/* Hold the splash until the three brand faces are resident. Without this the
   first frame renders in the system font and every screen visibly reflows once
   Inter lands — on a layout this typographically tight, that reflow is the
   single most noticeable defect in the whole app. */
SplashScreen.preventAutoHideAsync().catch(() => {})

export default function RootLayout() {
  const { loadAuth } = useAuthStore()

  /* Keys become the fontFamily strings. They match `font.*` in src/theme.ts
     exactly — React Native has no synthetic weights on Android, so each weight
     has to be registered as its own family. */
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  })

  useEffect(() => {
    loadAuth()
  }, [])

  useEffect(() => {
    /* Hide on error too. A font that failed to download is a degraded app, not
       a broken one — falling back to the system face beats an infinite splash. */
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {})
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />

        {/* The header is gone: the hamburger drawer it used to hold is replaced
            by the bottom bar, and each screen sets its own <PageHead>, which
            says more than a repeated wordmark did. */}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: color.ink },
            /* Tab switches go through router.replace, and a horizontal slide on
               a replace reads as the app losing its place. Fade for everything
               that sits at tab level; the two push-only routes below opt back
               into a slide, where the depth cue is correct. */
            animation: 'fade',
            animationDuration: 170,
          }}
        >
          <Stack.Screen name="requests/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="hospital/analytics" options={{ animation: 'slide_from_right' }} />
        </Stack>

        <TabBar />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.ink },
})
