export const CRM_SELECTION_EVENT = "earlymark:crm-selection-changed";

export interface CrmSelectionItem {
  id: string;
  title?: string;
}

export function publishCrmSelection(selection: CrmSelectionItem[]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CRM_SELECTION_EVENT, {
      detail: selection,
    })
  );
}
