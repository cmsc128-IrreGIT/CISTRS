import { ChevronLeft, ChevronRight } from "lucide-react";
import {
    TABLE_PAGE_BUTTON_STYLE,
    TABLE_PAGE_SIZES,
} from "../../constants/pagination_constants";
import Button from "./button";

type PaginationProps = {
    page: number;
    page_size: number;
    default_page_size: number;
    total_items: number;
    on_page_change: (page: number) => void;
    on_page_size_change: (page_size: number) => void;
    item_label?: string;
    plural_label?: string;
};

export default function Pagination({
    page,
    page_size,
    default_page_size,
    total_items,
    on_page_change,
    on_page_size_change,
    item_label = "record",
    plural_label = `${item_label}s`,
}: PaginationProps) {
    if (!total_items) return null;

    const total_pages = Math.ceil(total_items / page_size);
    const show_page_size =
        total_items > TABLE_PAGE_SIZES[0] || page_size !== default_page_size;
    const item_range =
        total_items <= Math.min(page_size, default_page_size)
            ? `${total_items} ${total_items === 1 ? item_label : plural_label}`
            : `Showing ${(page - 1) * page_size + 1}–${Math.min(page * page_size, total_items)} of ${total_items} ${plural_label}`;

    return (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 pt-3">
            {show_page_size && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                    Rows per page
                    <select
                        value={page_size}
                        onChange={(event) =>
                            on_page_size_change(
                                Number(event.currentTarget.value),
                            )
                        }
                        className="min-h-10 rounded-md border border-slate-200 bg-white px-2"
                    >
                        {TABLE_PAGE_SIZES.map((size) => (
                            <option key={size}>{size}</option>
                        ))}
                    </select>
                </label>
            )}
            <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
                <p
                    role="status"
                    className="text-sm tabular-nums text-slate-600"
                >
                    {item_range}
                </p>
                {total_pages > 1 && (
                    <nav aria-label="Pagination" className="flex gap-2">
                        <p className="sr-only">
                            Page {page} of {total_pages}
                        </p>
                        <Button
                            variant="secondary"
                            disabled={page <= 1}
                            onClick={() => on_page_change(page - 1)}
                            aria-label="Previous page"
                            className={TABLE_PAGE_BUTTON_STYLE}
                        >
                            <ChevronLeft size={18} aria-hidden="true" />
                        </Button>
                        <Button
                            variant="secondary"
                            disabled={page >= total_pages}
                            onClick={() => on_page_change(page + 1)}
                            aria-label="Next page"
                            className={TABLE_PAGE_BUTTON_STYLE}
                        >
                            <ChevronRight size={18} aria-hidden="true" />
                        </Button>
                    </nav>
                )}
            </div>
        </div>
    );
}
