import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import type { SubmitEvent } from "react";
import { Link, Navigate, useLocation } from "react-router";
import AuthBackdrop from "../../../shared/components/layouts/auth_backdrop";
import AuthPanel from "../components/auth_panel";
import { useAuth } from "../hooks/auth_context";
import { sign_in_error } from "../utils/sign_in_error";
import { get_sign_in_destination } from "../utils/sign_in_destination";

const input_style =
    "min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-base text-[#0b2238] placeholder:text-slate-500 aria-invalid:border-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8] sm:text-sm";
const label_style = "mb-1.5 block text-sm font-semibold text-slate-700";

export default function LoginPage() {
    const [show_password, set_show_password] = useState(false);
    const [error, set_error] = useState("");
    const [field_errors, set_field_errors] = useState<{
        username?: string;
        password?: string;
    }>({});
    const [pending, set_pending] = useState(false);
    const submitting = useRef(false);
    const { user, login, loading, error: workspace_error, retry } = useAuth();
    const location = useLocation();
    const requested = (location.state as { from?: string } | null)?.from;

    if (user)
        return (
            <Navigate to={get_sign_in_destination(user, requested)} replace />
        );

    function clear_error(field: "username" | "password") {
        set_error("");
        set_field_errors((current) =>
            current[field] ? { ...current, [field]: undefined } : current,
        );
    }

    async function handle_submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (submitting.current) return;
        const form = event.currentTarget;
        const data = new FormData(form);
        const username = String(data.get("username") ?? "").trim();
        const password = String(data.get("password") ?? "");
        const errors = {
            username: username ? undefined : "Enter your username.",
            password: password ? undefined : "Enter your password.",
        };
        set_error("");
        set_field_errors(errors);
        if (errors.username || errors.password) {
            const field = form.elements.namedItem(
                errors.username ? "username" : "password",
            );
            if (field instanceof HTMLInputElement) field.focus();
            return;
        }

        submitting.current = true;
        set_pending(true);
        try {
            await login(username, password);
        } catch (cause) {
            set_error(sign_in_error(cause));
        } finally {
            submitting.current = false;
            set_pending(false);
        }
    }

    return (
        <AuthBackdrop>
            <div className="mx-auto grid w-full max-w-[1600px] items-center gap-8 px-5 pt-7 pb-8 sm:px-9 sm:pb-12 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:px-14 lg:py-12">
                <section
                    aria-label="About CISTRS"
                    className="hidden self-end pb-[clamp(1rem,9vh,7rem)] lg:block"
                >
                    <p className="max-w-sm text-4xl leading-[1.12] font-bold tracking-tight xl:text-5xl">
                        Every record.
                        <br />
                        In one place.
                    </p>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-slate-200">
                        Inventory, maintenance, and operational records for
                        Shuttle Air Services.
                    </p>
                </section>
                <div className="mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end">
                    <AuthPanel labelled_by="page_title">
                        {loading ? (
                            <div
                                role="status"
                                className="space-y-3 py-8 text-center"
                            >
                                <LoaderCircle
                                    aria-hidden="true"
                                    className="mx-auto motion-safe:animate-spin"
                                    size={24}
                                />
                                <h1
                                    id="page_title"
                                    className="text-xl font-bold"
                                >
                                    Opening your workspace…
                                </h1>
                            </div>
                        ) : workspace_error ? (
                            <div className="space-y-4">
                                <h1
                                    id="page_title"
                                    className="text-2xl font-bold"
                                >
                                    Workspace unavailable
                                </h1>
                                <p
                                    role="alert"
                                    className="text-sm text-slate-700"
                                >
                                    {workspace_error}
                                </p>
                                <button
                                    type="button"
                                    onClick={retry}
                                    className="min-h-11 rounded-lg bg-[#0b2238] px-4 text-sm font-semibold text-white hover:bg-[#193951] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8]"
                                >
                                    Retry connection
                                </button>
                            </div>
                        ) : (
                            <>
                                <h1
                                    id="page_title"
                                    className="text-2xl font-bold tracking-tight sm:text-3xl"
                                >
                                    Welcome back
                                </h1>
                                <p className="mt-2 text-sm text-slate-600">
                                    Sign in to your CISTRS workspace.
                                </p>

                                <p role="status" className="sr-only">
                                    {pending
                                        ? "Signing you in. Your workspace will open automatically."
                                        : ""}
                                </p>

                                <form
                                    onSubmit={handle_submit}
                                    noValidate
                                    aria-busy={pending}
                                    className="mt-6"
                                >
                                    {error && (
                                        <p
                                            role="alert"
                                            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
                                        >
                                            {error}
                                        </p>
                                    )}
                                    <fieldset
                                        disabled={pending}
                                        className="min-w-0 space-y-4"
                                    >
                                        <div>
                                            <label
                                                htmlFor="username"
                                                className={label_style}
                                            >
                                                Username
                                            </label>
                                            <input
                                                id="username"
                                                name="username"
                                                type="text"
                                                autoComplete="username"
                                                placeholder="Enter your username"
                                                autoCapitalize="none"
                                                spellCheck={false}
                                                required
                                                maxLength={200}
                                                onChange={() =>
                                                    clear_error("username")
                                                }
                                                className={input_style}
                                                aria-invalid={
                                                    field_errors.username
                                                        ? true
                                                        : undefined
                                                }
                                                aria-describedby={
                                                    field_errors.username
                                                        ? "username_error"
                                                        : undefined
                                                }
                                            />
                                            {field_errors.username && (
                                                <p
                                                    id="username_error"
                                                    className="mt-1.5 text-sm text-red-700"
                                                >
                                                    {field_errors.username}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label
                                                htmlFor="password"
                                                className={label_style}
                                            >
                                                Password
                                            </label>
                                            <div className="relative">
                                                <input
                                                    id="password"
                                                    name="password"
                                                    type={
                                                        show_password
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    autoComplete="current-password"
                                                    placeholder="Enter your password"
                                                    required
                                                    onChange={() =>
                                                        clear_error("password")
                                                    }
                                                    className={`${input_style} cistrs-password pr-12`}
                                                    aria-invalid={
                                                        field_errors.password
                                                            ? true
                                                            : undefined
                                                    }
                                                    aria-describedby={
                                                        field_errors.password
                                                            ? "password_error"
                                                            : undefined
                                                    }
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
                                                            (previous) =>
                                                                !previous,
                                                        )
                                                    }
                                                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-lg text-slate-600 hover:text-[#0b2238] focus-visible:outline-2 focus-visible:outline-[#1d4ed8]"
                                                >
                                                    {show_password ? (
                                                        <EyeOff
                                                            size={19}
                                                            aria-hidden="true"
                                                        />
                                                    ) : (
                                                        <Eye
                                                            size={19}
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                </button>
                                            </div>
                                            {field_errors.password && (
                                                <p
                                                    id="password_error"
                                                    className="mt-1.5 text-sm text-red-700"
                                                >
                                                    {field_errors.password}
                                                </p>
                                            )}
                                            <div className="mt-2 text-right">
                                                <Link
                                                    to="/forgot-password"
                                                    className="text-link text-sm font-medium"
                                                >
                                                    Forgot password?
                                                </Link>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0b2238] px-4 py-2 text-sm font-semibold text-white hover:bg-[#193951] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8] disabled:opacity-75"
                                        >
                                            {pending && (
                                                <LoaderCircle
                                                    aria-hidden="true"
                                                    className="motion-safe:animate-spin"
                                                    size={17}
                                                />
                                            )}
                                            {pending ? "Signing in…" : "Log in"}
                                        </button>
                                    </fieldset>
                                </form>

                                <p className="mt-5 border-t border-slate-200 pt-4 text-center text-sm text-slate-600">
                                    Need an account?{" "}
                                    <Link
                                        to="/signup"
                                        className="text-link font-medium"
                                    >
                                        Contact your Administrator
                                    </Link>
                                </p>
                            </>
                        )}
                    </AuthPanel>
                </div>
            </div>
        </AuthBackdrop>
    );
}
