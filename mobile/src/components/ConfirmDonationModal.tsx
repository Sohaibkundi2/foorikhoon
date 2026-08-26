// src/components/ConfirmDonationModal.tsx
import { useState } from 'react'
import {
  View, Text, StyleSheet, Modal, Pressable, Image, Alert, Linking,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import {
  Camera, Check, Images, TriangleAlert, X,
} from 'lucide-react-native'
import api from '../lib/api'

import {
  Label, Button, Notice, SegmentMeter, TextAction,
} from './fk'
import { color, font, radius, statusTone, toneFor } from '../theme'

interface Props {
  visible: boolean
  requestId: string | null
  bloodGroupLabel: string
  donorName?: string | null
  onClose: () => void
  onSuccess: () => void
}

// Mirrors the server rules in upload.middleware.ts. Checked here purely so the user
// gets an instant answer instead of waiting for a 5MB upload to be rejected — the
// server check is the one that actually enforces anything.
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

/** The picker gives us a file:// path; we still need a filename and MIME type for the
 *  multipart part. SDK 51+ returns mimeType/fileName, but not on every platform and not
 *  for every source, so fall back to the extension. */
function describeAsset(asset: ImagePicker.ImagePickerAsset) {
  const uri = asset.uri
  const extFromUri = uri.split('.').pop()?.toLowerCase().split('?')[0] ?? 'jpg'
  const ext = ['jpg', 'jpeg', 'png', 'webp'].includes(extFromUri) ? extFromUri : 'jpg'

  const type = asset.mimeType ?? (ext === 'jpg' ? 'image/jpeg' : `image/${ext}`)
  const name = asset.fileName ?? `blood-bag.${ext}`

  return { uri, name, type }
}

export default function ConfirmDonationModal({
  visible,
  requestId,
  bloodGroupLabel,
  donorName,
  onClose,
  onSuccess,
}: Props) {
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setAsset(null)
    setUploading(false)
    setProgress(0)
    setError(null)
  }

  const handleClose = () => {
    if (uploading) return
    reset()
    onClose()
  }

  // A denied permission is a dead end from inside the app — the OS will not prompt
  // again. Rather than silently doing nothing, send the user to Settings.
  const explainDenial = (what: 'camera' | 'photo library') => {
    Alert.alert(
      `${what === 'camera' ? 'Camera' : 'Photos'} access needed`,
      `ForiKhoon needs ${what} access to attach proof of donation. You can enable it in Settings.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    )
  }

  const acceptResult = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) return
    const picked = result.assets?.[0]
    if (!picked) return

    // fileSize is undefined on some Android paths; only reject when we actually know.
    if (typeof picked.fileSize === 'number' && picked.fileSize > MAX_FILE_SIZE) {
      const mb = (picked.fileSize / 1024 / 1024).toFixed(1)
      setError(`That image is ${mb}MB. Maximum size is 5MB.`)
      return
    }
    if (picked.mimeType && !ALLOWED_TYPES.includes(picked.mimeType)) {
      setError('Unsupported file type. Choose a JPG, PNG or WebP image.')
      return
    }

    setError(null)
    setAsset(picked)
  }

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) return explainDenial('camera')

    // quality 0.8 keeps the bag label perfectly legible while usually landing well
    // under the 5MB ceiling — a raw phone photo is often 4–8MB on its own.
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    })
    acceptResult(result)
  }

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return explainDenial('photo library')

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    })
    acceptResult(result)
  }

  const handleUpload = async () => {
    if (!asset || !requestId) return
    setUploading(true)
    setError(null)
    setProgress(0)

    try {
      const formData = new FormData()
      // React Native has no File/Blob for a filesystem path. Its FormData accepts a
      // { uri, name, type } descriptor instead and the native networking layer streams
      // the file off disk. TypeScript's DOM FormData type doesn't know about that shape,
      // hence the cast — this is the standard RN pattern, not a workaround for a bug.
      formData.append('photo', describeAsset(asset) as unknown as Blob)

      // No explicit Content-Type: axios must set it so the multipart boundary token is
      // generated. Writing the header by hand produces one with no boundary and the
      // server cannot parse the body.
      await api.put(`/api/hospital/requests/${requestId}/fulfill`, formData, {
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
        },
      })

      reset()
      onSuccess()
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
        'Upload failed. Check your connection and try again.'
      )
      setUploading(false)
    }
  }

  const errorTone = toneFor(statusTone, 'NO_SHOW')

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        {/* A ruled sheet with a red tick at the head, matching the bands the
            hospital screens use. The old sheet was a rounded card with two
            dashed emoji tiles. */}
        <View style={styles.sheet}>
          <View style={styles.tick} />

          <View style={styles.head}>
            <Label loud>Confirm donation</Label>
            {/* The caller passes an already-formatted group ("A+"). */}
            <Text style={styles.group}>{bloodGroupLabel}</Text>
          </View>

          <Text style={styles.subtitle}>
            Photograph the blood bag for this request
            {donorName ? <Text> donated by <Text style={styles.strong}>{donorName}</Text></Text> : null}.
            It is stored as proof and shown to the donor.
          </Text>

          {asset ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: asset.uri }} style={styles.preview} resizeMode="contain" />
              {!uploading && (
                <Pressable onPress={() => setAsset(null)} style={styles.changeBtn} hitSlop={6}>
                  {/* Was a text-only "Change" chip. */}
                  <X size={11} color={color.bone} strokeWidth={2} />
                  <Text style={styles.changeText}>Change</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.pickRow}>
              <Pressable onPress={takePhoto} style={[styles.pickBtn, styles.pickPrimary]}>
                {/* Were 📷 and 🖼️ emojis. */}
                <Camera size={19} color={color.bloodLite} strokeWidth={1.75} />
                <Text style={styles.pickLabel}>Take photo</Text>
                <Text style={styles.pickHint}>Camera</Text>
              </Pressable>
              <Pressable onPress={pickFromGallery} style={styles.pickBtn}>
                <Images size={19} color={color.mute} strokeWidth={1.75} />
                <Text style={styles.pickLabel}>From gallery</Text>
                <Text style={styles.pickHint}>JPG, PNG or WebP · max 5MB</Text>
              </Pressable>
            </View>
          )}

          {error && (
            <Notice tone={errorTone} icon={TriangleAlert} style={{ marginTop: 14 }}>
              {error}
            </Notice>
          )}

          {uploading && (
            <View style={styles.progressWrap}>
              <SegmentMeter value={progress} max={100} segments={20} tint={color.blood} />
              <Text style={styles.progressText}>
                {progress < 100 ? `Uploading… ${progress}%` : 'Saving donation…'}
              </Text>
            </View>
          )}

          <Button
            tone="affirm"
            size="lg"
            full
            icon={Check}
            busy={uploading}
            disabled={!asset || uploading}
            onPress={handleUpload}
            style={{ marginTop: 18 }}
          >
            {uploading ? 'Uploading…' : 'Upload and confirm'}
          </Button>

          <TextAction
            onPress={handleClose}
            style={{ marginTop: 14, alignSelf: 'center', opacity: uploading ? 0.4 : 1 }}
          >
            Cancel
          </TextAction>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  sheet: {
    width: '100%', maxWidth: 420, backgroundColor: color.raised,
    borderWidth: 1, borderColor: color.line, borderRadius: radius.lg,
    paddingHorizontal: 20, paddingBottom: 20, overflow: 'hidden',
  },
  tick: { height: 2, backgroundColor: color.blood, marginHorizontal: -20, marginBottom: 18 },

  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  group: {
    fontFamily: font.mono.medium, fontSize: 20, color: color.bloodLite, letterSpacing: -1,
  },
  subtitle: {
    fontFamily: font.sans.regular, fontSize: 12.5, lineHeight: 19,
    color: color.mute, marginTop: 10, marginBottom: 18,
  },
  strong: { fontFamily: font.sans.medium, color: color.bone },

  pickRow: { flexDirection: 'row', gap: 9 },
  pickBtn: {
    flex: 1, backgroundColor: color.ink,
    borderWidth: 1, borderColor: color.line, borderRadius: radius.md,
    paddingVertical: 18, paddingHorizontal: 12, gap: 9,
  },
  pickPrimary: { borderColor: color.line, backgroundColor: color.surface },
  pickLabel: {
    fontFamily: font.sans.medium, fontSize: 13, color: color.bone, letterSpacing: -0.2,
  },
  pickHint: {
    fontFamily: font.mono.regular, fontSize: 9, color: color.faint,
    letterSpacing: 0.7, textTransform: 'uppercase',
  },

  previewWrap: {
    borderWidth: 1, borderColor: color.line, borderRadius: radius.md,
    overflow: 'hidden', backgroundColor: color.ink,
  },
  preview: { width: '100%', height: 220 },
  changeBtn: {
    position: 'absolute', top: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(10,10,10,0.86)',
    borderWidth: 1, borderColor: color.line, borderRadius: radius.sm,
    paddingHorizontal: 9, paddingVertical: 5,
  },
  changeText: {
    fontFamily: font.mono.medium, fontSize: 9, color: color.bone,
    letterSpacing: 1.1, textTransform: 'uppercase',
  },

  progressWrap: { marginTop: 16, gap: 9 },
  progressText: {
    fontFamily: font.mono.regular, fontSize: 10.5, color: color.mute, letterSpacing: 0.4,
  },
})
