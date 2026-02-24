"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
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
      // Validate callbackUrl is a relative path to prevent open redirects
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
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <input
        type="email"
        placeholder="Email address"
        className="w-full p-2 border rounded"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full p-2 border rounded"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Login to Zendvo</h1>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
