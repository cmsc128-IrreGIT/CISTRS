import { Link } from "react-router";
export default function PersonnelFormPage() {
    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-bold">Personnel records</h1>
            <p className="text-sm text-slate-600">
                Personnel records are currently read-only. Contact your
                administrator to request changes.
            </p>
            <Link className="text-blue-700 underline" to="/personnel">
                Return to personnel
            </Link>
        </section>
    );
}
