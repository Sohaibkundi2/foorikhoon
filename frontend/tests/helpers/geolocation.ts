/**
 * jsdom ships no `navigator.geolocation` at all, so the property has to be defined rather
 * than overwritten — and defined as `configurable` so each test can redefine it.
 */
export function stubGeolocation(): jest.Mock {
  const getCurrentPosition = jest.fn()

  Object.defineProperty(window.navigator, 'geolocation', {
    value: { getCurrentPosition, watchPosition: jest.fn(), clearWatch: jest.fn() },
    configurable: true,
    writable: true
  })

  return getCurrentPosition
}

/** Resolves the next `getCurrentPosition` call with the given coordinates. */
export function grantLocation(
  getCurrentPosition: jest.Mock,
  latitude = 31.8313,
  longitude = 70.9017
): { latitude: number; longitude: number } {
  getCurrentPosition.mockImplementation((onSuccess: PositionCallback) => {
    onSuccess({ coords: { latitude, longitude } } as GeolocationPosition)
  })

  return { latitude, longitude }
}

/**
 * Rejects the next `getCurrentPosition` call the way a browser does when the user blocks
 * the permission prompt.
 *
 * Both `code` and `PERMISSION_DENIED` are set because the components compare the two
 * against each other (`err.code === err.PERMISSION_DENIED`) instead of against the numeric
 * constant — an error object carrying only `code: 1` would take the generic branch.
 */
export function denyLocation(
  getCurrentPosition: jest.Mock,
  code = 1 // GeolocationPositionError.PERMISSION_DENIED
): void {
  getCurrentPosition.mockImplementation(
    (_onSuccess: PositionCallback, onError: PositionErrorCallback) => {
      onError({
        code,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: 'User denied Geolocation'
      } as GeolocationPositionError)
    }
  )
}
