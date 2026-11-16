import type { ReactNode } from "react";
import DashboardDate from "./dashboard_date";
import DashboardPanel from "./dashboard_panel";
import DashboardTable from "./dashboard_table";

export type Activity = {
  id: string;
  date: string;
  activity: ReactNode;
  reference: string;
  processed_by?: string;
};

export default function RecentActivityTable({
  rows,
  history_to,
}: {
  rows: Activity[];
  history_to?: string;
}) {
  return (
    <DashboardPanel
      title="Recent activity"
      className="dashboard-activity"
      footer={
        history_to ? { label: "View history", to: history_to } : undefined
      }
    >
      <DashboardTable
        caption="Recent activity"
        scroll
        headers={["Date", "Activity", "Reference", "Processed by"]}
        empty="No recent activity recorded."
        rows={rows.map(({ id, date, activity, reference, processed_by }) => ({
          id,
          cells: [
            <DashboardDate value={date} />,
            activity,
            reference || "—",
            processed_by?.trim() || "—",
          ],
        }))}
      />
    </DashboardPanel>
  );
}
