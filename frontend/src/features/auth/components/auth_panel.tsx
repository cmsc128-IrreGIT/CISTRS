import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

type AuthPanelProps = {
    children: ReactNode;
    labelled_by: string;
};

export default function AuthPanel({ children, labelled_by }: AuthPanelProps) {
    const reduce_motion = useReducedMotion();

    return (
        <motion.section
            aria-labelledby={labelled_by}
            initial={reduce_motion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full min-w-0 max-w-md rounded-2xl border border-white/60 bg-white p-6 text-[#0b2238] shadow-2xl shadow-[#071724]/40 sm:p-8"
        >
            {children}
        </motion.section>
    );
}
