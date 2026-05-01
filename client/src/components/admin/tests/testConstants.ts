export const tabs = ["Tests", "Results", "Bulk Uploader", "Reported Questions"];
export const detailSubTabs = ["Tests", "Users"] as const;

export type DetailSubTab = (typeof detailSubTabs)[number];
