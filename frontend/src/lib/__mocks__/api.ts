/**
 * Manual mock for the shared axios instance, used by `jest.mock('@/lib/api')`.
 *
 * Methods start as unconfigured `jest.fn()`s returning undefined, so a component that hits
 * an endpoint the test never stubbed fails on `undefined.data` rather than rendering empty
 * state — the missing stub is visible instead of looking like a rendering bug.
 *
 * This also keeps the real module out of the test run entirely: it calls
 * `axios.create()` and registers an interceptor that reads `localStorage` at import time.
 */
const api = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn()
}

export default api
