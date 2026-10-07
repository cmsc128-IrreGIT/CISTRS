import { CircleAlert } from "lucide-react";
import Button from "../ui/button";
import EmptyState from "./empty_state";

type ErrorStateProps = {
    title?: string;
    description?: string;
    on_retry?: () => void;
    is_retrying?: boolean;
};

export default function ErrorState({
    title = "Could not load records",
    description = "Please try again.",
    on_retry,
    is_retrying = false,
}: ErrorStateProps) {
    return (
        <EmptyState
            icon={CircleAlert}
            title={title}
            description={description}
            action={
                on_retry ? (
                    <Button onClick={on_retry} is_loading={is_retrying}>
                        {is_retrying ? "Retrying…" : "Try Again"}
                    </Button>
                ) : undefined
            }
        />
    );
}
