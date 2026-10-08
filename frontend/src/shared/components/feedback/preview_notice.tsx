import type { ReactNode } from "react";

type PreviewNoticeProps = {
    children?: ReactNode;
};

export default function PreviewNotice({
    children = "Preview records only. Records and history reset on refresh.",
}: PreviewNoticeProps) {
    return (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {children}
        </p>
    );
}
