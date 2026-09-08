"use client";

import Link from "next/link";
import { useActionState } from "react";
import { TextField } from "@/components/ui/text-field";
import type { AuthActionState } from "@/app/login/actions";
import { signUpAction } from "./actions";

const initialState: AuthActionState = {};

function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">
          Set up webinars, registration forms, and automated follow-ups.
        </p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <TextField label="Full name" name="fullName" type="text" autoComplete="name" required />
          <TextField label="Email" name="email" type="email" autoComplete="email" required />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />

          {state.error && (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}
          {state.info && (
            <p className="text-sm text-green-700" role="status">
              {state.info}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {pending ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-orange-600 hover:text-orange-700">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignupForm;
