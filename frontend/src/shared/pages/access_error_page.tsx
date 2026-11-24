import { Link } from "react-router";
import AuthBackdrop from "../components/layouts/auth_backdrop";
import { button_styles } from "../styles/button_styles";

export default function AccessErrorPage({
    forbidden = false,
}: {
    forbidden?: boolean;
}) {
    return (
        <AuthBackdrop brand_to="/login">
            <div className="grid place-items-center px-5 py-8 sm:py-12">
                <section
                    aria-labelledby="page_title"
                    className="w-full max-w-xl rounded-2xl border border-white/60 bg-white px-6 py-9 text-center text-[#0b2238] shadow-2xl shadow-[#071724]/40 sm:px-10 sm:py-11"
                >
                    <p className="text-6xl leading-none font-bold tabular-nums sm:text-7xl">
                        {forbidden ? "403" : "404"}
                    </p>
                    <h1 id="page_title" className="mt-4 text-2xl font-bold">
                        {forbidden ? "Access restricted" : "Page not found"}
                    </h1>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
                        {forbidden
                            ? "Your account does not have access to this page. Contact your administrator if you need access for your duties."
                            : "This address does not match a page. Check the address or return to your dashboard."}
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        <Link
                            to="/dashboard"
                            className={button_styles(
                                "primary",
                                "bg-[#0b2238]! hover:bg-[#193951]!",
                            )}
                        >
                            Open dashboard
                        </Link>
                        <Link
                            to="/login"
                            className={button_styles("secondary")}
                        >
                            Return to sign in
                        </Link>
                    </div>
                </section>
            </div>
        </AuthBackdrop>
    );
}
