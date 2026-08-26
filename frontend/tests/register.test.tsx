import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterPage from '@/app/register/page'
import { mockApi } from './helpers/api'
import { authUser } from './helpers/fixtures'
import { stubGeolocation, grantLocation, denyLocation } from './helpers/geolocation'

jest.mock('@/lib/api')

// Hospital-branch tests fill more fields (name + license on top of the 4 shared fields) and
// getByLabelText is slower than getByPlaceholderText — it traverses the accessibility tree
// rather than doing a plain attribute lookup. 15 s is generous but not unbounded.
jest.setTimeout(15000)

const routerPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, replace: jest.fn(), refresh: jest.fn(), back: jest.fn() })
}))

/**
 * Every input on this page pairs a `<label htmlFor>` with an `id`, so the visible label is
 * the handle these tests use. That is the more durable one: a placeholder is example content
 * and can be reworded freely, whereas the label is the field's name and changing it changes
 * what the form asks for.
 */
const LABEL = {
  name: 'Full name',
  email: 'Email address',
  password: 'Password',
  city: 'City',
  area: 'Area / neighborhood',
  hospitalName: 'Hospital name',
  address: 'Address',
  licenseNo: 'License number'
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
  await user.type(screen.getByLabelText(LABEL.name), 'Ali Khan')
  await user.type(screen.getByLabelText(LABEL.email), 'ali@example.com')
  await user.type(screen.getByLabelText(LABEL.password), 'hunter2!')
  await user.type(screen.getByLabelText(LABEL.city), 'DI Khan')
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

      expect(screen.getByLabelText(LABEL.area)).toBeInTheDocument()
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
      expect(screen.queryByLabelText(LABEL.area)).not.toBeInTheDocument()
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
      expect(screen.getByLabelText(LABEL.area)).toBeInTheDocument()

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
      await user.type(screen.getByLabelText(LABEL.area), 'Hayatabad')

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
      await user.type(screen.getByLabelText(LABEL.hospitalName), 'DHQ Hospital')
      await user.type(screen.getByLabelText(LABEL.licenseNo), 'DHQ-DIK-2024')
      await user.click(screen.getByRole('button', { name: 'Enter address instead' }))
      await user.type(screen.getByLabelText(LABEL.address), 'Hospital Road')

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
      await user.type(screen.getByLabelText(LABEL.hospitalName), 'DHQ Hospital')
      await user.type(screen.getByLabelText(LABEL.licenseNo), 'DHQ-DIK-2024')
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
      await user.type(screen.getByLabelText(LABEL.hospitalName), 'DHQ Hospital')
      await user.type(screen.getByLabelText(LABEL.licenseNo), 'DHQ-DIK-2024')

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
      await user.type(screen.getByLabelText(LABEL.hospitalName), 'DHQ Hospital')
      await user.type(screen.getByLabelText(LABEL.licenseNo), 'DHQ-DIK-2024')

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
 * The accessibility gap these tests were originally written around — text inputs whose
 * `<label>` was neither associated by `htmlFor`/`id` nor wrapped around the input, so a
 * screen reader announced every field as unlabelled — is fixed. The queries above select by
 * visible label as a result, which also means a test fails if a field loses its label rather
 * than passing quietly against a placeholder that happens to still be there.
 *
 * The blood-group picker is a grid of buttons rather than a single control, so it is labelled
 * by `role="group"` + `aria-labelledby` and each button carries `aria-pressed`. That state is
 * not asserted here; these tests are about the location picker.
 */
