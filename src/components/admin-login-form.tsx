"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions";

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return loginAction(formData);
    },
    null,
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label className="text-xs font-medium text-ink/55" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          defaultValue="admin@tapariagro.com"
          className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-pine"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-ink/55" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-pine"
        />
      </div>
      {state?.error ? (
        <p className="text-sm text-red-700">{state.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-pine px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-leaf disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Log in"}
      </button>
    </form>
  );
}
