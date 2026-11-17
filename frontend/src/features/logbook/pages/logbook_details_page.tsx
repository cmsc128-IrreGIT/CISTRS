import { Link, Outlet, useParams } from "react-router";
import EmptyState from "../../../shared/components/feedback/empty_state";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import Card from "../../../shared/components/ui/card";
import { button_styles } from "../../../shared/styles/button_styles";
import LogbookDetails from "../components/logbook_details";
import useLogbook from "../hooks/use_logbook";
import { entry_reference, logbook_breadcrumb_title } from "../utils/logbook_entries";

export default function LogbookDetailsPage() {
    const { entry_id } = useParams();
    const entry = useLogbook().find((row) => row.id === entry_id);

    return (
        <section aria-labelledby="page_title" className="max-w-5xl space-y-4">
            <WorkspaceBreadcrumbs
                parents={[{ label: logbook_breadcrumb_title, to: "/logbook" }]}
                current={entry ? entry_reference(entry) : "Entry not found"}
            />
            <h1 id="page_title" className="text-2xl font-semibold text-[#0b2238]">Logbook Entry Details</h1>
            {entry ? <LogbookDetails entry={entry} /> : (
                <Card>
                    <EmptyState title="Entry not found" description="Choose an existing entry from the aircraft logbook."
                        action={<Link to="/logbook" className={button_styles("secondary")}>Return to logbook</Link>} />
                </Card>
            )}
            {entry && <Outlet />}
        </section>
    );
}
