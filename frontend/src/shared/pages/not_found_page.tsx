import { Link } from "react-router";
import { button_styles } from "../styles/button_styles";

export default function NotFoundPage() {
    return (
        <section
            aria-labelledby="page_title"
            className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 px-4 py-12 text-center"
        >
            <p className="text-sm font-semibold tracking-widest text-slate-500">
                404
            </p>
            <h1 id="page_title" className="text-3xl font-bold text-[#0b2238]">
                Page not found
            </h1>
            <p className="max-w-md text-sm leading-6 text-slate-600">
                This address does not match a page. Check the address or return
                to the dashboard.
            </p>
            <Link to="/dashboard" className={button_styles("secondary")}>
                Return to dashboard
            </Link>
        </section>
    );
}
