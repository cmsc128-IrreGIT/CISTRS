import { useState } from "react";
import { DEFAULT_TABLE_PAGE_SIZE } from "../constants/pagination_constants";

export default function useTablePagination<T>(
    rows: T[],
    filter_key: string,
    default_page_size = DEFAULT_TABLE_PAGE_SIZE,
    initial_row_index = -1,
) {
    const [initial_filter_key] = useState(filter_key);
    const [position, set_position] = useState<{ key: string; page: number }>();
    const [page_size, set_page_size] = useState(default_page_size);
    const total_pages = Math.max(1, Math.ceil(rows.length / page_size));
    const initial_page = !position && filter_key === initial_filter_key && initial_row_index >= 0
        ? Math.floor(initial_row_index / page_size) + 1
        : 1;
    const page = position?.key === filter_key ? Math.min(position.page, total_pages) : initial_page;
    const start = (page - 1) * page_size;

    function on_page_change(next_page: number) {
        set_position({ key: filter_key, page: next_page });
    }

    function on_page_size_change(next_size: number) {
        set_page_size(next_size);
        on_page_change(1);
    }

    return {
        visible_rows: rows.slice(start, start + page_size),
        footer: {
            page,
            page_size,
            default_page_size,
            total_items: rows.length,
            on_page_change,
            on_page_size_change,
        },
    };
}
