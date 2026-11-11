import type { ReactNode } from "react";
import DashboardDate from "./dashboard_date";
import DashboardPanel from "./dashboard_panel";
import DashboardTable from "./dashboard_table";
import { dashboard_list_limit } from "../config/dashboard_config";

export type Activity = {
  id: string;
  date: string;
  activity: ReactNode;
  reference: string;
};

export default function RecentActivityTable({
  rows,
  history_to,
  sample = false,
}: {
  rows: Activity[];
  history_to?: string;
  sample?: boolean;
}) {
  return (
    <DashboardPanel
      title="Recent activity"
      className="dashboard-activity"
      sample={sample}
      footer={
        history_to ? { label: "View history", to: history_to } : undefined
      }
    >
      <DashboardTable
        caption="Recent activity"
        headers={["Date", "Activity", "Reference"]}
        empty="No recent activity recorded."
        rows={rows
          .slice(0, dashboard_list_limit)
          .map(({ id, date, activity, reference }) => ({
            id,
            cells: [<DashboardDate value={date} />, activity, reference || "—"],
          }))}
      />
    </DashboardPanel>
  );
}
