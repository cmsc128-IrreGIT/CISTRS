import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import { useAuth } from "../hooks/auth_context";
import { useRef } from "react";
import { Eye, EyeOff, PlaneTakeoff } from "lucide-react";
import { useState } from "react";
import type { SubmitEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import login_plane from "../../../assets/login_plane.png";
import AuthPanel from "../components/auth_panel";

const input_style =
    "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600";

const link_style =
    "rounded-sm text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600";

export default function LoginPage() {
    const [show_password, set_show_password] = useState(false);
    const [error, set_error] = useState("");

    const { user, login, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [pending, set_pending] = useState(false);
    const submitting = useRef(false);
    const requested = (location.state as { from?: string } | null)?.from;
    const destination =
        requested?.startsWith("/") &&
        !requested.startsWith("//") &&
        !requested.startsWith("/login")
            ? requested
            : "/dashboard";
    if (loading) return <ScreenLoading label="Opening your workspace…" />;
    if (user) return <Navigate to={destination} replace />;
    async function handle_submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        const username = form.elements.namedItem("username");

        if (username instanceof HTMLInputElement) {
            username.setCustomValidity(
                username.value.trim() ? "" : "Enter your username.",
            );
        }

        if (!form.reportValidity()) return;

        if (submitting.current) return;
        const password = (
            form.elements.namedItem("password") as HTMLInputElement
        ).value;
        submitting.current = true;
        set_pending(true);
        set_error("");
        try {
            await login((username as HTMLInputElement).value, password);
            navigate(destination, { replace: true });
        } catch (error) {
            set_error(
                error instanceof Error ? error.message : "Unable to sign in.",
            );
        } finally {
            submitting.current = false;
            set_pending(false);
        }
    }

    return (
        <main className="relative isolate grid min-h-dvh bg-[#0b2238] lg:grid-cols-2">
            <img
                src={login_plane}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-left lg:object-center"
            />

            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-r from-[#0b2238]/75 via-[#0b2238]/40 to-[#0b2238]/25"
            />

            <section
                aria-label="About CISTRS"
                className="flex items-center px-6 py-8 text-white sm:px-10 lg:p-12"
            >
                <div className="mx-auto w-full max-w-lg">
                    <div className="flex items-center gap-3">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-red-400">
                            <PlaneTakeoff
                                size={28}
                                strokeWidth={1.8}
                                aria-hidden="true"
                            />
                        </span>

                        <span className="text-3xl font-bold tracking-tight sm:text-4xl">
                            CISTRS
                        </span>
                    </div>

                    <p className="mt-5 text-sm font-medium text-slate-200">
                        Shuttle Air Services, Inc.
                    </p>

                    <p className="mt-3 max-w-md text-lg leading-relaxed text-white sm:text-xl">
                        Inventory, maintenance, and operational records in one
                        place.
                    </p>
                </div>
            </section>

            <AuthPanel labelled_by="page_title">
                <h1
                    id="page_title"
                    className="text-3xl font-bold tracking-tight text-[#0b2238]"
                >
                    Welcome back
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                    Sign in to your account.
                </p>

                <form
                    onSubmit={handle_submit}
                    aria-busy={pending}
                    className="mt-5 space-y-5"
                >
                    <fieldset
                        disabled={pending}
                        className="space-y-5 border-0 p-0"
                    >
                        <div>
                            <label
                                htmlFor="username"
                                className="mb-2 block text-sm font-medium text-slate-700"
                            >
                                Username
                            </label>

                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                autoCapitalize="none"
                                spellCheck={false}
                                required
                                maxLength={200}
                                onChange={(event) => {
                                    event.currentTarget.setCustomValidity("");
                                    set_error("");
                                }}
                                className={input_style}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="mb-2 block text-sm font-medium text-slate-700"
                            >
                                Password
                            </label>

                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={show_password ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    onChange={() => set_error("")}
                                    className={`${input_style} cistrs-password pr-12`}
                                />

                                <button
                                    type="button"
                                    aria-label={
                                        show_password
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                    aria-pressed={show_password}
                                    aria-controls="password"
                                    onClick={() =>
                                        set_show_password(
                                            (previous) => !previous,
                                        )
                                    }
                                    className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-red-600"
                                >
                                    {show_password ? (
                                        <EyeOff size={19} aria-hidden="true" />
                                    ) : (
                                        <Eye size={19} aria-hidden="true" />
                                    )}
                                </button>
                            </div>

                            <div className="mt-2 text-right">
                                <Link
                                    to="/forgot-password"
                                    className={link_style}
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        {error && (
                            <p role="alert" className="text-sm text-red-700">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="flex min-h-11 w-full items-center justify-center rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                        >
                            {pending ? "Signing in…" : "Log in"}
                        </button>
                    </fieldset>
                </form>

                <p className="mt-5 text-center text-sm text-slate-500">
                    Need an account?{" "}
                    <Link to="/signup" className={link_style}>
                        Request access
                    </Link>
                </p>
            </AuthPanel>
        </main>
    );
}
