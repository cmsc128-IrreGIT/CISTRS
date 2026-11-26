import { Link } from "react-router";
import EmptyState from "../../../shared/components/feedback/empty_state";
import Card from "../../../shared/components/ui/card";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";

export default function LogbookReportPage() {
    return <section aria-labelledby="page_title" className="space-y-4">
        <WorkspaceBreadcrumbs parents={[{ label: "Logbook", to: "/logbook" }]} current="Export" />
        <Card>
            <h1 id="page_title" className="mb-3 text-lg font-semibold text-[#0b2238]">Logbook export</h1>
            <EmptyState title="Exports are downloaded as CSV" description="Use Export records from the logbook list to choose an aircraft and date range. The backend prepares the file directly." action={<Link to="/logbook" className="text-link">Return to logbook</Link>} />
        </Card>
    </section>;
}