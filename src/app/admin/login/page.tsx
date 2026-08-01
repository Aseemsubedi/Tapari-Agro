"use client";

import { useActionState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { loginAction } from "@/app/actions";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return loginAction(formData);
    },
    null,
  );

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center">
      <BrandLogo size="footer" href={null} />
      <h1 className="mt-6 font-display text-3xl text-ink">Admin login</h1>
      <p className="mt-2 text-sm text-ink/60">
        Manage products and orders for Tapari Agro.
      </p>
      <form action={formAction} className="mt-8 space-y-4">
        <div>
          <label className="text-xs font-medium text-ink/60" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue="admin@tapariagro.com"
            className="mt-1 w-full border border-pine/20 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink/60" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 w-full border border-pine/20 bg-white px-3 py-2 text-sm"
          />
        </div>
        {state?.error ? (
          <p className="text-sm text-red-700">{state.error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-pine px-4 py-3 text-sm font-semibold text-mist disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
