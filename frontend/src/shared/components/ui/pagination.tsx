import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "./button";

type PaginationProps = {
    page: number;
    total_pages: number;
    on_page_change: (page: number) => void;
    is_loading?: boolean;
};

export default function Pagination({
    page,
    total_pages,
    on_page_change,
    is_loading = false,
}: PaginationProps) {
    if (total_pages <= 1) return null;

    return (
        <nav
            aria-label="Pagination"
            className="flex flex-wrap items-center justify-between gap-3"
        >
            <p className="text-sm text-slate-600">
                Page {page} of {total_pages}
            </p>

            <div className="flex gap-2">
                <Button
                    variant="secondary"
                    disabled={is_loading || page <= 1}
                    onClick={() => on_page_change(page - 1)}
                    aria-label="Previous page"
                >
                    <ChevronLeft size={18} aria-hidden="true" />
                    Previous
                </Button>

                <Button
                    variant="secondary"
                    disabled={is_loading || page >= total_pages}
                    onClick={() => on_page_change(page + 1)}
                    aria-label="Next page"
                >
                    Next
                    <ChevronRight size={18} aria-hidden="true" />
                </Button>
            </div>
        </nav>
    );
}
