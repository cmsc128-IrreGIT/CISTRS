import type { ReactNode } from "react";

export default function DashboardTable({
    caption,
    headers,
    rows,
    empty,
}: {
    caption: string;
    headers: ReactNode[];
    rows: { id: string; cells: ReactNode[] }[];
    empty: string;
}) {
    if (!rows.length)
        return <p className="py-2 text-sm text-slate-600">{empty}</p>;

    return (
        <div className="overflow-x-auto rounded-md border border-[#dbe3ed]">
            <table className="w-full text-left text-sm">
                <caption className="sr-only">{caption}</caption>
                <thead className="bg-[#0b2238] text-white">
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
