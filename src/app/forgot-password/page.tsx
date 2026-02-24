"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/Input";
import Button from "@/components/Button";
import Alert from "@/components/Alert";
import { ChevronLeft } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus(null);

        // Mocking the API call
        setTimeout(() => {
            setIsLoading(false);
            if (email.includes("@")) {
                setStatus({
                    type: "success",
                    message: "A reset link has been sent to your email address.",
                });
            } else {
                setStatus({
                    type: "error",
                    message: "Please enter a valid email address.",
                });
            }
        }, 1500);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-[#030213] mb-2">Forgot Password?</h1>
                    <p className="text-[#717182] text-sm">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>

                {status && (
                    <Alert
                        type={status.type}
                        message={status.message}
                        onClose={() => setStatus(null)}
                    />
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        id="email"
                        type="email"
                        label="Email Address"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />

                    <Button type="submit" className="w-full" isLoading={isLoading}>
                        Send Reset Link
                    </Button>
                </form>

                <div className="mt-8 text-center">
                    <Link
                        href="/auth/login"
                        className="inline-flex items-center text-sm font-medium text-[#6c5ce7] hover:underline"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
