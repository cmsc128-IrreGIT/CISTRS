import { Link } from "react-router";
import Card from "../../../shared/components/ui/card";
import { button_styles } from "../../../shared/styles/button_styles";

export default function SignupPage() {
    return (
        <main className="flex min-h-dvh items-center justify-center bg-slate-100 p-6">
            <div className="w-full max-w-md">
                <Card>
                    <section aria-labelledby="page_title" className="space-y-5">
                        <h1
                            id="page_title"
                            className="text-2xl font-bold text-[#0b2238]"
                        >
                            Need an account?
                        </h1>
                        <p className="text-sm leading-6 text-slate-600">
                            CISTRS accounts are managed by an administrator.
                            Contact your administrator to request access.
                        </p>
                        <Link
                            to="/login"
                            className={button_styles("secondary")}
                        >
                            Back to login
                        </Link>
                    </section>
                </Card>
            </div>
        </main>
    );
}
