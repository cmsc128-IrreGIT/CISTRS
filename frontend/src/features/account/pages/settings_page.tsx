import { LockKeyhole } from "lucide-react";
import Card from "../../../shared/components/ui/card";

export default function SettingsPage() {
    return (
        <section
            aria-labelledby="page_title"
            className="mx-auto max-w-3xl space-y-6"
        >
            <div>
                <h1
                    id="page_title"
                    className="text-2xl font-bold text-slate-900"
                >
                    Account Settings
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                    Security settings for your CISTRS account.
                </p>
            </div>

            <Card title="Password and Security">
                <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-slate-100 p-3 text-slate-600">
                        <LockKeyhole size={24} aria-hidden="true" />
                    </div>

                    <div>
                        <h3 className="font-semibold text-slate-900">
                            Change Password
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Password changes will be available once
                            authentication and the account API are connected.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    disabled
                    aria-describedby="password_preview_note"
                    className="mt-5 min-h-11 rounded-lg bg-red-600 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Change Password
                </button>

                <p
                    id="password_preview_note"
                    className="mt-2 text-xs text-slate-500"
                >
                    Unavailable in this preview.
                </p>
            </Card>
        </section>
    );
}
