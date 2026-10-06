import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type PageTransitionProps = {
    children: ReactNode;
};

export default function PageTransition({ children }: PageTransitionProps) {
    const reduced_motion = useReducedMotion();

    return (
        <motion.div
            initial={
                reduced_motion
                    ? false
                    : {
                          opacity: 0,
                          y: 12,
                          filter: "blur(4px)",
                      }
            }
            animate={{
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
            }}
            transition={{
                duration: reduced_motion ? 0 : 0.35,
                ease: "easeOut",
            }}
        >
            {children}
        </motion.div>
    );
}
