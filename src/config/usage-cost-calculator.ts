export type UsageCostTabId = "cpu" | "ram" | "storage";

export type UsageCostRow = {
  resource: string;
  isDefault?: boolean;
  plan: string;
  cost: string;
};

export type UsageCostTab = {
  id: UsageCostTabId;
  label: string;
  resourceColumn: string;
  rows: UsageCostRow[];
};

export const USAGE_COST_TABS: UsageCostTab[] = [
  {
    id: "cpu",
    label: "CPU",
    resourceColumn: "vCPUs",
    rows: [
      { resource: "1", plan: "Hobby / Pro", cost: "$0.000014/s" },
      {
        resource: "2",
        isDefault: true,
        plan: "Hobby / Pro",
        cost: "$0.000028/s",
      },
      { resource: "4", plan: "Hobby / Pro", cost: "$0.000056/s" },
      { resource: "6", plan: "Hobby / Pro", cost: "$0.000084/s" },
      { resource: "8", plan: "Hobby / Pro", cost: "$0.000112/s" },
    ],
  },
  {
    id: "ram",
    label: "RAM",
    resourceColumn: "RAM",
    rows: [
      { resource: "2 GB", plan: "Hobby / Pro", cost: "$0.000023/s" },
      {
        resource: "4 GB",
        isDefault: true,
        plan: "Hobby / Pro",
        cost: "$0.000046/s",
      },
      { resource: "8 GB", plan: "Hobby / Pro", cost: "$0.000092/s" },
      { resource: "16 GB", plan: "Hobby / Pro", cost: "$0.000184/s" },
      { resource: "32 GB", plan: "Hobby / Pro", cost: "$0.000368/s" },
    ],
  },
  {
    id: "storage",
    label: "Storage",
    resourceColumn: "Volume",
    rows: [
      {
        resource: "Volumes",
        plan: "Hobby / Pro",
        cost: "$0.000000046/s per GB",
      },
      {
        resource: "Standby snapshots",
        isDefault: true,
        plan: "Hobby / Pro",
        cost: "$0.000000077/s per GB",
      },
      {
        resource: "Images",
        plan: "Hobby / Pro",
        cost: "$0.000000017/s per GB",
      },
    ],
  },
];
