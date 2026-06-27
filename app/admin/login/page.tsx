"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LoaderIcon, EyeIcon, EyeOffIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsLoading(true);

      try {
        const res = await fetch("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const json = (await res.json()) as { error?: { message?: string } };
          setError(json.error?.message ?? "Invalid credentials");
          return;
        }

        router.push("/admin/dashboard");
        router.refresh();
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, router],
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/admin_background.png')" }}
      />
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="font-serif text-3xl tracking-tight text-white">
            Admin
          </h1>
          <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/60">
            Prompt Gallery
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 rounded-md border border-neutral-200/50 bg-white/95 p-7 shadow-xl backdrop-blur-sm"
        >
          <div>
            <label htmlFor="email" className="mb-1.5 block text-[12px] font-medium text-neutral-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-[12px] font-medium text-neutral-700">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-neutral-200 px-3 py-2 pr-10 text-sm transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 transition-colors hover:text-neutral-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-[#FDEBEC] px-3 py-2 text-[12px] text-[#9F2F2D]" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2.5",
              "text-sm font-medium text-neutral-50",
              "transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
              isLoading ? "cursor-not-allowed opacity-60" : "hover:bg-neutral-700 active:scale-[0.98]",
            )}
          >
            {isLoading && <LoaderIcon size={14} />}
            {isLoading ? "Signing in" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
