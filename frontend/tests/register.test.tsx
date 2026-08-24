import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterPage from '@/app/register/page'
import { mockApi } from './helpers/api'
import { authUser } from './helpers/fixtures'
import { stubGeolocation, grantLocation, denyLocation } from './helpers/geolocation'

jest.mock('@/lib/api')

const routerPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, replace: jest.fn(), refresh: jest.fn(), back: jest.fn() })
}))

/**
 * The inputs on this page have no `id`/`htmlFor` pairing and are not nested inside their
 * `<label>`, so `getByLabelText` finds nothing. Placeholders are the only handle the markup
 * offers, and each one is unique. (That missing association is a real accessibility gap —
 * see the note at the bottom of this file.)
 */
const PLACEHOLDER = {
  name: 'Ali Khan',
  email: 'you@example.com',
  password: '•'.repeat(8),
  city: 'DI Khan',
  area: 'Hayatabad, Peshawar',
  hospitalName: 'DHQ Hospital DI Khan',
  address: 'Hospital Road, DI Khan',
  licenseNo: 'DHQ-DIK-2024'
} as const

const GPS_CONFIRMATION = /We'll use this to match you with nearby requests/
const PERMISSION_DENIED_MESSAGE =
  /We couldn't access your location\. You can try again or enter your address manually\./

let getCurrentPosition: jest.Mock

beforeEach(() => {
  getCurrentPosition = stubGeolocation()

  mockApi.post.mockImplementation(async (url: string) => {
    if (url === '/api/auth/register') return { data: {} }
    if (url === '/api/auth/login') {
      return { data: { user: authUser(), token: 'test-token' } }
    }
    if (url === '/api/donor/profile' || url === '/api/hospital/profile') return { data: {} }
    throw new Error(`Unstubbed POST in a test: ${url}`)
  })
})

/** Picks a role, which is what reveals the form at all. */
async function chooseRole(role: 'DONOR' | 'HOSPITAL') {
  const user = userEvent.setup()
  render(<RegisterPage />)
  await user.click(
    screen.getByRole('button', { name: role === 'DONOR' ? /Donate blood/ : /Request blood/ })
  )
  return user
}

/** Fills the four fields the shared validation branch requires. */
async function fillSharedFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText(PLACEHOLDER.name), 'Ali Khan')
  await user.type(screen.getByPlaceholderText(PLACEHOLDER.email), 'ali@example.com')
  await user.type(screen.getByPlaceholderText(PLACEHOLDER.password), 'hunter2!')
  await user.type(screen.getByPlaceholderText(PLACEHOLDER.city), 'DI Khan')
}

const profilePayload = (url: string) =>
  mockApi.post.mock.calls.find(([called]) => called === url)?.[1]

describe('register page — location picker', () => {

  describe('switching to manual entry', () => {
    it('shows the address input and hides the GPS prompt', async () => {
      const user = await chooseRole('DONOR')

      // Precondition: the GPS prompt is what renders first.
      expect(screen.getByRole('button', { name: 'Use My Location' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Enter address instead' }))

      expect(screen.getByPlaceholderText(PLACEHOLDER.area)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Use My Location' })).not.toBeInTheDocument()
      expect(screen.queryByText('Share your location')).not.toBeInTheDocument()
      // The escape hatch back to GPS has to stay reachable.
      expect(screen.getByRole('button', { name: 'Use my location instead' })).toBeInTheDocument()
    })

    it('does not ask the browser for a position', async () => {
      const user = await chooseRole('DONOR')
      await user.click(screen.getByRole('button', { name: 'Enter address instead' }))

      expect(getCurrentPosition).not.toHaveBeenCalled()
    })
  })

  describe('successful GPS capture', () => {
    it('renders the confirmation state and hides the manual address field', async () => {
      grantLocation(getCurrentPosition)
      const user = await chooseRole('DONOR')

      await user.click(screen.getByRole('button', { name: 'Use My Location' }))

      expect(screen.getByText(GPS_CONFIRMATION)).toBeInTheDocument()
      expect(screen.queryByPlaceholderText(PLACEHOLDER.area)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Enter address instead' })).not.toBeInTheDocument()
    })

    it('can be abandoned, which brings the manual option back', async () => {
      grantLocation(getCurrentPosition)
      const user = await chooseRole('DONOR')
      await user.click(screen.getByRole('button', { name: 'Use My Location' }))

      await user.click(screen.getByRole('button', { name: 'Use a different method' }))

      expect(screen.queryByText(GPS_CONFIRMATION)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Enter address instead' })).toBeInTheDocument()
    })
  })

  describe('denied GPS permission', () => {
    it('renders the permission-specific message and keeps manual entry available', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      denyLocation(getCurrentPosition)
      const user = await chooseRole('DONOR')

      await user.click(screen.getByRole('button', { name: 'Use My Location' }))

      expect(screen.getByText(PERMISSION_DENIED_MESSAGE)).toBeInTheDocument()
      expect(screen.queryByText(GPS_CONFIRMATION)).not.toBeInTheDocument()

      // Manual entry is not merely still on screen — it still works.
      await user.click(screen.getByRole('button', { name: 'Enter address instead' }))
      expect(screen.getByPlaceholderText(PLACEHOLDER.area)).toBeInTheDocument()

      expect(consoleError).toHaveBeenCalled()
    })

    it('distinguishes a denied prompt from a failed lookup', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      // POSITION_UNAVAILABLE — the device could not get a fix, nothing was refused.
      denyLocation(getCurrentPosition, 2)
      const user = await chooseRole('DONOR')

      await user.click(screen.getByRole('button', { name: 'Use My Location' }))

      expect(
        screen.getByText(/Something went wrong getting your location/)
      ).toBeInTheDocument()
      expect(screen.queryByText(PERMISSION_DENIED_MESSAGE)).not.toBeInTheDocument()
    })
  })

  describe('submitted payload', () => {
    it('sends latitude and longitude, and no area, when GPS was used', async () => {
      const coords = grantLocation(getCurrentPosition)
      const user = await chooseRole('DONOR')
      await fillSharedFields(user)
      await user.click(screen.getByRole('button', { name: 'Use My Location' }))

      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => expect(routerPush).toHaveBeenCalledWith('/donor/dashboard'))
      expect(profilePayload('/api/donor/profile')).toEqual({
        bloodGroup: '',
        latitude: coords.latitude,
        longitude: coords.longitude
      })
    })

    it('sends area, and no coordinates, when manual entry was used', async () => {
      const user = await chooseRole('DONOR')
      await fillSharedFields(user)
      await user.click(screen.getByRole('button', { name: 'Enter address instead' }))
      await user.type(screen.getByPlaceholderText(PLACEHOLDER.area), 'Hayatabad')

      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => expect(routerPush).toHaveBeenCalledWith('/donor/dashboard'))
      expect(profilePayload('/api/donor/profile')).toEqual({
        bloodGroup: '',
        area: 'Hayatabad'
      })
    })

    it('sends the address, and no coordinates, for a hospital using manual entry', async () => {
      const user = await chooseRole('HOSPITAL')
      await fillSharedFields(user)
      await user.type(screen.getByPlaceholderText(PLACEHOLDER.hospitalName), 'DHQ Hospital')
      await user.type(screen.getByPlaceholderText(PLACEHOLDER.licenseNo), 'DHQ-DIK-2024')
      await user.click(screen.getByRole('button', { name: 'Enter address instead' }))
      await user.type(screen.getByPlaceholderText(PLACEHOLDER.address), 'Hospital Road')

      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => expect(routerPush).toHaveBeenCalledWith('/hospital/dashboard'))
      expect(profilePayload('/api/hospital/profile')).toEqual({
        name: 'DHQ Hospital',
        licenseNo: 'DHQ-DIK-2024',
        address: 'Hospital Road'
      })
    })

    it('sends coordinates for a hospital that shared its location', async () => {
      const coords = grantLocation(getCurrentPosition)
      const user = await chooseRole('HOSPITAL')
      await fillSharedFields(user)
      await user.type(screen.getByPlaceholderText(PLACEHOLDER.hospitalName), 'DHQ Hospital')
      await user.type(screen.getByPlaceholderText(PLACEHOLDER.licenseNo), 'DHQ-DIK-2024')
      await user.click(screen.getByRole('button', { name: 'Use Current Location' }))

      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => expect(routerPush).toHaveBeenCalledWith('/hospital/dashboard'))
      expect(profilePayload('/api/hospital/profile')).toEqual({
        name: 'DHQ Hospital',
        licenseNo: 'DHQ-DIK-2024',
        latitude: coords.latitude,
        longitude: coords.longitude
      })
    })
  })

  describe('location is required before submitting', () => {
    it('blocks a hospital with neither coordinates nor an address', async () => {
      const user = await chooseRole('HOSPITAL')
      await fillSharedFields(user)
      await user.type(screen.getByPlaceholderText(PLACEHOLDER.hospitalName), 'DHQ Hospital')
      await user.type(screen.getByPlaceholderText(PLACEHOLDER.licenseNo), 'DHQ-DIK-2024')

      await user.click(screen.getByRole('button', { name: 'Create account' }))

      expect(screen.getByText('Please fill in all hospital details')).toBeInTheDocument()
      // Nothing may reach the server — a half-registered account is worse than a blocked one.
      expect(mockApi.post).not.toHaveBeenCalled()
      expect(routerPush).not.toHaveBeenCalled()
    })

    it('accepts a hospital once GPS coordinates satisfy the address requirement', async () => {
      grantLocation(getCurrentPosition)
      const user = await chooseRole('HOSPITAL')
      await fillSharedFields(user)
      await user.type(screen.getByPlaceholderText(PLACEHOLDER.hospitalName), 'DHQ Hospital')
      await user.type(screen.getByPlaceholderText(PLACEHOLDER.licenseNo), 'DHQ-DIK-2024')

      await user.click(screen.getByRole('button', { name: 'Use Current Location' }))
      await user.click(screen.getByRole('button', { name: 'Create account' }))

      await waitFor(() => expect(routerPush).toHaveBeenCalledWith('/hospital/dashboard'))
      expect(screen.queryByText('Please fill in all hospital details')).not.toBeInTheDocument()
    })

    it('blocks a donor with neither coordinates nor an area', async () => {
      const user = await chooseRole('DONOR')
      await fillSharedFields(user)

      await user.click(screen.getByRole('button', { name: 'Create account' }))

      expect(
        screen.getByText('Please share your location or enter your area')
      ).toBeInTheDocument()
      expect(mockApi.post).not.toHaveBeenCalled()
    })
  })
})

/*
 * Accessibility gap noticed while writing these tests, and not a bug in the logic under
 * test: none of the text inputs on this page associate their `<label>` with the input, so a
 * screen reader announces them as unlabelled. Adding `id` + `htmlFor` (or nesting the input
 * inside the label) would fix it and would also let these tests select fields by their
 * visible label instead of by placeholder, which is the more durable handle.
 */
