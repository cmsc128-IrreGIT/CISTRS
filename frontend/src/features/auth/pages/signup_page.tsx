import { Link } from "react-router";
import AuthBackdrop from "../../../shared/components/layouts/auth_backdrop";
import { button_styles } from "../../../shared/styles/button_styles";
import AuthPanel from "../components/auth_panel";

export default function SignupPage() {
    return (
        <AuthBackdrop brand_to="/login">
            <div className="grid place-items-center px-5 py-8 sm:py-12">
                <AuthPanel labelled_by="page_title">
                    <h1 id="page_title" className="text-2xl font-bold tracking-tight">Need an account?</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">Contact your administrator to request a CISTRS account.</p>
                    <Link to="/login" className={button_styles("secondary", "mt-5")}>Back to login</Link>
                </AuthPanel>
            </div>
        </AuthBackdrop>
    );
}
