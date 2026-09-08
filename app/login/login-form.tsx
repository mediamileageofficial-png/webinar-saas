"use client";

import Link from "next/link";
import { useActionState } from "react";
import { TextField } from "@/components/ui/text-field";
import { Wordmark } from "@/components/brand/wordmark";
import { BrandBackdrop } from "@/components/brand/brand-backdrop";
import { signInAction, type AuthActionState } from "./actions";

const initialState: AuthActionState = {};

function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <BrandBackdrop />
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <Wordmark className="mb-6" />
        <h1 className="text-xl font-semibold text-slate-900">Log in</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your webinars, forms, and registrations.
        </p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />

          {state.error && (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {pending ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-orange-600 hover:text-orange-700">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginForm;
