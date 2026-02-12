import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-center text-2xl font-semibold text-gray-900">
          Welcome Back
        </h1>
        <p className="mb-6 text-center text-sm text-gray-600">
          Sign in with email/password or continue with Google.
        </p>

        <div className="flex justify-center">
          <SignIn
            path="/login"
            routing="path"
            fallbackRedirectUrl="/"
            forceRedirectUrl="/"
          />
        </div>
      </div>
    </main>
  );
}
