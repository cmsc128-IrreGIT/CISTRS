import WorkspaceTabs from "../../../shared/components/navigation/workspace_tabs";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import EmptyState from "../../../shared/components/feedback/empty_state";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import DataTable from "../../../shared/components/ui/data_table";
import type { TableColumn } from "../../../shared/components/ui/data_table";
import StatusBadge from "../../../shared/components/ui/status_badge";
import { workspace_tab_style } from "../../../shared/styles/tab_styles";
import { useAuth } from "../../auth/hooks/auth_context";
import PersonnelDocumentDialog from "../components/personnel_document_dialog";
import { document_tabs } from "../config/personnel_document_config";
import { usePersonnelDirectory } from "../hooks/use_personnel_directory";
import type { PersonnelDocument, PersonnelDocumentDraft } from "../types/personnel_types";
import { document_validity, license_document } from "../utils/personnel_documents";
import { personnel_date } from "../utils/personnel_records";

const previews_by_account = new Map<string, (PersonnelDocument & { personnel_id: string })[]>();

const columns: TableColumn<PersonnelDocument>[] = [
    { id: "type", header: "Type", render: (row) => row.kind },
    { id: "document", header: "Document", render: (row) => (
        <>
            {row.name}
            {row.reference && row.reference !== row.name && <span className="block text-xs text-slate-600">{row.reference}</span>}
        </>
    ) },
    { id: "issued", header: "Issued", render: (row) => personnel_date(row.issued) },
    { id: "expires", header: "Expires", render: (row) => personnel_date(row.expires) },
    { id: "status", header: "Status", render: (row) => {
        const status = document_validity(row.expires);
        return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>;
    } },
    { id: "renewal", header: "Renewal", render: (row) => row.renewal || "Not recorded" },
    { id: "file", header: "File", render: (row) => row.file ? <FileLink file={row.file} name={row.name} /> : "No file" },
];

function FileLink({ file, name }: { file: File; name: string }) {
    const attach_file = useCallback((link: HTMLAnchorElement | null) => {
        if (!link) return;
        const url = URL.createObjectURL(file);
        link.href = url;
        return () => URL.revokeObjectURL(url);
    }, [file]);

    return <a ref={attach_file} target="_blank" rel="noopener noreferrer" aria-label={`View file for ${name}`}
        className="whitespace-nowrap text-link">View file</a>;
}

export default function PersonnelDocumentsPage() {
    const { user } = useAuth();
    const account = user?.account_UUID ?? "";
    const directory = usePersonnelDirectory();
    const { personnel_id } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [is_open, set_is_open] = useState(false);
    const [previews, set_previews] = useState(() => previews_by_account.get(account) ?? []);
    const person = directory.rows.find(({ id }) => id === personnel_id);
    const active_tab = document_tabs.find(({ id }) => id === params.get("type"))?.id ?? "all";

    if (!directory.full_access) return <Navigate to="/403" replace />;

    if (!person) {
        return (
            <section className="space-y-4">
                <WorkspaceBreadcrumbs parents={[{ label: "Personnel", to: "/personnel" }]} current="Personnel documents" />
                <Card><EmptyState title="Personnel record not found" action={<Link className="text-link" to="/personnel">Return to personnel</Link>} /></Card>
            </section>
        );
    }

    const profile_path = `/personnel/${encodeURIComponent(person.id)}`;
    const documents_path = `${profile_path}/documents`;
    const rows = [
        ...previews.filter((row) => row.personnel_id === person.id),
        ...person.licenses.map(license_document),
    ].filter(({ kind }) => active_tab === "all" || kind === active_tab);

    function save(draft: PersonnelDocumentDraft) {
        if (!directory.can_manage) return;
        const next = [{ ...draft, id: crypto.randomUUID() }, ...(previews_by_account.get(account) ?? [])];
        previews_by_account.set(account, next);
        set_previews(next);
        set_is_open(false);
        if (draft.personnel_id !== personnel_id || (active_tab !== "all" && active_tab !== draft.kind)) {
            void navigate(`/personnel/${encodeURIComponent(draft.personnel_id)}/documents`);
        }
        toast.success("Document saved", { position: "bottom-right" });
    }

    return (
        <section aria-labelledby="page_title" className="w-full min-w-0 space-y-4">
            <WorkspaceBreadcrumbs parents={[{ label: "Personnel", to: "/personnel" }, { label: person.name, to: profile_path }]}
                current="Documents" />
            <h1 id="page_title" className="text-2xl font-semibold text-[#0b2238]">Personnel documents</h1>
            <Card>
                <WorkspaceTabs label="Document types">
                    {document_tabs.map(({ id, label, icon: Icon }) => (
                        <Link key={id} to={id === "all" ? documents_path : `${documents_path}?type=${encodeURIComponent(id)}`}
                            aria-current={id === active_tab ? "page" : undefined} className={workspace_tab_style(id === active_tab)}>
                            <Icon size={16} aria-hidden="true" /> {label}
                        </Link>
                    ))}
                </WorkspaceTabs>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-semibold text-[#0b2238]">Documents / {person.name}</h2>
                    {directory.can_manage && <Button className="bg-[#0b2238]! hover:bg-[#193951]!" onClick={() => set_is_open(true)}>
                        <Plus size={16} aria-hidden="true" /> Add document
                    </Button>}
                </div>
                <DataTable inventory bounded caption="Personnel documents" columns={columns} rows={rows}
                    empty_title="No documents recorded" get_row_key={(row) => row.id} />
            </Card>
            {is_open && directory.can_manage && <PersonnelDocumentDialog person={person} people={directory.rows}
                kind={active_tab === "all" ? undefined : active_tab} on_close={() => set_is_open(false)} on_save={save} />}
        </section>
    );
}
