import { Form, Link, useActionData, useNavigation } from "react-router";

interface ActionData {
  success?: boolean;
  message?: string;
  error?: string;
}

export function ForgotPasswordCard() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d0d0d] px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00c8ff]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00c8ff] to-[#3b82f6] flex items-center justify-center mb-4 shadow-lg shadow-[#00c8ff]/20">
            <span className="text-lg font-black text-[#0d0d0d]">K</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">KYYXBOT</h1>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-1">Forgot password</h2>
          <p className="text-xs text-[#555] mb-5">
            Enter your email and we'll send a reset link if an account exists
          </p>

          <Form method="post" className="space-y-4">
            {actionData?.success && actionData.message && (
              <div className="rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-xs text-green-400">
                {actionData.message}
              </div>
            )}
            {actionData?.error && (
              <div className="rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 px-4 py-3 text-xs text-[#ef4444]">
                {actionData.error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-[#888]">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#444] outline-none focus:border-[#00c8ff]/50 focus:ring-1 focus:ring-[#00c8ff]/30 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#00c8ff] hover:bg-[#00b4e8] text-[#0d0d0d] font-semibold text-sm rounded-xl py-2.5 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-sm shadow-[#00c8ff]/20"
            >
              {isSubmitting ? "Sending..." : "Send reset link"}
            </button>
          </Form>
        </div>

        <p className="text-center text-xs text-[#444] mt-4">
          Remember your password?{" "}
          <Link to="/auth/login" className="text-[#00c8ff] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
