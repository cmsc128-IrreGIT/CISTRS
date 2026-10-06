import { LoaderCircle } from "lucide-react";

type LoadingStateProps = {
    message?: string;
};

export default function LoadingState({
    message = "Loading records…",
}: LoadingStateProps) {
    return (
        <div role="status" className="flex items-center justify-center gap-3 px-4 py-12 text-sm text-slate-600">
            <LoaderCircle
                size={22}
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
            />
            <span>{message}</span>
        </div>
    );
}