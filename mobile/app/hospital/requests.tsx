// app/hospital/requests.tsx
import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, Pressable,
  RefreshControl, ScrollView, Modal, Image,
} from 'react-native'
import { router } from 'expo-router'
import {
  Ban, Check, CircleCheck, Inbox, X,
} from 'lucide-react-native'
import { useAuthStore } from '../../src/store/authStore'
import api from '../../src/lib/api'
import ConfirmDonationModal from '../../src/components/ConfirmDonationModal'

import {
  Screen, PageHead, Label, Chip, Button, Skeleton, EmptyState, Rule,
  useTabBarInset,
} from '../../src/components/fk'
import {
  color, wash, font, radius, urgencyTone, statusTone, toneFor, bloodLabel,
} from '../../src/theme'

interface Match {
  id: string
  donorId: string
  status: string
  photoUrl?: string | null
  photoUploadedAt?: string | null
  donorContact?: { name: string; phone: string | null } | null
}

interface BloodRequest {
  id: string
  bloodGroup: string
  units: number
  urgency: string
  status: string
  notes: string | null
  createdAt: string
  matches: Match[]
}

type Tab = 'ALL' | 'PENDING' | 'MATCHED' | 'FULFILLED' | 'EXPIRED'
const TABS: Tab[] = ['ALL', 'PENDING', 'MATCHED', 'FULFILLED', 'EXPIRED']

/** Display strings for the rail. The enum values stay the filter keys. */
const TAB_LABEL: Record<Tab, string> = {
  ALL: 'All',
  PENDING: 'Pending',
  MATCHED: 'Matched',
  FULFILLED: 'Fulfilled',
  EXPIRED: 'Expired',
}

export default function HospitalRequestsScreen() {
  const { user } = useAuthStore()

  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('ALL')
  const [updatingKey, setUpdatingKey] = useState<string | null>(null)
  // Request currently having a proof photo attached, if any.
  const [fulfilling, setFulfilling] = useState<BloodRequest | null>(null)
  // Blood-bag photo opened full size.
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const bottomInset = useTabBarInset()

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (user.role !== 'HOSPITAL') { router.replace('/'); return }
    fetchRequests()
  }, [user])

  const fetchRequests = async () => {
    try {
      const res = await api.get('/api/hospital/requests')
      setRequests(res.data.requests)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchRequests()
  }, [])

const handleCancel = async (requestId: string) => {
  setUpdatingKey(`${requestId}-cancel`)
  try {
    await api.put(`/api/requests/${requestId}`, { newStatus: 'EXPIRED' })
    await fetchRequests()
  } catch (err) {
    console.error(err)
  } finally {
    setUpdatingKey(null)
  }
}

const handleNoShow = async (matchId: string) => {
  setUpdatingKey(`${matchId}-noshow`)
  try {
    await api.patch(`/api/hospital/matches/${matchId}/no-show`)
    await fetchRequests()
  } catch (err) {
    console.error(err)
  } finally {
    setUpdatingKey(null)
  }
}

const getAcceptedMatch = (req: BloodRequest) =>
  req.matches?.find(m => m.status === 'ACCEPTED')

const getAcceptedContact = (req: BloodRequest) =>
req.matches?.find(m => m.status === 'ACCEPTED')?.donorContact

// The proof photo lands on the match once it flips to COMPLETED at fulfilment.
const getCompletedMatch = (req: BloodRequest) =>
  req.matches?.find(m => m.status === 'COMPLETED')

  const filteredRequests = activeTab === 'ALL'
    ? requests
    : requests.filter(r => r.status === activeTab)

  if (loading) {
    return (
      <Screen>
        <View style={styles.gutter}>
          <Rule tick />
          <View style={{ marginTop: 22, gap: 12 }}>
            <Skeleton width="28%" height={11} />
            <Skeleton width="70%" height={26} />
          </View>
          <View style={{ marginTop: 34, gap: 1 }}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={styles.loadRow}>
                <Skeleton width={40} height={20} />
                <Skeleton width="38%" height={11} />
              </View>
            ))}
          </View>
        </View>
      </Screen>
    )
  }

  return (
    /* The FlatList owns the scrolling, so the Screen is a plain frame. */
    <Screen scroll={false} ember>
      <PageHead
        eyebrow="Hospital · Requests"
        title="Everything"
        accent="you've posted."
        sub="Each request keeps its matches attached, so you can confirm a collection, report a no-show, or close it from here."
      />

      {/* Filter rail — chips, not underlined tabs. Five statuses with counts do
          not fit across a phone as tabs, and a chip can hold its own count. */}
      <View style={styles.railWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.railContent}
        >
          {TABS.map((tab) => {
            const count = tab === 'ALL' ? requests.length : requests.filter(r => r.status === tab).length
            const active = activeTab === tab
            const tone = tab === 'ALL'
              ? { fg: color.bone, bg: wash.bone, border: wash.boneEdge, label: 'All' }
              : toneFor(statusTone, tab)
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.railChip,
                  active && { backgroundColor: tone.bg, borderColor: tone.border },
                ]}
              >
                <Text
                  style={[
                    styles.railText,
                    active && { color: tone.fg, fontFamily: font.mono.medium },
                  ]}
                >
                  {TAB_LABEL[tab]}
                </Text>
                {count > 0 && (
                  <Text style={[styles.railCount, active && { color: tone.fg }]}>{count}</Text>
                )}
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={color.blood}
            colors={[color.blood]}
            progressBackgroundColor={color.surface}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={Inbox}
            title={activeTab === 'ALL' ? 'No requests yet' : `Nothing ${TAB_LABEL[activeTab].toLowerCase()}`}
            body={activeTab === 'ALL'
              ? 'Post a request and the match runs against donors in your radius straight away.'
              : 'Switch the filter above to see your other requests.'}
            style={{ marginHorizontal: 20, marginTop: 24 }}
          />
        }
        renderItem={({ item: req }) => {
          const urg = toneFor(urgencyTone, req.urgency)
          const st = toneFor(statusTone, req.status)
          const canAct = req.status === 'PENDING' || req.status === 'MATCHED'
          const acceptedMatch = getAcceptedMatch(req)
          const acceptedContact = getAcceptedContact(req)
          const completedMatch = getCompletedMatch(req)
          const matchCount = req.matches?.length ?? 0
          return (
            /* Rows on hairlines with a status-tinted edge rather than stacked
               cards — a screen of twenty bordered boxes is all border and no
               rhythm, and the edge carries the status down the page. */
            <View style={styles.row}>
              <View style={[styles.edge, { backgroundColor: st.fg }]} />

              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.group}>{bloodLabel(req.bloodGroup)}</Text>
                  <Text style={styles.units}>
                    {req.units} unit{req.units > 1 ? 's' : ''}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <View style={styles.chipRow}>
                    <Chip tone={urg} />
                    <Chip tone={st} />
                  </View>
                </View>

                {req.notes ? (
                  <Text style={styles.notes} numberOfLines={2}>{req.notes}</Text>
                ) : null}

                <View style={styles.metaRow}>
                  <Text style={styles.metaMono}>
                    {matchCount} donor{matchCount !== 1 ? 's' : ''} matched
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.metaMono}>
                    {new Date(req.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                {req.status === 'MATCHED' && acceptedMatch && (
                  /* Was a ✓ text glyph on both branches. */
                  <View style={styles.acceptRow}>
                    <Check
                      size={13}
                      color={acceptedContact ? color.lifeLite : color.faint}
                      strokeWidth={2.5}
                    />
                    {acceptedContact ? (
                      <Text style={styles.acceptText}>
                        Accepted by {acceptedContact.name}
                        {acceptedContact.phone ? ` · ${acceptedContact.phone}` : ''}
                      </Text>
                    ) : (
                      <Text style={styles.acceptTextQuiet}>
                        Accepted — donor kept their contact details private
                      </Text>
                    )}
                  </View>
                )}

                {completedMatch?.photoUrl && (
                  <Pressable
                    onPress={() => setLightboxUrl(completedMatch.photoUrl!)}
                    style={styles.proofRow}
                  >
                    <Image source={{ uri: completedMatch.photoUrl }} style={styles.proofThumb} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Label loud>Proof photo</Label>
                      {completedMatch.photoUploadedAt ? (
                        <Text style={styles.proofDate}>
                          {new Date(completedMatch.photoUploadedAt).toLocaleDateString()}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                )}

                {canAct && (
                  <View style={{ marginTop: 14, gap: 8 }}>
                    {req.status === 'MATCHED' && acceptedMatch && (
                      <Button
                        tone="affirm"
                        size="sm"
                        icon={CircleCheck}
                        full
                        onPress={() => setFulfilling(req)}
                      >
                        Confirm donation
                      </Button>
                    )}

                    <View style={styles.actionsRow}>
                      {req.status === 'MATCHED' && acceptedMatch && (
                        <Button
                          tone="danger"
                          size="sm"
                          icon={Ban}
                          style={{ flex: 1 }}
                          busy={updatingKey === `${acceptedMatch.id}-noshow`}
                          disabled={updatingKey === `${acceptedMatch.id}-noshow`}
                          onPress={() => handleNoShow(acceptedMatch.id)}
                        >
                          Report no-show
                        </Button>
                      )}

                      <Button
                        tone="quiet"
                        size="sm"
                        icon={X}
                        style={{ flex: 1 }}
                        busy={updatingKey === `${req.id}-cancel`}
                        disabled={updatingKey === `${req.id}-cancel`}
                        onPress={() => handleCancel(req.id)}
                      >
                        Cancel request
                      </Button>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )
        }}
      />

      <ConfirmDonationModal
        visible={!!fulfilling}
        requestId={fulfilling?.id ?? null}
        bloodGroupLabel={fulfilling ? bloodLabel(fulfilling.bloodGroup) : ''}
        donorName={fulfilling ? getAcceptedContact(fulfilling)?.name : null}
        onClose={() => setFulfilling(null)}
        onSuccess={async () => {
          setFulfilling(null)
          await fetchRequests()
        }}
      />

      <Modal
        visible={!!lightboxUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxUrl(null)}
      >
        <View style={styles.lightbox}>
          {lightboxUrl && (
            <Image source={{ uri: lightboxUrl }} style={styles.lightboxImage} resizeMode="contain" />
          )}
          <Button
            tone="ghost"
            size="sm"
            icon={X}
            onPress={() => setLightboxUrl(null)}
            style={{ marginTop: 20 }}
          >
            Close
          </Button>
        </View>
      </Modal>
    </Screen>
  )
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: 20 },
  loadRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 18,
  },

  // Filter rail
  railWrap: { borderBottomWidth: 1, borderBottomColor: color.line },
  railContent: { paddingHorizontal: 20, paddingBottom: 14, gap: 7 },
  railChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1, borderColor: color.line, backgroundColor: color.surface,
    borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7,
  },
  railText: {
    fontFamily: font.mono.regular, fontSize: 10, color: color.mute,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  railCount: {
    fontFamily: font.mono.medium, fontSize: 10, color: color.faint,
    fontVariant: ['tabular-nums'],
  },

  // List
  listContent: { paddingTop: 4 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: color.lineSoft },
  edge: { width: 2 },
  rowBody: { flex: 1, minWidth: 0, paddingHorizontal: 18, paddingVertical: 16 },

  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  group: {
    fontFamily: font.mono.medium, fontSize: 20, color: color.bone, letterSpacing: -1,
  },
  units: { fontFamily: font.sans.regular, fontSize: 12.5, color: color.mute },
  chipRow: { flexDirection: 'row', gap: 6 },

  notes: {
    fontFamily: font.sans.regular, fontSize: 12.5, lineHeight: 18,
    color: color.mute, marginTop: 9,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 11 },
  metaMono: { fontFamily: font.mono.regular, fontSize: 10.5, color: color.faint },

  acceptRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  acceptText: {
    flex: 1, fontFamily: font.sans.medium, fontSize: 12.5, color: color.lifeLite,
    letterSpacing: -0.2,
  },
  acceptTextQuiet: {
    flex: 1, fontFamily: font.sans.regular, fontSize: 12.5, color: color.faint,
  },

  proofRow: {
    flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 13,
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingTop: 13,
  },
  proofThumb: {
    width: 42, height: 42, borderRadius: radius.sm,
    borderWidth: 1, borderColor: color.line, backgroundColor: color.surface,
  },
  proofDate: { fontFamily: font.mono.regular, fontSize: 10, color: color.faint, marginTop: 4 },

  actionsRow: { flexDirection: 'row', gap: 8 },

  lightbox: {
    flex: 1, backgroundColor: wash.scrim,
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  lightboxImage: { width: '100%', height: '78%' },
})
