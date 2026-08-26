# ForiKhoon mobile — design brief

Expo SDK 54 · expo-router 6 (flat file routes) · RN 0.81 · yarn.
Everything visual comes from `src/theme.ts` and `src/components/fk.tsx`. Read those
two before writing a screen; don't invent local colours, fonts, or radii.

## Hard rules

1. **No logic changes** when restyling. Preserve every hook, effect, fetch,
   dependency array, handler, `href`, and conditional gate exactly. Markup,
   styles, typography, icons and motion are the only things in scope.
2. **No emojis.** Use `lucide-react-native` icons.
   Exception: `src/components/Herocertificate.tsx` — leave its emojis and its
   gold/crimson design alone.
3. **No purple.** Not as a background, not as an accent.
4. **Must not read as AI-generated.** Avoid centred hero + gradient headline,
   symmetrical glows, glassmorphism, everything `rounded-2xl`, filler copy.
   Prefer asymmetry, editorial grids, hairlines, precise type, restrained motion.
5. **Never fabricate data or claims.** If a status can't be derived from what the
   screen already fetches, don't imply it.

## Kit — `src/components/fk.tsx`

```
Screen({ children, ember=true, grid=false, scroll=true, tail=24 })
PageHead({ eyebrow?, title, accent?, sub?, aside? })
SectionLabel({ index?, children, aside? })   aside must be a NODE, never a string
Label({ children, loud? })   Rule({ tick? })   Panel({ children, tone?, tight? })
Chip({ tone, children?, icon? })   Notice({ tone, children, icon? })
Stat({ value, label, tint?, loading? })   LiveDot({ size?, tint? })
SegmentMeter({ value, max, segments=10, tint? })   Skeleton({ width?, height? })
EmptyState({ icon, title, body?, action? })   RowLink({ children, onPress, tone? })
Button({ children, onPress, tone?, icon?, size?, disabled?, busy?, full?, haptic? })
    tone: primary | ghost | quiet | danger | affirm     size: sm | md | lg
TextAction({ children, onPress, tint? })
Field({ label, hint?, error?, children })   Input(TextInputProps)
Choice({ options: {value,label}[], value, onChange })
useTabBarInset(extra=24)
```

**`Screen` inset contract:** `scroll={true}` applies top *and* bottom insets for
you. `scroll={false}` applies **only** the top inset — the caller must apply
`useTabBarInset()` itself (e.g. a `FlatList` `contentContainerStyle`).

## Tokens — `src/theme.ts`

- `color`: `ink surface raised · line lineSoft · bone mute faint · blood bloodDark
  bloodDeep bloodLite · warn warnLite · life lifeLite`
- `wash`: translucent fills + `Edge` variants, plus `scrim`
- `font.sans` Inter · `font.serif` Instrument Serif (italic, large, one phrase per
  screen max) · `font.mono` IBM Plex Mono (labels, figures, codes, timestamps)
- `radius`: `sm 6 · md 10 · lg 14 · pill`
- `urgencyTone` `statusTone` `shortageTone` → read via `toneFor(map, key)`
- `bloodLabel(enum)` → `"A+"`, `"O−"` (U+2212 minus), `"—"` when falsy

**Android has no synthetic font weights** — each weight is its own family. Never
put `fontWeight` on branded text; pick `font.sans.medium` etc.

## Tab bar

`src/components/TabBar.tsx` is an overlay, **not** an expo-router `(tabs)` group,
so all route paths stay flat. `TAB_BAR_HEIGHT = 58`. It hides only for signed-in
users on `/login` and `/register`, so detail screens still need bottom clearance.

## Facts that keep copy honest

Low stock is `units < 5`. Analytics' month figure counts from the 1st of the
calendar month. `/ai/match` returns the top 3 donors. Radius tiers are
10/25/50/100 km. Leaderboard is `commitmentScore > 0`, desc, top 20.
API base is `EXPO_PUBLIC_API_URL`; backend runs on `:5000`, Flask engine `:5001`.

Prisma enums: groups `A_POS…O_NEG`; request status
`PENDING|MATCHED|FULFILLED|EXPIRED|NO_SHOW`; match status
`PENDING|ACCEPTED|DECLINED|COMPLETED|NO_SHOW`; urgency `NORMAL|URGENT|CRITICAL`.

## Availability vs last-donated

Two different endpoints. `PUT /api/donor/profile` handles the profile fields
including `lastDonated`; `isAvailable` has its own route, `PUT
/api/donor/availability`, and the switch that writes it lives on the donor
dashboard. The profile screen shows availability read-only on purpose — don't add
a second control there.

Both feed matching: `donorMatching.ts` offers a donor only when `isAvailable` is
true **and** `lastDonated` is null or at least 90 days old. The dashboard's
eligibility countdown uses the same 90 days. Keep those in step.

## Working style

No test runs — this is a rebrand pass. Prefer `Edit` over full-file `Write`
unless the structure genuinely has to change. One screen per session.
