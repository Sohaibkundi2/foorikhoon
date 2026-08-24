import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DonorDashboard from '@/app/donor/dashboard/page'
import { mockApi } from './helpers/api'
import { donorProfile, donorMatch, daysAgo } from './helpers/fixtures'
import { signIn } from './helpers/auth'

jest.mock('@/lib/api')

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn() })
}))

const AREA_WARNING = /Add your area to get matched with nearby requests/

type Fixtures = {
  donor?: ReturnType<typeof donorProfile>
  matches?: ReturnType<typeof donorMatch>[]
  badges?: string[]
}

/**
 * Renders the dashboard with both of its GETs stubbed, and does not return until the profile
 * has actually landed.
 *
 * The heading is the guard: the component's own `catch` swallows a failed fetch and drops
 * straight to the loaded layout, where `donor` is null and the greeting falls back to
 * "Welcome, Donor". Waiting for the real name means a broken stub fails here, loudly, rather
 * than further down as an assertion about a button that was never going to render.
 */
async function renderDashboard({ donor = donorProfile(), matches = [], badges = [] }: Fixtures = {}) {
  mockApi.get.mockImplementation(async (url: string) => {
    if (url === '/api/donor/profile') return { data: { donor, badges } }
    if (url === '/api/donor/matches') return { data: { matches } }
    throw new Error(`Unstubbed GET in a test: ${url}`)
  })
  mockApi.put.mockResolvedValue({ data: {} })

  const user = userEvent.setup()
  render(<DonorDashboard />)
  await screen.findByRole('heading', { name: 'Welcome, Ali' })
  return user
}

/**
 * Scopes queries to one stat card.
 *
 * Necessary rather than fastidious: the eligibility countdown and the commitment score both
 * render a bare number, so an unscoped `getByText('60')` can match the wrong card and pass
 * for the wrong reason.
 */
const card = (label: string) => screen.getByText(label).parentElement as HTMLElement

describe('donor dashboard', () => {
  beforeEach(() => {
    signIn('DONOR')
  })

  describe('missing-area warning', () => {
    it('renders a link to the profile when the donor has no area', async () => {
      await renderDashboard({ donor: donorProfile({ area: null }) })

      const warning = screen.getByRole('link', { name: AREA_WARNING })
      expect(warning).toHaveAttribute('href', '/donor/profile')
    })

    it('does not render when the donor has an area, which is shown instead', async () => {
      await renderDashboard({ donor: donorProfile({ area: 'Hayatabad' }) })

      expect(screen.queryByRole('link', { name: AREA_WARNING })).not.toBeInTheDocument()
      expect(screen.getByText(/Hayatabad/)).toBeInTheDocument()
    })

    it('treats an empty-string area as missing', async () => {
      // The check is `!donor?.area`, so '' has to warn — a donor who saved a blank field is
      // no more matchable than one who never filled it in.
      await renderDashboard({ donor: donorProfile({ area: '' }) })

      expect(screen.getByRole('link', { name: AREA_WARNING })).toBeInTheDocument()
    })
  })

  describe('eligibility countdown', () => {
    it('reads "Ready to donate" when the donor has never donated', async () => {
      await renderDashboard({ donor: donorProfile({ lastDonated: null }) })

      expect(within(card('Eligibility')).getByText('Ready to donate')).toBeInTheDocument()
      expect(within(card('Eligibility')).queryByText('days until eligible')).not.toBeInTheDocument()
    })

    it('reads "Ready to donate" on the day the 90-day window closes', async () => {
      // Exactly 90 days: the arithmetic lands on a hair under zero, which the component
      // clamps to 0. This is the boundary a countdown is most likely to get wrong.
      await renderDashboard({ donor: donorProfile({ lastDonated: daysAgo(90) }) })

      expect(within(card('Eligibility')).getByText('Ready to donate')).toBeInTheDocument()
    })

    it('reads "Ready to donate" long after the window closed', async () => {
      await renderDashboard({ donor: donorProfile({ lastDonated: daysAgo(200) }) })

      expect(within(card('Eligibility')).getByText('Ready to donate')).toBeInTheDocument()
    })

    it('counts the remaining days when the donor is still inside the window', async () => {
      await renderDashboard({ donor: donorProfile({ lastDonated: daysAgo(30) }) })

      const eligibility = within(card('Eligibility'))
      expect(eligibility.getByText('60')).toBeInTheDocument()
      expect(eligibility.getByText('days until eligible')).toBeInTheDocument()
      expect(eligibility.queryByText('Ready to donate')).not.toBeInTheDocument()
    })

    it('counts a single remaining day rather than rounding it away', async () => {
      // Rounding down here would tell a donor they are eligible a day early.
      await renderDashboard({ donor: donorProfile({ lastDonated: daysAgo(89) }) })

      expect(within(card('Eligibility')).getByText('1')).toBeInTheDocument()
      expect(within(card('Eligibility')).queryByText('Ready to donate')).not.toBeInTheDocument()
    })
  })

  describe('pending match actions', () => {
    it('offers Accept and Decline for a pending match', async () => {
      await renderDashboard({ matches: [donorMatch({ status: 'PENDING' })] })

      expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument()
    })

    it.each(['ACCEPTED', 'DECLINED', 'COMPLETED', 'NO_SHOW'])(
      'offers neither for a match that is already %s',
      async (status) => {
        await renderDashboard({ matches: [donorMatch({ status })] })

        expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument()
        // It is not simply hidden — it moved to the history section.
        expect(screen.getByText('Match History')).toBeInTheDocument()
      }
    )

    it('offers them once, for the pending match only, in a mixed list', async () => {
      await renderDashboard({
        matches: [
          donorMatch({ id: 'match-pending', status: 'PENDING' }),
          donorMatch({ id: 'match-accepted', status: 'ACCEPTED' }),
          donorMatch({ id: 'match-done', status: 'COMPLETED' })
        ]
      })

      expect(screen.getAllByRole('button', { name: 'Accept' })).toHaveLength(1)
      expect(screen.getAllByRole('button', { name: 'Decline' })).toHaveLength(1)
    })

    it('records the donor\'s answer against the match that was acted on', async () => {
      const user = await renderDashboard({
        matches: [
          donorMatch({ id: 'match-pending', status: 'PENDING' }),
          donorMatch({ id: 'match-other', status: 'COMPLETED' })
        ]
      })

      await user.click(screen.getByRole('button', { name: 'Accept' }))

      await waitFor(() =>
        expect(mockApi.put).toHaveBeenCalledWith('/api/donor/matches/match-pending', {
          status: 'ACCEPTED'
        })
      )
      // The row must leave the pending list, or the donor can answer the same request twice.
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
      )
    })
  })

  describe('certificate access', () => {
    it('offers a certificate for a completed donation', async () => {
      await renderDashboard({ matches: [donorMatch({ status: 'COMPLETED' })] })

      expect(screen.getByRole('button', { name: /View Certificate/ })).toBeInTheDocument()
    })

    it.each(['PENDING', 'ACCEPTED', 'DECLINED', 'NO_SHOW'])(
      'offers none for a match that is %s',
      async (status) => {
        await renderDashboard({ matches: [donorMatch({ status })] })

        expect(screen.queryByRole('button', { name: /View Certificate/ })).not.toBeInTheDocument()
      }
    )

    it('offers exactly one, for the completed donation, in a mixed list', async () => {
      await renderDashboard({
        matches: [
          donorMatch({ id: 'match-done', status: 'COMPLETED' }),
          donorMatch({ id: 'match-noshow', status: 'NO_SHOW' }),
          donorMatch({ id: 'match-declined', status: 'DECLINED' })
        ]
      })

      expect(screen.getAllByRole('button', { name: /View Certificate/ })).toHaveLength(1)
    })
  })
})

/*
 * Two things noticed here that are not bugs these tests can assert against:
 *
 * 1. The eligibility block branches separately on `daysLeft === null` and `daysLeft === 0`
 *    and renders byte-identical markup for both. The second branch is unreachable in any way
 *    a user could tell apart; collapsing it to `daysLeft ? ... : <ReadyToDonate />` would
 *    behave the same.
 * 2. The data-loading effect lists `[hydrated, user]` as its dependencies, and `hydrated`
 *    flips false→true on mount, so `fetchData()` runs twice on every visit — four requests
 *    where two would do. Harmless, but it doubles the load on both endpoints.
 */
