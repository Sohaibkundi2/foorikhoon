import Constants from 'expo-constants'
import { useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import ViewShot, { captureRef } from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import * as MediaLibrary from 'expo-media-library'

interface CertificateProps {
  donorName: string
  bloodGroup: string
  city?: string
  hospitalName: string
  donationDate: string | Date
  badge?: string | null
  totalDonations?: number
  commitmentScore?: number
}

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−',
}

const badgeIcons: Record<string, string> = {
  'First Blood': '🩸',
  Lifesaver: '🦸',
  Hero: '👑',
  Reliable: '⭐',
  Dedicated: '💎',
}

const QUOTES = [
  'One donation. One life. No small acts.',
  "You didn't just donate blood — you gave someone tomorrow.",
  "Heroes don't always wear capes. Some just roll up a sleeve.",
  'Small act. Big impact.',
  "Somewhere, a family is grateful they'll never meet you.",
]

function pickQuote(seed: string) {
  const index =
    seed.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) %
    QUOTES.length

  return QUOTES[index]
}

export default function HeroCertificate({
  donorName,
  bloodGroup,
  city,
  hospitalName,
  donationDate,
  badge,
  totalDonations,
  commitmentScore,
}: CertificateProps) {
  const viewShotRef = useRef<ViewShot>(null)
  const [saving, setSaving] = useState(false)
  const [sharing, setSharing] = useState(false)

  const isExpoGo = Constants.appOwnership === 'expo'

  const formattedDate = new Date(donationDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const quote = pickQuote(donorName + hospitalName)
  const displayBloodGroup = bloodGroupLabels[bloodGroup] ?? bloodGroup
  const donationCount = typeof totalDonations === 'number' ? totalDonations : null
  const score = typeof commitmentScore === 'number' ? commitmentScore : null
  const donationLabel = donationCount === 1 ? 'DONATION' : 'DONATIONS'

  const captureImage = async (): Promise<string | null> => {
    try {
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1,
      })
      return uri
    } catch (err) {
      console.error('Certificate capture failed:', err)
      return null
    }
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true)

      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Allow photo access to save your certificate.',
        )
        return
      }

      const uri = await captureImage()
      if (!uri) return

      await MediaLibrary.saveToLibraryAsync(uri)
      Alert.alert('Saved', 'Certificate saved to your photos.')
    } catch (err) {
      console.error('Save failed:', err)
      Alert.alert('Something went wrong', 'Could not save the certificate.')
    } finally {
      setSaving(false)
    }
  }

  const handleShare = async () => {
    setSharing(true)

    try {
      const uri = await captureImage()
      if (!uri) return

      const available = await Sharing.isAvailableAsync()

      if (!available) {
        Alert.alert(
          'Sharing unavailable',
          'Sharing is not supported on this device.',
        )
        return
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your ForiKhoon certificate',
      })
    } catch (err) {
      console.error('Share failed:', err)
    } finally {
      setSharing(false)
    }
  }

  return (
    <View style={styles.wrapper}>
      {/* Card only — action buttons stay outside the captured image. */}
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
        <View style={styles.card}>
          <View style={styles.glowTopRight} />
          <View style={styles.glowBottomLeft} />
          <View style={styles.patternTopRight} />
          <View style={styles.patternBottomLeft} />

          <View style={styles.content}>
            {/* Brand / verification */}
            <View style={styles.topRow}>
              <View style={styles.brandRow}>
                <Text style={styles.dropEmoji}>🩸</Text>
                <View>
                  <Text style={styles.brandText}>FORIKHOON</Text>
                  <Text style={styles.brandSubtext}>EMERGENCY BLOOD NETWORK</Text>
                </View>
              </View>

              <View style={styles.verifiedPill}>
                <Text style={styles.verifiedCheck}>✓</Text>
                <Text style={styles.verifiedText}>VERIFIED</Text>
              </View>
            </View>

            {/* Main achievement */}
            <View style={styles.heroSection}>
              <Text style={styles.eyebrow}>CERTIFIED LIFE SAVER</Text>

              <Text style={styles.donorName} numberOfLines={1}>
                {donorName}
              </Text>

              {city ? (
                <Text style={styles.cityText} numberOfLines={1}>
                  {city}
                </Text>
              ) : null}

              <Text style={styles.savedTitle}>SAVED A LIFE</Text>

              <View style={styles.bloodBadge}>
                <Text style={styles.bloodLabel}>BLOOD GROUP</Text>
                <Text style={styles.bloodText}>{displayBloodGroup}</Text>
              </View>

              {badge ? (
                <View style={styles.badgePill}>
                  <Text style={styles.badgeEmoji}>
                    {badgeIcons[badge] ?? '🏅'}
                  </Text>
                  <View>
                    <Text style={styles.badgeLabel}>BADGE UNLOCKED</Text>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Impact quote */}
            <View style={styles.quoteBlock}>
              <View style={styles.quoteLine} />
              <Text style={styles.quote}>"{quote}"</Text>
              <View style={styles.quoteLine} />
            </View>

            {/* Stats */}
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {donationCount ?? '—'}
                </Text>
                <Text style={styles.statLabel}>{donationLabel}</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statBox}>
                <Text style={styles.statValue}>{score ?? '—'}</Text>
                <Text style={styles.statLabel}>COMMITMENT SCORE</Text>
              </View>
            </View>

            {/* Donation details */}
            <View style={styles.footer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>⌖</Text>
                <View style={styles.detailTextWrap}>
                  <Text style={styles.detailLabel}>DONATED AT</Text>
                  <Text style={styles.footerHospital} numberOfLines={1}>
                    {hospitalName}
                    {city ? ` · ${city}` : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>□</Text>
                <View style={styles.detailTextWrap}>
                  <Text style={styles.detailLabel}>DATE</Text>
                  <Text style={styles.footerDate}>{formattedDate}</Text>
                </View>
              </View>

              <View style={styles.footerBottom}>
                <Text style={styles.thankYou}>Thank you for being a hero.</Text>
                <Text style={styles.footerBrand}>FORIKHOON.COM</Text>
              </View>
            </View>
          </View>
        </View>
      </ViewShot>

      {/* Actions — outside ViewShot, never captured. */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.shareBtn]}
          onPress={handleShare}
          disabled={sharing}
          activeOpacity={0.85}
        >
          <Text style={styles.shareBtnText}>
            {sharing ? 'Preparing…' : 'Share'}
          </Text>
        </TouchableOpacity>

        {isExpoGo ? (
          <View style={[styles.actionBtn, styles.saveBtnDisabled]}>
            <Text style={styles.saveBtnDisabledText}>
              Save unavailable in Expo Go
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, styles.saveBtn]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving…' : 'Save to Photos'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const CARD_WIDTH = 300
const CARD_HEIGHT = 500

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 16,
  },

  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#6F0B0F',
    position: 'relative',
  },

  glowTopRight: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 230,
    height: 230,
    borderRadius: 999,
    backgroundColor: '#D72F36',
    opacity: 0.3,
  },

  glowBottomLeft: {
    position: 'absolute',
    bottom: -110,
    left: -90,
    width: 250,
    height: 250,
    borderRadius: 999,
    backgroundColor: '#3A0508',
    opacity: 0.65,
  },

  patternTopRight: {
    position: 'absolute',
    top: 42,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  patternBottomLeft: {
    position: 'absolute',
    bottom: 70,
    left: -45,
    width: 130,
    height: 130,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },

  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  dropEmoji: {
    fontSize: 13,
    lineHeight: 16,
  },

  brandText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#FFFFFF',
    lineHeight: 13,
  },

  brandSubtext: {
    fontSize: 5.5,
    fontWeight: '600',
    letterSpacing: 0.9,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },

  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  verifiedCheck: {
    color: '#F6C453',
    fontSize: 10,
    fontWeight: '900',
  },

  verifiedText: {
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#FFFFFF',
  },

  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },

  eyebrow: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#F3C969',
    marginBottom: 7,
  },

  donorName: {
    maxWidth: '90%',
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
  },

  cityText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.62)',
    marginTop: 2,
  },

  savedTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1.1,
    marginTop: 12,
  },

  bloodBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 11,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(246,201,83,0.8)',
  },

  bloodLabel: {
    fontSize: 5.5,
    fontWeight: '800',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },

  bloodText: {
    fontSize: 27,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#D9A93A',
    borderWidth: 1,
    borderColor: '#F6D77A',
  },

  badgeEmoji: {
    fontSize: 11,
    lineHeight: 13,
  },

  badgeLabel: {
    fontSize: 5.5,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#4A2600',
  },

  badgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#321800',
    marginTop: 1,
  },

  quoteBlock: {
    alignItems: 'center',
    marginBottom: 10,
  },

  quoteLine: {
    width: 42,
    height: 1,
    backgroundColor: 'rgba(246,201,83,0.45)',
    marginBottom: 6,
  },

  quote: {
    maxWidth: '92%',
    fontSize: 9,
    fontWeight: '600',
    fontStyle: 'italic',
    color: 'rgba(255,239,239,0.82)',
    textAlign: 'center',
    lineHeight: 13,
  },

  statRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 9,
    marginBottom: 10,
  },

  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginVertical: 2,
  },

  statValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 19,
  },

  statLabel: {
    fontSize: 6,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.62)',
    marginTop: 3,
    textAlign: 'center',
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 9,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  detailIcon: {
    width: 22,
    fontSize: 13,
    color: '#F3C969',
    textAlign: 'center',
  },

  detailTextWrap: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 5.5,
    fontWeight: '800',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 1,
  },

  footerHospital: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  footerDate: {
    fontSize: 8,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.78)',
  },

  footerBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 5,
  },

  thankYou: {
    fontSize: 8,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#F3C969',
  },

  footerBrand: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.55)',
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },

  actionBtn: {
    minHeight: 42,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  shareBtn: {
    backgroundColor: '#DC2626',
  },

  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  saveBtn: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },

  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  saveBtnDisabled: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    opacity: 0.5,
  },

  saveBtnDisabledText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
})
