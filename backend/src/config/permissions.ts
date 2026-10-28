// The single list of feature names used for access control.
// They must match `system_feature.feature_name` in the database exactly.
// Always import from here. Never type a feature name as a loose string in a route.
export const FEATURE = {
  Dashboard: "Dashboard",
  Inventory: "Inventory",
  Aircraft: "Aircraft",
  Maintenance: "Maintenance",
  Logbook: "Logbook",
  Personnel: "Personnel",
  Availability: "Availability",
  Notifications: "Notifications",
  UserAccounts: "User Accounts",
} as const;

export type FeatureName = (typeof FEATURE)[keyof typeof FEATURE];
