"use client";
import { motion, AnimatePresence } from "framer-motion";

export function LiveFeedLine({ text }: { text: string }) {
  if (!text) return null;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={text.slice(0, 30)}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="text-center text-sm text-blue-300 py-1"
      >
        {text}
      </motion.div>
    </AnimatePresence>
  );
}
