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
 * Finds a toggle by its accessible name.
 *
 * These used to be bare `<button>`s with no text and no role, so the only handle the markup
 * offered was to find the adjacent heading and walk back out to a shared ancestor — which
 * broke on any change to the nesting and tested nothing a user or a screen reader can
 * perceive. Both switches now carry `role="switch"` and an `aria-label`, so the query is the
 * same one assistive technology makes.
 */
const toggleFor = (label: string) => screen.getByRole('switch', { name: label })

/**
 * Reads a toggle's state from `aria-checked`, the property that actually conveys it.
 *
 * The previous version asserted on `className.includes('bg-green-500')`, which would keep
 * passing if the switch stopped announcing its state entirely, and would fail on a pure
 * restyle that changed nothing a user can do.
 */
const isOn = (toggle: HTMLElement) => toggle.getAttribute('aria-checked') === 'true'

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

  describe('what the switches announce', () => {
    it('exposes both toggles as named switches carrying their own state', async () => {
      await renderProfile({ isAvailable: true, shareContactInfo: false })

      // The helpers above depend on this, but so does anyone using a screen reader: a
      // privacy setting whose state lives only in a background colour is unreadable to
      // them. Asserting it directly means a regression fails here with a clear reason
      // rather than surfacing as every other test in the file breaking at once.
      const switches = screen.getAllByRole('switch')
      expect(switches.map(s => s.getAttribute('aria-label'))).toEqual([
        'Availability',
        SHARE_CONTACT
      ])
      expect(switches.map(s => s.getAttribute('aria-checked'))).toEqual(['true', 'false'])
    })
  })
})
