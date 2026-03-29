"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Gift, Shield, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#5A42DE] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">Z</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900">
              Zendvo
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <Link
              href="#features"
              className="hover:text-[#5A42DE] transition-colors"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="hover:text-[#5A42DE] transition-colors"
            >
              How it works
            </Link>
            <Link
              href="#pricing"
              className="hover:text-[#5A42DE] transition-colors"
            >
              Pricing
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/auth/sign-up"
              className="px-5 py-2.5 text-sm font-semibold bg-[#5A42DE] text-white rounded-full hover:bg-[#4b35e5] transition-all shadow-lg shadow-[#5A42DE]/20"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ECEFFE] text-[#5A42DE] rounded-full text-sm font-bold">
              <Zap size={16} />
              <span>THE NEW WAY TO SEND LOVE</span>
            </div>

            <h1 className="text-6xl md:text-7xl font-bold text-[#18181B] leading-tight tracking-tighter">
              Gifting made <span className="text-[#5A42DE]">seamless</span> and
              digital.
            </h1>

            <p className="text-xl text-[#717182] max-w-lg leading-relaxed">
              Send thoughtful digital gifts to anyone, anywhere. Fast, secure,
              and personal. Experience the future of gifting today.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#5A42DE] text-white rounded-2xl font-bold text-lg hover:bg-[#4b35e5] transition-all shadow-xl shadow-[#5A42DE]/30"
              >
                Send a Gift Now
                <ArrowRight size={20} />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-700 border-2 border-gray-100 rounded-2xl font-bold text-lg hover:border-gray-200 transition-all"
              >
                See how it works
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1513885535751-8b9238bd345a?q=80&w=2070&auto=format&fit=crop"
                alt="Gifting Experience"
                width={1200}
                height={800}
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#5A42DE]/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-[#F7F7FC]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl font-bold text-gray-900">
              Everything you need to send the perfect gift
            </h2>
            <p className="text-[#717182] text-lg">
              We&apos;ve built a suite of tools to make digital gifting personal and
              delightful.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Gift size={24} />
              </div>
              <h3 className="text-xl font-bold mb-4">Instant Delivery</h3>
              <p className="text-[#717182]">
                Send gifts instantly via email or phone. No more waiting for
                shipping.
              </p>
            </div>

            <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold mb-4">Personalized</h3>
              <p className="text-[#717182]">
                Add beautiful templates and personal messages to every gift you
                send.
              </p>
            </div>

            <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6">
                <Shield size={24} />
              </div>
              <h3 className="text-xl font-bold mb-4">Secure & Private</h3>
              <p className="text-[#717182]">
                Bank-grade security ensures your transactions and data are
                always safe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="py-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <div className="w-6 h-6 bg-[#5A42DE] rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">Z</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900">
              Zendvo
            </span>
          </div>
          <div className="flex gap-8 text-sm text-[#717182]">
            <Link
              href="/terms"
              className="hover:text-gray-900 transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hover:text-gray-900 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/help"
              className="hover:text-gray-900 transition-colors"
            >
              Help
            </Link>
          </div>
          <p className="text-sm text-[#717182]">
            © 2026 Zendvo. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
