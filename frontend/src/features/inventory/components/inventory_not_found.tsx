import { Link } from "react-router";
import EmptyState from "../../../shared/components/feedback/empty_state";
import { button_styles } from "../../../shared/styles/button_styles";

export default function InventoryNotFound() {
    return (
        <EmptyState
            title="Item not found"
            description="The item may not exist or may have been cleared by a preview refresh."
            action={
                <Link to="/inventory" className={button_styles("secondary")}>
                    Return to inventory
                </Link>
            }
        />
    );
}
