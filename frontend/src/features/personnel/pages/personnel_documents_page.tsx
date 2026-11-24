import WorkspaceTabs from "../../../shared/components/navigation/workspace_tabs";
import { Plus, RefreshCw } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import {
    Link,
    Navigate,
    useNavigate,
    useParams,
    useSearchParams,
} from "react-router";
import { toast } from "sonner";
import EmptyState from "../../../shared/components/feedback/empty_state";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import DataTable from "../../../shared/components/ui/data_table";
import StatusBadge from "../../../shared/components/ui/status_badge";
import { workspace_tab_style } from "../../../shared/styles/tab_styles";
import { useAuth } from "../../auth/hooks/auth_context";
import PersonnelDocumentDialog from "../components/personnel_document_dialog";
import { document_tabs } from "../config/personnel_document_config";
import { usePersonnelDirectory } from "../hooks/use_personnel_directory";
import type {
    PersonnelDocumentDraft,
    PersonnelDocument,
} from "../types/personnel_types";
import {
    document_validity,
    license_document,
} from "../utils/personnel_documents";
import { personnel_date } from "../utils/personnel_records";
import { documents_service } from "../services/personnel_service";

interface DocumentRow extends PersonnelDocument {
    personnel_id: string;
    id: string; // document_UUID
    renewal_status?: string;
}

export default function PersonnelDocumentsPage() {
    const { user: _user } = useAuth();
    const directory = usePersonnelDirectory();
    const { personnel_id } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [is_open, set_is_open] = useState(false);
    const [documents, set_documents] = useState<DocumentRow[]>([]);
    const [loading, set_loading] = useState(true);
    const [error, set_error] = useState<string | null>(null);
    const person = directory.rows.find(({ id }) => id === personnel_id);
    const active_tab =
        document_tabs.find(({ id }) => id === params.get("type"))?.id ?? "all";

    // Load documents from backend
    const loadDocuments = useCallback(async () => {
        try {
            set_loading(true);
            set_error(null);
            const response = await documents_service.list({
                emp_UUID: person?.id ?? "",
            });
            set_documents(
                response.items.map((doc) => ({
                    ...doc,
                    id: doc.document_UUID,
                    personnel_id: doc.emp_UUID,
                    issued: doc.date_issued,
                    expires: doc.expiry_date ?? "",
                    renewal_date: doc.renewal_date ?? "",
                    kind: doc.kind,
                    file_path: doc.file_path ?? undefined,
                    reference: doc.reference ?? "",
                    renewal_status: undefined, // Backend personal documents don't have renewal status
                })),
            );
        } catch (err) {
            set_error(
                err instanceof Error ? err.message : "Failed to load documents",
            );
        } finally {
            set_loading(false);
        }
    }, [person]);

    useEffect(() => {
        let cancelled = false;
        async function runLoad() {
            try {
                set_loading(true);
                set_error(null);
                const response = await documents_service.list({
                    emp_UUID: person?.id ?? "",
                });
                if (!cancelled) {
                    set_documents(
                        response.items.map((doc) => ({
                            ...doc,
                            id: doc.document_UUID,
                            personnel_id: doc.emp_UUID,
                            issued: doc.date_issued,
                            expires: doc.expiry_date ?? "",
                            renewal_date: doc.renewal_date ?? "",
                            kind: doc.kind,
                            file_path: doc.file_path ?? undefined,
                            reference: doc.reference ?? "",
                            renewal_status: undefined, // Backend personal documents don't have renewal status
                        })),
                    );
                }
            } catch (err) {
                if (!cancelled) {
                    set_error(
                        err instanceof Error
                            ? err.message
                            : "Failed to load documents",
                    );
                }
            } finally {
                if (!cancelled) {
                    set_loading(false);
                }
            }
        }
        runLoad();
        return () => {
            cancelled = true;
        };
    }, [person?.id]);

    if (!directory.full_access) return <Navigate to="/403" replace />;

    if (!person) {
        return (
            <section className="space-y-4">
                <WorkspaceBreadcrumbs
                    parents={[{ label: "Personnel", to: "/personnel" }]}
                    current="Personnel documents"
                />
                <Card>
                    <EmptyState
                        title="Personnel record not found"
                        action={
                            <Link className="text-link" to="/personnel">
                                Return to personnel
                            </Link>
                        }
                    />
                </Card>
            </section>
        );
    }

    const profile_path = `/personnel/${encodeURIComponent(person.id)}`;
    const documents_path = `${profile_path}/documents`;

    // Combine backend documents with licenses from personnel record
    const license_docs = person.licenses.map(license_document).map((doc) => ({
        ...doc,
        personnel_id: person.id,
        id: `license-${doc.id}`, // Prefix to avoid conflicts
    }));

    const backend_docs = documents.filter(
        (doc) => doc.personnel_id === person.id,
    );
    const rows: DocumentRow[] = [...backend_docs, ...license_docs].filter(
        ({ kind }) => active_tab === "all" || kind === active_tab,
    );

    async function save(draft: PersonnelDocumentDraft) {
        if (!directory.can_manage) return;
        // Use FormData for file upload
        const formData = new FormData();
        formData.append("emp_UUID", draft.personnel_id);
        formData.append("kind", draft.kind);
        formData.append("name", draft.name);
        if (draft.reference) formData.append("reference", draft.reference);
        formData.append("date_issued", draft.issued);
        if (draft.expires) formData.append("expiry_date", draft.expires);
        if (draft.renewal_date)
            formData.append("renewal_date", draft.renewal_date);
        if (draft.file) formData.append("file", draft.file);

        // License-specific fields
        if (draft.license_type_UUID)
            formData.append("license_type_UUID", draft.license_type_UUID);
        if (draft.renewal_status_UUID)
            formData.append("renewal_status_UUID", draft.renewal_status_UUID);
        if (draft.license_number)
            formData.append("license_number", draft.license_number);
        if (draft.issuing_authority)
            formData.append("issuing_authority", draft.issuing_authority);

        // Medical-specific fields
        if (draft.medical_class)
            formData.append("medical_class", draft.medical_class);
        if (draft.clinical_hospital)
            formData.append("clinical_hospital", draft.clinical_hospital);

        // Training-specific fields
        if (draft.training_type_UUID)
            formData.append("training_type_UUID", draft.training_type_UUID);
        if (draft.training_provider_UUID)
            formData.append(
                "training_provider_UUID",
                draft.training_provider_UUID,
            );
        if (draft.certificate_number)
            formData.append("certificate_number", draft.certificate_number);
        if (draft.date_completed)
            formData.append("date_completed", draft.date_completed);

        const token = sessionStorage.getItem("cistrs.session");
        const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/personnel/documents/upload`,
            {
                method: "POST",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: formData,
            },
        );

        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            // Include validation details in error message (backend returns 'details' field)
            const details = body.details
                ? `\n${body.details.map((i: { field: string; message: string }) => `${i.field}: ${i.message}`).join("\n")}`
                : "";
            throw new Error(
                body.message || "Failed to save document" + details,
            );
        }

        await loadDocuments();
        set_is_open(false);
        if (
            draft.personnel_id !== personnel_id ||
            (active_tab !== "all" && active_tab !== draft.kind)
        ) {
            void navigate(
                `/personnel/${encodeURIComponent(draft.personnel_id)}/documents`,
            );
        }
        toast.success("Document saved", { position: "bottom-right" });
    }

    return (
        <section
            aria-labelledby="page_title"
            className="w-full min-w-0 space-y-4"
        >
            <WorkspaceBreadcrumbs
                parents={[
                    { label: "Personnel", to: "/personnel" },
                    { label: person.name, to: profile_path },
                ]}
                current="Documents"
            />
            <h1
                id="page_title"
                className="text-2xl font-semibold text-[#0b2238]"
            >
                Personnel documents
            </h1>
            <Card>
                <WorkspaceTabs label="Document types">
                    {document_tabs.map(({ id, label, icon: Icon }) => (
                        <Link
                            key={id}
                            to={
                                id === "all"
                                    ? documents_path
                                    : `${documents_path}?type=${encodeURIComponent(id)}`
                            }
                            aria-current={
                                id === active_tab ? "page" : undefined
                            }
                            className={workspace_tab_style(id === active_tab)}
                        >
                            <Icon size={16} aria-hidden="true" /> {label}
                        </Link>
                    ))}
                </WorkspaceTabs>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-semibold text-[#0b2238]">
                        Documents / {person.name}
                    </h2>
                    <div className="flex items-center gap-2">
                        {directory.can_manage && (
                            <Button
                                className="bg-[#0b2238]! hover:bg-[#193951]!"
                                onClick={() => set_is_open(true)}
                            >
                                <Plus size={16} aria-hidden="true" /> Add
                                document
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            onClick={loadDocuments}
                            disabled={loading}
                            aria-label="Refresh documents"
                        >
                            <RefreshCw
                                size={16}
                                aria-hidden="true"
                                className={loading ? "animate-spin" : ""}
                            />
                        </Button>
                    </div>
                </div>
                {error && (
                    <p role="alert" className="text-sm text-red-700 mb-3">
                        {error}{" "}
                        <Button
                            variant="ghost"
                            onClick={loadDocuments}
                            className="ml-2"
                        >
                            Retry
                        </Button>
                    </p>
                )}
                {loading ? (
                    <div className="py-8 text-center text-slate-600">
                        Loading documents…
                    </div>
                ) : (
                    <DataTable
                        inventory
                        bounded
                        caption="Personnel documents"
                        columns={[
                            {
                                id: "type",
                                header: "Type",
                                render: (row) => row.kind,
                            },
                            {
                                id: "document",
                                header: "Document",
                                render: (row) => (
                                    <>
                                        {row.name}
                                        {row.reference &&
                                            row.reference !== row.name && (
                                                <span className="block text-xs text-slate-600">
                                                    {row.reference}
                                                </span>
                                            )}
                                    </>
                                ),
                            },
                            {
                                id: "issued",
                                header: "Issued",
                                render: (row) => personnel_date(row.issued),
                            },
                            {
                                id: "expires",
                                header: "Expires",
                                render: (row) => personnel_date(row.expires),
                            },
                            {
                                id: "status",
                                header: "Status",
                                render: (row) => {
                                    const status = document_validity(
                                        row.expires,
                                    );
                                    return (
                                        <StatusBadge tone={status.tone}>
                                            {status.label}
                                        </StatusBadge>
                                    );
                                },
                            },
                            {
                                id: "renewal",
                                header: "Renewal",
                                render: (row) =>
                                    row.renewal_status ||
                                    row.renewal_date ||
                                    "Not recorded",
                            },
                            {
                                id: "file",
                                header: "File",
                                render: (row) =>
                                    row.file_path ? (
                                        <a
                                            href={row.file_path}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="whitespace-nowrap text-link"
                                        >
                                            View file
                                        </a>
                                    ) : (
                                        "No file"
                                    ),
                            },
                        ]}
                        rows={rows}
                        empty_title="No documents recorded"
                        get_row_key={(row) => row.id}
                    />
                )}
            </Card>
            {is_open && directory.can_manage && (
                <PersonnelDocumentDialog
                    person={person}
                    people={directory.rows}
                    kind={active_tab === "all" ? undefined : active_tab}
                    on_close={() => set_is_open(false)}
                    on_save={save}
                />
            )}
        </section>
    );
}
