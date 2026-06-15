import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
      <p className="text-[#DC2626] text-7xl font-bold mb-4">404</p>
      <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
      <p className="text-[#6B7280] text-sm mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="text-sm bg-[#DC2626] hover:bg-[#B91C1C] text-white px-6 py-2.5 rounded-md transition-colors duration-150 shadow-lg shadow-red-900/20"
      >
        Back to Home
      </Link>
    </div>
  )
}