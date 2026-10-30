import { Link } from "react-router";
import login_plane from "../../assets/login_plane.png";
import { button_styles } from "../styles/button_styles";
export default function AccessErrorPage({
    forbidden = false,
}: {
    forbidden?: boolean;
}) {
    return (
        <main className="relative isolate flex min-h-dvh items-center justify-center bg-[#0b2238] p-6 text-white">
            <img
                src={login_plane}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 -z-20 h-full w-full object-cover"
            />
            <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-[#0b2238]/80"
            />
            <section
                aria-labelledby="page_title"
                className="w-full max-w-lg text-center"
            >
                <Link
                    to="/login"
                    className="inline-flex min-h-11 items-center text-xl font-bold tracking-wide focus-visible:outline-2 focus-visible:outline-white"
                >
                    CISTRS
                </Link>
                <p className="mt-6 text-7xl font-bold sm:text-8xl">
                    {forbidden ? "403" : "404"}
                </p>
                <h1 id="page_title" className="mt-4 text-2xl font-bold">
                    {forbidden ? "Access restricted" : "Page not found"}
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-200">
                    {forbidden
                        ? "Your account does not have access to this page. Contact your administrator if you need access for your duties."
                        : "This address does not match a page. Check the address or return to your dashboard."}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <Link to="/dashboard" className={button_styles("primary")}>
                        Open dashboard
                    </Link>
                    <Link to="/login" className={button_styles("secondary")}>
                        Return to sign in
                    </Link>
                </div>
            </section>
        </main>
    );
}
