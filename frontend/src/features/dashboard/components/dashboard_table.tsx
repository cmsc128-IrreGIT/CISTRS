import type { ReactNode } from "react";

export default function DashboardTable({
    caption,
    headers,
    rows,
    empty,
    scroll = false,
}: {
    caption: string;
    headers: ReactNode[];
    rows: { id: string; cells: ReactNode[] }[];
    empty: string;
    scroll?: boolean;
}) {
    if (!rows.length)
        return <p className="py-2 text-sm text-slate-600">{empty}</p>;

    return (
        <div
            role={scroll ? "region" : undefined}
            aria-label={scroll ? `${caption} list` : undefined}
            tabIndex={scroll ? 0 : undefined}
            className={`thin-scrollbar rounded-md border border-[#dbe3ed] ${scroll ? "dashboard-scroll" : "overflow-x-auto"}`}
        >
            <table className="w-full text-left text-sm">
                <caption className="sr-only">{caption}</caption>
                <thead className={`bg-[#0b2238] text-white ${scroll ? "sticky top-0 z-10" : ""}`}>
                    <tr>
                        {headers.map((header, index) => (
                            <th
                                scope="col"
                                key={index}
                                className="px-2.5 py-2 font-medium"
                            >
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#dbe3ed] bg-[#f4f7fa] font-medium">
                    {rows.map(({ id, cells }) => (
                        <tr key={id}>
                            {cells.map((cell, index) => (
                                <td
                                    key={index}
                                    className="px-2.5 py-2 align-middle wrap-anywhere"
                                >
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
