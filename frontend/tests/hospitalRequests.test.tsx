import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HospitalRequestsPage from '@/app/hospital/requests/page'
import { mockApi } from './helpers/api'
import { bloodRequest, hospitalMatch } from './helpers/fixtures'
import { signIn } from './helpers/auth'

jest.mock('@/lib/api')

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn() })
}))

/** Renders the page with `/api/hospital/requests` stubbed, and waits out the loading state. */
async function renderRequests(requests: ReturnType<typeof bloodRequest>[]) {
  mockApi.get.mockImplementation(async (url: string) => {
    if (url === '/api/hospital/requests') return { data: { requests } }
    throw new Error(`Unstubbed GET in a test: ${url}`)
  })
  mockApi.put.mockResolvedValue({ data: {} })
  mockApi.patch.mockResolvedValue({ data: {} })

  const user = userEvent.setup()
  render(<HospitalRequestsPage />)
  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

  // Anchor on the ALL tab's count before asserting anything. Most tests here assert that a
  // button is *absent*, and a failed fetch leaves `requests` empty — every one of them would
  // pass on an empty page. This makes the data actually having arrived a precondition.
  if (requests.length > 0) {
    await screen.findByRole('button', { name: `ALL (${requests.length})` })
  }

  return user
}

/** A request in the one state where the hospital has work left to do on it. */
const matchedWithAcceptedDonor = (matchOverrides: Record<string, unknown> = {}) =>
  bloodRequest({
    status: 'MATCHED',
    matches: [hospitalMatch({ status: 'ACCEPTED', ...matchOverrides })]
  })

const contact = (name: string, phone: string | null) => ({ donorContact: { name, phone } })

describe('hospital requests page', () => {
  beforeEach(() => {
    signIn('HOSPITAL')
  })

  describe('Mark Fulfilled', () => {
    it('renders for a MATCHED request with an accepted donor', async () => {
      await renderRequests([matchedWithAcceptedDonor()])

      expect(screen.getByRole('button', { name: 'Mark Fulfilled' })).toBeInTheDocument()
    })

    it.each(['PENDING', 'FULFILLED', 'EXPIRED', 'NO_SHOW'])(
      'does not render for a %s request, even with an accepted donor',
      async (status) => {
        await renderRequests([
          bloodRequest({ status, matches: [hospitalMatch({ status: 'ACCEPTED' })] })
        ])

        expect(screen.queryByRole('button', { name: 'Mark Fulfilled' })).not.toBeInTheDocument()
      }
    )

    it('does not render for a MATCHED request whose donors have not accepted yet', async () => {
      // MATCHED status alone is not the gate — see the note at the bottom of this file.
      await renderRequests([
        bloodRequest({
          status: 'MATCHED',
          matches: [hospitalMatch({ status: 'PENDING' }), hospitalMatch({ status: 'DECLINED' })]
        })
      ])

      expect(screen.queryByRole('button', { name: 'Mark Fulfilled' })).not.toBeInTheDocument()
    })

    it('renders once per eligible request in a mixed list', async () => {
      await renderRequests([
        matchedWithAcceptedDonor(),
        bloodRequest({ id: 'request-pending', status: 'PENDING' }),
        bloodRequest({
          id: 'request-fulfilled',
          status: 'FULFILLED',
          matches: [hospitalMatch({ status: 'COMPLETED' })]
        })
      ])

      expect(screen.getAllByRole('button', { name: 'Mark Fulfilled' })).toHaveLength(1)
    })
  })

  describe('Report No-Show', () => {
    it('renders when a donor accepted the request', async () => {
      await renderRequests([matchedWithAcceptedDonor()])

      expect(screen.getByRole('button', { name: 'Report No-Show' })).toBeInTheDocument()
    })

    it('does not render when no match on the request was accepted', async () => {
      await renderRequests([
        bloodRequest({
          status: 'MATCHED',
          matches: [hospitalMatch({ status: 'PENDING' }), hospitalMatch({ status: 'DECLINED' })]
        })
      ])

      expect(screen.queryByRole('button', { name: 'Report No-Show' })).not.toBeInTheDocument()
    })

    it('does not render when the request has no matches at all', async () => {
      await renderRequests([bloodRequest({ status: 'MATCHED', matches: [] })])

      expect(screen.queryByRole('button', { name: 'Report No-Show' })).not.toBeInTheDocument()
    })

    it('finds the accepted match among several', async () => {
      await renderRequests([
        bloodRequest({
          status: 'MATCHED',
          matches: [
            hospitalMatch({ id: 'match-declined', status: 'DECLINED' }),
            hospitalMatch({ id: 'match-accepted', status: 'ACCEPTED' })
          ]
        })
      ])

      expect(screen.getByRole('button', { name: 'Report No-Show' })).toBeInTheDocument()
    })

    it('reports against the match id, not the request id', async () => {
      // A no-show is a mark against one donor's record. Sending the request id here would
      // either 404 or, worse, penalise whichever donor happened to share that id.
      const user = await renderRequests([
        matchedWithAcceptedDonor({ id: 'match-accepted-42' })
      ])

      await user.click(screen.getByRole('button', { name: 'Report No-Show' }))

      await waitFor(() =>
        expect(mockApi.patch).toHaveBeenCalledWith('/api/hospital/matches/match-accepted-42/no-show')
      )
    })
  })

  describe('donor contact line', () => {
    it('shows the name and phone when the donor shared them', async () => {
      await renderRequests([matchedWithAcceptedDonor(contact('Ali Khan', '03001234567'))])

      expect(screen.getByText(/Accepted by Ali Khan · 03001234567/)).toBeInTheDocument()
    })

    it('shows the name alone, with no trailing separator, when the phone is missing', async () => {
      await renderRequests([matchedWithAcceptedDonor(contact('Ali Khan', null))])

      const line = screen.getByText(/Accepted by Ali Khan/)
      expect(line).toBeInTheDocument()
      // A dangling ' · ' would read as a rendering glitch to the hospital staff.
      // The tick beside this line is an aria-hidden icon rather than a literal
      // character, so it contributes nothing to textContent.
      expect(line.textContent?.trim()).toBe('Accepted by Ali Khan')
    })

    it('says contact info was not shared when the donor withheld it', async () => {
      await renderRequests([matchedWithAcceptedDonor({ donorContact: null })])

      expect(screen.getByText(/Accepted — contact info not shared/)).toBeInTheDocument()
      // The absence of a contact must not be dressed up as one.
      expect(screen.queryByText(/Accepted by/)).not.toBeInTheDocument()
    })

    it('shows no contact line at all before a donor has accepted', async () => {
      await renderRequests([
        bloodRequest({ status: 'MATCHED', matches: [hospitalMatch({ status: 'PENDING' })] })
      ])

      expect(screen.queryByText(/Accepted by/)).not.toBeInTheDocument()
      expect(screen.queryByText(/contact info not shared/)).not.toBeInTheDocument()
    })
  })

  describe('Cancel', () => {
    it.each(['PENDING', 'MATCHED'])('renders for a %s request', async (status) => {
      await renderRequests([
        bloodRequest({ status, matches: [hospitalMatch({ status: 'ACCEPTED' })] })
      ])

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it.each(['FULFILLED', 'EXPIRED', 'NO_SHOW'])(
      'does not render for a %s request, which is already closed',
      async (status) => {
        await renderRequests([bloodRequest({ status })])

        expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
      }
    )

    it('expires the request it was clicked on', async () => {
      const user = await renderRequests([
        bloodRequest({ id: 'request-77', status: 'PENDING' })
      ])

      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      await waitFor(() =>
        expect(mockApi.put).toHaveBeenCalledWith('/api/requests/request-77', {
          newStatus: 'EXPIRED'
        })
      )
    })
  })
})

/*
 * Worth knowing about the two conditions above: "Mark Fulfilled" and "Report No-Show" share
 * one gate, `req.status === 'MATCHED' && acceptedMatch`, so neither is governed by status
 * alone or by the accepted match alone. That is defensible — both actions need a specific
 * donor to act on — but it means a request stuck in MATCHED with every donor declined offers
 * the hospital no action except Cancel. The gate itself is unchanged; the page now states the
 * reason on the record, distinguishing "waiting on N donors to respond" from "all N declined",
 * both counted off the matches already in the payload.
 */
