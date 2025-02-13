import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-900 to-blue-900 text-white">
      <div className="text-center p-8 rounded-lg shadow-lg bg-black bg-opacity-50">
        <h1 className="text-4xl font-bold mb-6">Learning Web Application Development</h1>
        <div className="space-x-4">
          <Link href="/login/">
            <button
              id="signInButton"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-md transition"
            >
              Sign In
            </button>
          </Link>
          <Link href="/register/">
            <button
              id="signUpButton"
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-md transition"
            >
              Sign Up
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}