import { useAuthStore } from '@/store/authStore'
import { authUser } from './fixtures'

/**
 * Puts a signed-in user in the real zustand store rather than mocking the store module.
 *
 * The store is a plain `create()` with `persist`, and jsdom provides the localStorage that
 * middleware needs, so driving it through `setState` exercises the same code path the app
 * runs. Mocking `useAuthStore` instead would mean maintaining a fake of its selector
 * behaviour for no gain.
 *
 * Every page under test redirects when `user` is null or the role is wrong, so a test that
 * forgets this sees a redirect instead of the component — call it in `beforeEach`.
 */
export function signIn(role: 'DONOR' | 'HOSPITAL' | 'ADMIN' = 'DONOR'): void {
  useAuthStore.setState({ user: authUser({ role }), token: 'test-token' })
}

/** Clears the store. The module is shared across tests in a file, so state would leak. */
export function signOut(): void {
  useAuthStore.setState({ user: null, token: null })
}
