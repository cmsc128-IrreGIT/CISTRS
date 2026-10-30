import { Link } from "react-router";
import Card from "../components/ui/card";
import PageHeader from "../components/ui/page_header";
const guides = [
    {
        title: "Inventory",
        to: "/inventory",
        text: "Search parts by name or number. Check quantities and stock locations. Open an item to review its records, or choose Add Item to add one.",
    },
    {
        title: "Aircraft",
        to: "/aircraft",
        text: "Open an aircraft to review registration, model, and status. Choose Update status to change the recorded condition and add notes.",
    },
    {
        title: "Maintenance",
        to: "/maintenance",
        text: "Search tasks or filter their status. Add or edit a record with the aircraft, due date, task status, and notes. Recorded work is separate from approval.",
    },
    {
        title: "Logbook",
        to: "/logbook",
        text: "Filter entries by aircraft or date. Open an entry to review its sections. Use the add or edit form to record technical details.",
    },
    {
        title: "Personnel",
        to: "/personnel",
        text: "Find personnel records and review the available details. Use Availability to record availability for a date; qualifications must be checked separately.",
    },
    {
        title: "Notifications",
        to: "/notifications",
        text: "Switch between All and Unread, then narrow the list by feature. Review an alert and mark it as read when appropriate.",
    },
];
export default function HelpPage() {
    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <PageHeader
                title="Help & guides"
                title_id="page_title"
                description="Short guides for common tasks."
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {guides.map((guide) => (
                    <Card key={guide.to} compact>
                        <h2 className="font-semibold text-[#0b2238]">
                            {guide.title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            {guide.text}
                        </p>
                        <Link
                            to={guide.to}
                            className="mt-3 inline-flex min-h-11 items-center rounded text-sm font-medium text-[#1d4ed8] underline focus-visible:outline-2"
                        >
                            Open {guide.title.toLowerCase()}
                        </Link>
                    </Card>
                ))}
            </div>
        </section>
    );
}
