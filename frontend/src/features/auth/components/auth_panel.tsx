import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

type AuthPanelProps = {
    children: ReactNode;
    labelled_by: string;
};

export default function AuthPanel({ children, labelled_by }: AuthPanelProps) {
    const reduce_motion = useReducedMotion();

    return (
        <section
            aria-labelledby={labelled_by}
            className="flex items-center justify-center px-4 pb-10 pt-2 sm:px-8 lg:px-10 lg:py-12"
        >
            <motion.div
                initial={reduce_motion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-2 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-3"
            >
                <div className="rounded-2xl bg-white p-6 sm:p-8">
                    {children}
                </div>
            </motion.div>
        </section>
    );
}
