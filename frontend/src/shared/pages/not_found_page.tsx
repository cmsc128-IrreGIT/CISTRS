import { ArrowLeft, LayoutDashboard, PlaneTakeoff } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { button_styles } from "../styles/button_styles";

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <main className="flex min-h-dvh flex-col bg-slate-100">
            <header className="px-6 py-6 sm:px-10">
                <Link
                    to="/login"
                    aria-label="CISTRS login"
                    className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                >
                    <span className="flex size-10 items-center justify-center rounded-xl bg-white text-red-600">
                        <PlaneTakeoff size={24} aria-hidden="true" />
                    </span>
                    <span className="text-xl font-bold text-[#0b2238]">
                        CISTRS
                    </span>
                </Link>
            </header>

            <section
                aria-labelledby="page_title"
                className="flex flex-1 items-center justify-center px-6 pb-16"
            >
                <div className="w-full max-w-lg text-center">
                    <p className="text-8xl font-bold tracking-tight text-[#0b2238] sm:text-9xl">
                        404
                    </p>

                    <h1
                        id="page_title"
                        className="mt-5 text-2xl font-bold text-slate-900 sm:text-3xl"
                    >
                        Page not found
                    </h1>

                    <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">
                        The page may have moved, or the address may be
                        incorrect. Check the address or return to the dashboard.
                    </p>

                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className={button_styles("secondary")}
                        >
                            <ArrowLeft size={18} aria-hidden="true" />
                            Go back
                        </button>

                        <Link
                            to="/dashboard"
                            className={button_styles("secondary")}
                        >
                            <LayoutDashboard size={18} aria-hidden="true" />
                            Open dashboard
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
