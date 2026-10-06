import { Construction } from "lucide-react";
import EmptyState from "./empty_state";

type ComingSoonProps = {
    feature_name: string;
};

export default function ComingSoon({ feature_name }: ComingSoonProps) {
    return (
        <EmptyState
            icon={Construction}
            title={`${feature_name} is under development`}
            description="This page is part of the initial application skeleton. Its content and actions are not available yet."
        />
    );
}
