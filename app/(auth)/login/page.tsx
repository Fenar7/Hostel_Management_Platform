"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/auth/client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { loginSchema } from "@/lib/validation/auth";
import Image from "next/image";

type LoginForm = z.infer<typeof loginSchema>;

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    // Proactively sign out on mount to wipe any lingering/corrupted chunked cookies
    supabase.auth.signOut().catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  });

  async function onSubmit(data: LoginForm) {
    setServerError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      setServerError(err.error || "Login failed");
      return;
    }

    const result = await res.json();

    if (!result.passwordSetAt) {
      router.push("/set-password");
      return;
    }

    router.push(result.redirectUrl);
  }

  return (
    <div className="w-full max-w-[380px] mx-auto space-y-8">
      <div className="text-left space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-[#222222]">Welcome back</h1>
        <p className="text-[#767676] text-[15px] font-medium">You are a few moments away from getting started!</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="identifier" className="text-[14px] font-semibold text-[#222222]">
            Email or Phone
          </label>
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            className="flex h-[46px] w-full rounded-[8px] border border-[#dedede] bg-transparent px-3 text-[15px] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#222222] placeholder:text-[#a0a0a0]"
            placeholder="Enter your email or phone"
            {...register("identifier")}
          />
          {errors.identifier && (
            <p className="text-red-500 mt-1 text-xs font-medium">{errors.identifier.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-[14px] font-semibold text-[#222222]">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="flex h-[46px] w-full rounded-[8px] border border-[#dedede] bg-transparent px-3 pr-10 text-[15px] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#222222] placeholder:text-[#a0a0a0]"
              placeholder="**********"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#767676] hover:text-[#222222] transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 mt-1 text-xs font-medium">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1 pb-1">
          <input
            id="rememberMe"
            type="checkbox"
            className="size-[15px] rounded-[4px] border-[#dedede] text-[#222222] focus:ring-[#222222] cursor-pointer"
            {...register("rememberMe")}
          />
          <label htmlFor="rememberMe" className="text-[14px] font-medium text-[#767676] cursor-pointer hover:text-[#222222] transition-colors select-none">
            Remember me for 30 days
          </label>
        </div>

        {serverError && (
          <div className="rounded-[8px] border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800 shadow-sm">
            {serverError}
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full h-[48px] rounded-[8px] bg-[#222222] text-white hover:bg-black hover:opacity-90 transition-all font-semibold shadow-md mt-2 text-[15px]"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="mr-2 size-[18px] animate-spin" /> : null}
          {isSubmitting ? "Signing in..." : "Log In"}
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Hemisphere - Brand Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#121212] via-[#09090b] to-[#000000] overflow-hidden flex-col justify-between border-r border-white/5">
        
        {/* Top Sharp Green Accent Line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#58ff48]/70 to-transparent" />

        {/* Architectural Blueprint Grid */}
        <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
        
        {/* Massive Abstract Brand Geometry (Subtle) */}
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] border border-white/[0.02] rounded-[40px] rotate-12 pointer-events-none" />

        {/* Floating UI Element (Bespoke Dashboard Component) */}
        <div className="absolute top-[25%] right-12 w-[260px] rounded-2xl border border-white/10 bg-[#ffffff03] backdrop-blur-xl p-5 shadow-2xl pointer-events-none hidden xl:block">
          <div className="flex items-center justify-between mb-5">
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/50 font-bold">System Status</span>
            <div className="flex items-center gap-2 bg-[#58ff48]/10 px-2 py-0.5 rounded-full border border-[#58ff48]/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#58ff48] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#58ff48]"></span>
              </span>
              <span className="text-[10px] text-[#58ff48] font-bold">LIVE</span>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[10px] text-white/40 mb-1 font-medium"><span className="uppercase tracking-wider">Network Load</span><span>85%</span></div>
              <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                <div className="h-full w-[85%] bg-gradient-to-r from-[#58ff48]/40 to-[#58ff48] rounded-full shadow-[0_0_8px_rgba(88,255,72,0.5)]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-white/40 mb-1 font-medium"><span className="uppercase tracking-wider">Property Sync</span><span>60%</span></div>
              <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                <div className="h-full w-[60%] bg-gradient-to-r from-[#58ff48]/20 to-[#58ff48]/70 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Header / Logo */}
        <div className="relative z-10 p-12">
          <div className="flex items-center gap-3">
            <Image
              src="/anywhere-node-squre-icon.png"
              alt="Anywhere Node Logo"
              width={36}
              height={36}
              className="rounded-[8px] shadow-lg border border-white/10"
            />
            <span className="text-[18px] font-semibold tracking-tight text-white/90">Anywhere Node</span>
          </div>
        </div>

        {/* Editorial Text Placement (Bottom Anchored) */}
        <div className="relative z-10 p-12 pb-16 mt-auto">
          <div className="max-w-[500px]">
            <h2 className="text-[42px] font-semibold leading-[1.15] tracking-tight text-white mb-6">
              Next-generation property management.
            </h2>
            <p className="text-[16px] text-white/50 leading-[1.6] font-medium max-w-[420px] mb-12">
              Intelligent infrastructure for real-time dashboards, automated rent collection, and seamless tenant onboarding.
            </p>
          </div>

          {/* Footer / Info */}
          <div className="flex items-center gap-6 text-white/30 text-[13px] font-medium border-t border-white/10 pt-6">
            <span>© 2026 Anywhere Node</span>
            <a href="#" className="hover:text-white/80 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/80 transition-colors">Terms</a>
          </div>
        </div>
      </div>

      {/* Right Hemisphere - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white">
        {/* Mobile Header (only visible when left side is hidden) */}
        <div className="absolute top-8 left-8 flex items-center gap-2 lg:hidden">
            <Image
              src="/anywhere-node-squre-icon.png"
              alt="Anywhere Node Logo"
              width={32}
              height={32}
              className="rounded-[6px]"
            />
            <span className="text-[17px] font-bold tracking-tight text-[#222222]">Anywhere Node</span>
        </div>

        <Suspense fallback={<div className="text-center text-sm text-[#767676]">Loading...</div>}>
          <LoginFormInner />
        </Suspense>
      </div>
    </div>
  );
}
