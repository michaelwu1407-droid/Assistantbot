import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DealsLoading from "@/app/crm/deals/loading";
import ContactsLoading from "@/app/crm/contacts/loading";
import JobsLoading from "@/app/crm/jobs/loading";

describe("CRM loading pages (logic-20)", () => {
  it("deals loading page shows reassurance copy", () => {
    render(<DealsLoading />);
    expect(screen.getByText(/loading your pipeline/i)).toBeTruthy();
  });

  it("contacts loading page shows reassurance copy", () => {
    render(<ContactsLoading />);
    expect(screen.getByText(/loading your contacts/i)).toBeTruthy();
  });

  it("jobs loading page shows reassurance copy", () => {
    render(<JobsLoading />);
    expect(screen.getByText(/loading your jobs/i)).toBeTruthy();
  });
});
