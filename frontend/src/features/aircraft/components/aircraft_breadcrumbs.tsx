import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";

export default function AircraftBreadcrumbs({
    registration,
}: {
    registration?: string;
}) {
    return (
        <WorkspaceBreadcrumbs
            current={registration || "Aircraft"}
            parents={
                registration
                    ? [{ label: "Aircraft", to: "/aircraft" }]
                    : undefined
            }
        />
    );
}
