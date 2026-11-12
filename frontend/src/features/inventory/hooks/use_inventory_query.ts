import { useCallback, useEffect, useRef, useState } from "react";

export default function useInventoryQuery<Row>(
  fetch_rows: () => Promise<Row[]>,
  enabled: boolean,
) {
  const [rows, set_rows] = useState<Row[]>([]);
  const [is_loading, set_is_loading] = useState(true);
  const [error, set_error] = useState<string | null>(null);
  const request_id = useRef({ id: 0 });

  const load = useCallback(() => {
    const current_request = ++request_id.current.id;
    return fetch_rows()
      .then(
        (data) => {
          if (current_request === request_id.current.id) {
            set_rows(data);
            set_error(null);
          }
        },
        (cause: unknown) => {
          if (current_request === request_id.current.id)
            set_error(
              cause instanceof Error
                ? cause.message
                : "Failed to load inventory data.",
            );
        },
      )
      .finally(() => {
        if (current_request === request_id.current.id) set_is_loading(false);
      });
  }, [fetch_rows]);

  const reload = useCallback(() => {
    set_is_loading(true);
    set_error(null);
    return load();
  }, [load]);

  useEffect(() => {
    const state = request_id.current;
    if (enabled) void load();
    return () => {
      ++state.id;
    };
  }, [load, enabled]);

  return { rows, is_loading, error, reload, refresh: load };
}
