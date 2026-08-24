import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DonorProfilePage from '@/app/donor/profile/page'
import { mockApi } from './helpers/api'
import { donorProfileForEditing } from './helpers/fixtures'
import { signIn } from './helpers/auth'

jest.mock('@/lib/api')

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn() })
}))

/**
 * Renders the profile form and does not return until the fetched values are in the inputs.
 *
 * The name field is the guard. A failed fetch is swallowed by the component's `catch` and the
 * form still renders — with every field at its initial empty value and both toggles off. A
 * test asserting "off" would then pass whether or not the fetch worked.
 */
async function renderProfile(overrides: Record<string, unknown> = {}) {
  mockApi.get.mockImplementation(async (url: string) => {
    if (url === '/api/donor/profile') return { data: { donor: donorProfileForEditing(overrides) } }
    throw new Error(`Unstubbed GET in a test: ${url}`)
  })
  mockApi.put.mockResolvedValue({ data: {} })

  const user = userEvent.setup()
  render(<DonorProfilePage />)
  await waitFor(() => expect(screen.getByDisplayValue('Ali Khan')).toBeInTheDocument())
  return user
}

/**
 * Finds a toggle by the heading it sits beside.
 *
 * The two toggles are bare `<button>`s with no text, no `aria-label`, no `role="switch"` and
 * no `aria-pressed`, so there is no accessible name to query by and both would match
 * `getByRole('button', { name: '' })`. Walking out from the heading is the only unambiguous
 * handle the markup offers. (That is a real accessibility gap — see the note at the bottom.)
 */
function toggleFor(heading: string): HTMLElement {
  const row = screen.getByRole('heading', { name: heading }).closest('div')?.parentElement
  const button = row?.querySelector('button')
  if (!button) throw new Error(`Found no toggle button beside the "${heading}" heading`)
  return button
}

/**
 * Reads a toggle's state off its background colour, because that is the only place it exists.
 * With no `aria-pressed` or `aria-checked`, the class is what a sighted user is reading too.
 */
const isOn = (toggle: HTMLElement) => toggle.className.includes('bg-green-500')

const SHARE_CONTACT = 'Share Contact Info'

describe('donor profile — contact sharing', () => {
  beforeEach(() => {
    signIn('DONOR')
  })

  describe('initial state from the fetched profile', () => {
    it('shows the toggle on when the donor has opted in', async () => {
      await renderProfile({ shareContactInfo: true })

      expect(isOn(toggleFor(SHARE_CONTACT))).toBe(true)
    })

    it('shows the toggle off when the donor has opted out', async () => {
      await renderProfile({ shareContactInfo: false })

      expect(isOn(toggleFor(SHARE_CONTACT))).toBe(false)
    })

    it('shows the toggle off when the server omits the field entirely', async () => {
      // `shareContactInfo ?? false`. Defaulting a privacy setting to *on* because a field was
      // missing would share a phone number the donor never agreed to share, so the direction
      // of this default matters more than the usual missing-field case.
      await renderProfile({ shareContactInfo: undefined })

      expect(isOn(toggleFor(SHARE_CONTACT))).toBe(false)
    })

    it('does not write anything back while merely displaying the fetched value', async () => {
      await renderProfile({ shareContactInfo: true })

      expect(mockApi.put).not.toHaveBeenCalled()
    })
  })

  describe('toggling', () => {
    it('saves immediately, without waiting for Save Changes', async () => {
      const user = await renderProfile({ shareContactInfo: false })

      await user.click(toggleFor(SHARE_CONTACT))

      await waitFor(() =>
        expect(mockApi.put).toHaveBeenCalledWith('/api/donor/profile', { shareContactInfo: true })
      )
      // Exactly one request, and Save Changes was never pressed: the toggle is self-saving.
      expect(mockApi.put).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
    })

    it('sends only the sharing flag, not the rest of the form', async () => {
      const user = await renderProfile({ shareContactInfo: false })

      await user.click(toggleFor(SHARE_CONTACT))

      await waitFor(() => expect(mockApi.put).toHaveBeenCalled())
      const [, payload] = mockApi.put.mock.calls[0]
      // A partial update. Sending the whole form here would persist edits the donor has
      // typed but not yet saved, as a side effect of flipping an unrelated switch.
      expect(Object.keys(payload)).toEqual(['shareContactInfo'])
    })

    it('turns sharing back off, sending false', async () => {
      const user = await renderProfile({ shareContactInfo: true })

      await user.click(toggleFor(SHARE_CONTACT))

      await waitFor(() =>
        expect(mockApi.put).toHaveBeenCalledWith('/api/donor/profile', { shareContactInfo: false })
      )
      await waitFor(() => expect(isOn(toggleFor(SHARE_CONTACT))).toBe(false))
    })

    it('reflects the new state once the save succeeds', async () => {
      const user = await renderProfile({ shareContactInfo: false })

      await user.click(toggleFor(SHARE_CONTACT))

      await waitFor(() => expect(isOn(toggleFor(SHARE_CONTACT))).toBe(true))
    })

    it('leaves the toggle alone when the save fails', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      const user = await renderProfile({ shareContactInfo: false })
      mockApi.put.mockRejectedValue(new Error('network down'))

      await user.click(toggleFor(SHARE_CONTACT))

      await waitFor(() => expect(consoleError).toHaveBeenCalled())
      // The switch must not claim a setting the server never stored — that would show a donor
      // their number is private when it is being shared, or the reverse.
      expect(isOn(toggleFor(SHARE_CONTACT))).toBe(false)
    })

    it('flips twice in a row without desynchronising from what was sent', async () => {
      const user = await renderProfile({ shareContactInfo: false })

      await user.click(toggleFor(SHARE_CONTACT))
      await waitFor(() => expect(isOn(toggleFor(SHARE_CONTACT))).toBe(true))
      await user.click(toggleFor(SHARE_CONTACT))
      await waitFor(() => expect(isOn(toggleFor(SHARE_CONTACT))).toBe(false))

      expect(mockApi.put.mock.calls.map(([, body]) => body)).toEqual([
        { shareContactInfo: true },
        { shareContactInfo: false }
      ])
    })
  })

  describe('the Availability toggle beside it', () => {
    it('does not save immediately, which is what makes the contact toggle distinctive', async () => {
      const user = await renderProfile({ isAvailable: true })

      await user.click(toggleFor('Availability'))

      expect(isOn(toggleFor('Availability'))).toBe(false)
      // Availability is local state until Save Changes. Pinning this makes it clear the
      // contact toggle's immediate write is deliberate rather than an accident of the pattern.
      expect(mockApi.put).not.toHaveBeenCalled()
    })
  })
})

/*
 * Accessibility gap noticed while writing these tests, and not a bug in the logic under test:
 * both toggles on this page are unlabelled `<button>`s with no `role="switch"` and no
 * `aria-pressed`/`aria-checked`, so a screen reader announces two nameless buttons and
 * conveys neither what they control nor whether they are on. Adding `role="switch"`,
 * `aria-checked` and an `aria-label` would fix that and would also let these tests read the
 * state through the accessibility tree instead of through a Tailwind class.
 */
