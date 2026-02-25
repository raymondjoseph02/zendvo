"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import { AuthLayout } from "@/layouts/AuthLayout";
import { WorldMapShowcase } from "@/components/auth/WordMapShowcase";
import { Input } from "@/components/Input";
import { PasswordInput } from "@/components/PasswordInput";
import Button from "@/components/Button";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      const callbackUrl = searchParams.get("callbackUrl");
      const redirectTo =
        callbackUrl && callbackUrl.startsWith("/")
          ? callbackUrl
          : "/dashboard/sender";
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-7 max-w-sm">
      <div className="gap-0.5 flex flex-col">
        <h1 className="text-lg md:text-xl font-bold text-[#18181B] leading-tight">
          Login.
        </h1>
        <p className="text-xs text-[#717182]">
          To start receiving cash gifts
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p className="text-red-500 text-sm" role="alert">
            {error}
          </p>
        )}

        <Input
          id="email"
          label="Email address"
          type="email"
          placeholder="john123@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <div className="space-y-1">
          <PasswordInput
            id="password"
            label="Password"
            placeholder="••••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-[#6c5ce7] hover:text-[#5f51d8] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <div className="pt-1">
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full rounded-lg text-sm font-medium"
            isLoading={isSubmitting}
          >
            Login
          </Button>
        </div>

        <p className="text-center text-xs text-[#717182] pt-1">
          Not registered yet?{" "}
          <Link
            href="/auth/sign-up"
            className="text-[#6c5ce7] hover:text-[#5f51d8] font-medium transition-colors"
          >
            Sign Up
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthLayout showcaseContent={<WorldMapShowcase />}>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
