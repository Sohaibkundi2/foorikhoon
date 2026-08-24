import '@testing-library/jest-dom'

/**
 * jsdom implements neither of these, and both are reached during a normal render of the
 * pages under test — so without stubs the failure surfaces as an unrelated TypeError.
 *
 * `matchMedia` is touched by Next's client runtime; `scrollTo` by jsdom itself when a
 * component moves focus.
 */
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    })
  })
}

window.scrollTo = jest.fn()
