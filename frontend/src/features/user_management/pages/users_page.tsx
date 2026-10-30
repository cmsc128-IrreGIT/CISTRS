import LiveDirectory from "../../directory/live_directory";
import { useLocation } from "react-router";
export default function Page() {
    const { pathname } = useLocation();
    return (
        <LiveDirectory
            key={pathname}
            kind="users"
            detail={false}
            form={false}
        />
    );
}
