"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Gift } from "lucide-react";
import Button from "@/components/Button";

interface GiftRevealStageProps {
  amount: string;
  currency: string;
  wrapperStyle?: "classic" | "modern" | "luxury";
  onRevealComplete?: () => void;
}

export const GiftRevealStage: React.FC<GiftRevealStageProps> = ({
  amount,
  currency,
  wrapperStyle = "luxury",
  onRevealComplete,
}) => {
  const [stage, setStage] = useState<"idle" | "unwrapping" | "shining" | "revealed">("idle");

  const handleStartReveal = () => {
    if (stage !== "idle") return;
    
    setStage("unwrapping");
    
    // Stage sequence
    setTimeout(() => {
      setStage("shining");
    }, 1200);

    setTimeout(() => {
      setStage("revealed");
      if (onRevealComplete) onRevealComplete();
    }, 2500);
  };

  const getWrapperColor = () => {
    switch (wrapperStyle) {
      case "modern": return "from-blue-500 to-indigo-600";
      case "luxury": return "from-amber-400 to-orange-500";
      case "classic": 
      default: return "from-rose-500 to-pink-600";
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[400px] w-full max-w-md mx-auto overflow-hidden">
      <AnimatePresence mode="wait">
        {stage === "idle" && (
          <motion.div
            key="idle"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            className="flex flex-col items-center cursor-pointer group"
            onClick={handleStartReveal}
          >
            <div className={`w-48 h-48 rounded-[32px] bg-gradient-to-br ${getWrapperColor()} shadow-2xl flex items-center justify-center animate-float relative overflow-hidden animate-pulse-glow`}>
                <div className="absolute inset-0 shimmer-animation opacity-30" />
                <Gift className="w-24 h-24 text-white drop-shadow-lg" />
                <div className="absolute top-0 right-0 p-4">
                    <Sparkles className="w-6 h-6 text-white/50 animate-pulse" />
                </div>
            </div>
            <p className="mt-8 text-slate-500 font-medium group-hover:text-indigo-600 transition-colors">
              Tap to open your gift
            </p>
          </motion.div>
        )}

        {stage === "unwrapping" && (
          <motion.div
            key="unwrapping"
            initial={{ scale: 1 }}
            animate={{ 
                scale: [1, 1.1, 0.9, 1.2],
                rotate: [0, 5, -5, 10, -10, 0]
            }}
            transition={{ duration: 1.2 }}
            className="relative"
          >
             <div className={`w-56 h-56 rounded-full bg-gradient-to-br ${getWrapperColor()} flex items-center justify-center blur-2xl opacity-50 absolute inset-0`} />
             <div className={`relative w-48 h-48 rounded-[32px] bg-gradient-to-br ${getWrapperColor()} shadow-2xl flex items-center justify-center`}>
                <Gift className="w-24 h-24 text-white opacity-20" />
                <motion.div 
                    className="absolute inset-0 bg-white"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.8, 0] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                />
             </div>
          </motion.div>
        )}

        {stage === "shining" && (
           <motion.div
             key="shining"
             initial={{ scale: 0.5, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="relative flex items-center justify-center"
           >
              <motion.div 
                className="absolute w-64 h-64 bg-white rounded-full blur-[80px]"
                animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                transition={{ duration: 1 }}
              />
              <Sparkles className="w-48 h-48 text-amber-300 animate-spin-slow" />
           </motion.div>
        )}

        {stage === "revealed" && (
          <motion.div
            key="revealed"
            initial={{ y: 50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="flex flex-col items-center"
          >
            <motion.div 
                initial={{ rotate: -10 }}
                animate={{ rotate: 0 }}
                className="bg-white rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.1)] p-12 border border-slate-100 flex flex-col items-center animate-shine"
            >
               <span className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-2">You Received</span>
               <div className="flex items-baseline gap-1">
                 <span className="text-2xl font-bold text-slate-800">{currency}</span>
                 <span className="text-6xl font-black text-indigo-600 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                    {amount}
                 </span>
               </div>
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: "100%" }}
                 transition={{ delay: 0.5, duration: 0.5 }}
                 className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mt-6"
               />
            </motion.div>
            
            <p className="mt-8 text-slate-400 text-sm">Amount successfully matched</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const styleStyles = {
    animation: "shine-sweep 3s infinite",
};
