// src/components/ConfirmDonationModal.tsx
import { useState } from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Image,
  ActivityIndicator, Alert, Linking
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import api from '../lib/api'

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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Confirm Donation</Text>
          <Text style={styles.subtitle}>
            Photograph the blood bag for the{' '}
            <Text style={styles.blood}>{bloodGroupLabel}</Text> request
            {donorName ? <Text> donated by <Text style={styles.strong}>{donorName}</Text></Text> : null}.
            This is stored as proof and shown to the donor.
          </Text>

          {asset ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: asset.uri }} style={styles.preview} resizeMode="contain" />
              {!uploading && (
                <TouchableOpacity onPress={() => setAsset(null)} style={styles.changeBtn}>
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.pickRow}>
              <TouchableOpacity onPress={takePhoto} style={[styles.pickBtn, styles.pickPrimary]}>
                <Text style={styles.pickEmoji}>📷</Text>
                <Text style={styles.pickLabel}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={pickFromGallery} style={styles.pickBtn}>
                <Text style={styles.pickEmoji}>🖼️</Text>
                <Text style={styles.pickLabel}>From Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {uploading && (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {progress < 100 ? `Uploading… ${progress}%` : 'Saving donation…'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleUpload}
            disabled={!asset || uploading}
            style={[styles.submitBtn, (!asset || uploading) && styles.submitDisabled]}
          >
            {uploading
              ? <ActivityIndicator size="small" color="#4ADE80" />
              : <Text style={styles.submitText}>Upload and Confirm Donation</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleClose} disabled={uploading} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, uploading && styles.dimmed]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  sheet: {
    width: '100%', maxWidth: 420, backgroundColor: '#141414',
    borderWidth: 1, borderColor: '#222', borderRadius: 18, padding: 20,
  },

  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', fontSize: 12.5, lineHeight: 18, marginTop: 6, marginBottom: 16 },
  blood: { color: '#DC2626', fontWeight: '700' },
  strong: { color: '#FFFFFF', fontWeight: '600' },

  pickRow: { flexDirection: 'row', gap: 10 },
  pickBtn: {
    flex: 1, backgroundColor: '#0F0F0F', borderWidth: 1, borderColor: '#2A2A2A',
    borderStyle: 'dashed', borderRadius: 12, paddingVertical: 22, alignItems: 'center',
  },
  pickPrimary: { borderColor: 'rgba(220,38,38,0.4)' },
  pickEmoji: { fontSize: 24, marginBottom: 6 },
  pickLabel: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '600' },

  previewWrap: {
    borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12,
    overflow: 'hidden', backgroundColor: '#0F0F0F',
  },
  preview: { width: '100%', height: 220 },
  changeBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  changeText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '600' },

  errorBox: {
    marginTop: 12, backgroundColor: 'rgba(248,113,113,0.1)',
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  errorText: { color: '#F87171', fontSize: 12, lineHeight: 17 },

  progressWrap: { marginTop: 14 },
  progressTrack: { height: 4, backgroundColor: '#222', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#DC2626' },
  progressText: { color: '#6B7280', fontSize: 11.5, marginTop: 7 },

  submitBtn: {
    marginTop: 18, backgroundColor: 'rgba(74,222,128,0.1)',
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)',
    borderRadius: 10, paddingVertical: 13, alignItems: 'center', justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#4ADE80', fontSize: 13.5, fontWeight: '700' },

  cancelBtn: { marginTop: 10, paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: '#9CA3AF', fontSize: 13 },
  dimmed: { opacity: 0.4 },
})
