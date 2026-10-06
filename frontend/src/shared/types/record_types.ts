export type PreviewRecord = { id: string; [field: string]: string };
export type RecordField = {
    key: string;
    label: string;
    required?: boolean;
    type?: "text" | "email" | "date" | "textarea" | "select";
    options?: (string | { value: string; label: string })[];
};
export type RecordConfig = {
    title: string;
    singular: string;
    base_path: string;
    fields: RecordField[];
    note?: string;
    details?: boolean;
};
