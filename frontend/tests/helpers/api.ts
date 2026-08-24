import api from '@/lib/api'

/**
 * Typed handle on the mocked axios instance.
 *
 * `typeof api` is axios's callable `AxiosInstance` interface, which `jest.Mocked` does not
 * usefully narrow, so the cast names just the five verbs these pages actually use. Import
 * this only from a test file that has already called `jest.mock('@/lib/api')` — without
 * that call this is the real instance and every `mockResolvedValue` below would throw.
 */
export const mockApi = api as unknown as Record<
  'get' | 'post' | 'put' | 'patch' | 'delete',
  jest.Mock
>

/**
 * Fails any request the test did not explicitly account for.
 *
 * Without this, an unstubbed GET resolves to undefined and the component's own `catch`
 * swallows the resulting TypeError — leaving a page that renders as if the server returned
 * nothing. The test then asserts against empty state and passes for the wrong reason.
 */
export function rejectUnstubbedRequests(): void {
  for (const verb of ['get', 'post', 'put', 'patch', 'delete'] as const) {
    mockApi[verb].mockImplementation((url: string) => {
      throw new Error(`Unstubbed api.${verb} call in a test: ${url}`)
    })
  }
}
