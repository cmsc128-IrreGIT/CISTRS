import type { ReactNode } from "react";
import EmptyState from "../feedback/empty_state";

export type TableColumn<T> = {
    id: string;
    header: string;
    render: (row: T) => ReactNode;
    cell_class_name?: string;
};

type DataTableProps<T> = {
    columns: TableColumn<T>[];
    rows: T[];
    get_row_key: (row: T) => string | number;
    caption: string;
    empty_title?: string;
    empty_description?: string;
    empty_action?: ReactNode;
};

export default function DataTable<T>({
    columns,
    rows,
    get_row_key,
    caption,
    empty_title = "No records yet",
    empty_description,
    empty_action,
}: DataTableProps<T>) {
    return (
        <div
            role="region"
            aria-label={caption}
            tabIndex={0}
            className="overflow-x-auto rounded-lg border border-slate-200 focus-visible:outline-2 focus-visible:outline-red-600"
        >
            <table className="w-full text-left text-sm">
                <caption className="sr-only">{caption}</caption>

                <thead className="bg-[#0b2238] text-white">
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.id}
                                scope="col"
                                className="whitespace-nowrap px-4 py-3 font-semibold"
                            >
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length}>
                                <EmptyState
                                    title={empty_title}
                                    description={empty_description}
                                    action={empty_action}
                                />
                            </td>
                        </tr>
                    ) : (
                        rows.map((row) => (
                            <tr
                                key={get_row_key(row)}
                                className="hover:bg-slate-50"
                            >
                                {columns.map((column) => (
                                    <td
                                        key={column.id}
                                        className={`px-4 py-3 text-slate-700 ${column.cell_class_name ?? ""}`}
                                    >
                                        {column.render(row)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
