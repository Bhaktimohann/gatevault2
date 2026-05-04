"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={
          prefersReducedMotion
            ? { opacity: 1 }
            : { opacity: 0, y: 18, filter: "blur(8px)" }
        }
        animate={
          prefersReducedMotion
            ? { opacity: 1 }
            : { opacity: 1, y: 0, filter: "blur(0px)" }
        }
        exit={
          prefersReducedMotion
            ? { opacity: 1 }
            : { opacity: 0, y: -12, filter: "blur(6px)" }
        }
        transition={{
          duration: prefersReducedMotion ? 0 : 0.28,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
