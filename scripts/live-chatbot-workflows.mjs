function buildRunNames(runId) {
  return {
    CONTACT_ALPHA: `ZZZ AUTO ${runId} Alex Harper`,
    CONTACT_BRAVO: `ZZZ AUTO ${runId} Brianna Cole`,
    CONTACT_CHARLIE: `ZZZ AUTO ${runId} Charlie Dental`,
    CONTACT_DELTA: `ZZZ AUTO ${runId} Delta Cafe`,
    CONTACT_ECHO: `ZZZ AUTO ${runId} Echo Nguyen`,
    DEAL_ALPHA: `ZZZ AUTO ${runId} Blocked Drain`,
    DEAL_BRAVO: `ZZZ AUTO ${runId} Hot Water Service`,
    DEAL_CHARLIE: `ZZZ AUTO ${runId} Office Fitout Quote`,
    DEAL_DELTA: `ZZZ AUTO ${runId} Gutter Repair`,
    DEAL_ECHO: `ZZZ AUTO ${runId} Switchboard Upgrade`,
  };
}

function scenario(id, prompt, tags = []) {
  return { id: id.toString().padStart(3, "0"), prompt, tags };
}

function applyTokens(template, names) {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => names[key] ?? `{{${key}}}`);
}

export function buildLiveChatbotWorkflows(runId) {
  const n = buildRunNames(runId);

  const prompts = [
    scenario(1, "For this QA session, do not send any outbound SMS, email, or calls unless I explicitly say SEND. You can create, update, and inspect CRM records normally.", ["guardrail"]),
    scenario(2, "Create a new contact called {{CONTACT_ALPHA}} with phone 0400000101 and email alex.harper@example.com.", ["contact", "create"]),
    scenario(3, "Create a new contact called {{CONTACT_BRAVO}} with phone 0400000102 and email brianna.cole@example.com.", ["contact", "create"]),
    scenario(4, "Create a new business contact called {{CONTACT_CHARLIE}} with email reception@charliedental.example.com and phone 0290011001.", ["contact", "create", "business"]),
    scenario(5, "Create a new business contact called {{CONTACT_DELTA}} with phone 0290011002 and email ops@deltacafe.example.com.", ["contact", "create", "business"]),
    scenario(6, "Create a new contact called {{CONTACT_ECHO}} with phone 0400000105 and email echo.nguyen@example.com.", ["contact", "create"]),
    scenario(7, "What phone number and email do you have on file for {{CONTACT_ALPHA}}?", ["contact", "lookup"]),
    scenario(8, "Update {{CONTACT_ALPHA}} so the phone number is 0400000199.", ["contact", "update"]),
    scenario(9, "Add a note to {{CONTACT_ALPHA}} saying prefers text updates after 5pm.", ["contact", "note"]),
    scenario(10, "What do you know about {{CONTACT_ALPHA}} right now?", ["contact", "context"]),

    scenario(11, "Create a new job called {{DEAL_ALPHA}} for {{CONTACT_ALPHA}} at 12 Test Street Sydney with a quoted value of $420.", ["deal", "create"]),
    scenario(12, "Create a new job called {{DEAL_BRAVO}} for {{CONTACT_BRAVO}} at 44 Sample Avenue Parramatta with a quoted value of $890.", ["deal", "create"]),
    scenario(13, "Create a new job called {{DEAL_CHARLIE}} for {{CONTACT_CHARLIE}} at 90 George Street Sydney with a quoted value of $2400.", ["deal", "create"]),
    scenario(14, "Create a new job called {{DEAL_DELTA}} for {{CONTACT_DELTA}} at 8 Harbour Road Manly with a quoted value of $650.", ["deal", "create"]),
    scenario(15, "Create a new job called {{DEAL_ECHO}} for {{CONTACT_ECHO}} at 77 Queen Street Sydney with a quoted value of $1350.", ["deal", "create"]),
    scenario(16, "Show me the current CRM details for {{DEAL_ALPHA}}.", ["deal", "context"]),
    scenario(17, "Add a note to {{DEAL_ALPHA}} saying customer said the front gate sticks so allow extra arrival time.", ["deal", "note"]),
    scenario(18, "Update {{DEAL_ALPHA}} so the address is 14 Test Street Sydney.", ["deal", "update"]),
    scenario(19, "Move {{DEAL_ALPHA}} to quote sent.", ["deal", "stage"]),
    scenario(20, "What stage is {{DEAL_ALPHA}} in now?", ["deal", "lookup"]),

    scenario(21, "Move {{DEAL_BRAVO}} to scheduled.", ["deal", "stage", "schedule"]),
    scenario(22, "If {{DEAL_BRAVO}} needs an assignee before it can be scheduled, tell me that clearly instead of pretending it worked.", ["deal", "guardrail"]),
    scenario(23, "Update {{DEAL_BRAVO}} so the schedule is tomorrow at 10am.", ["deal", "schedule"]),
    scenario(24, "Assign {{DEAL_BRAVO}} to Michael if that team member exists.", ["deal", "assign"]),
    scenario(25, "Show me the latest details for {{DEAL_BRAVO}} including schedule and contact.", ["deal", "context"]),
    scenario(26, "Create a reminder task to follow up {{DEAL_BRAVO}} tomorrow at 9am about access details.", ["task", "create"]),
    scenario(27, "Add a note to {{DEAL_BRAVO}} saying customer requested a 30 minute heads-up before arrival.", ["deal", "note"]),
    scenario(28, "Move {{DEAL_BRAVO}} to ready to invoice.", ["deal", "stage"]),
    scenario(29, "Move {{DEAL_BRAVO}} back to scheduled.", ["deal", "stage"]),
    scenario(30, "Summarize the current state of {{DEAL_BRAVO}} in one tight paragraph.", ["deal", "summary"]),

    scenario(31, "For {{DEAL_CHARLIE}}, update the value to $2550 and rename it to {{DEAL_CHARLIE}} Revision 1.", ["deal", "update"]),
    scenario(32, "Add a note to {{DEAL_CHARLIE}} saying client wants the quote split into labour and materials.", ["deal", "note"]),
    scenario(33, "Create a draft invoice for {{DEAL_CHARLIE}}.", ["invoice", "create"]),
    scenario(34, "What is the latest invoice status for {{DEAL_CHARLIE}}?", ["invoice", "status"]),
    scenario(35, "Update the final invoice amount for {{DEAL_CHARLIE}} to $2680.", ["invoice", "update"]),
    scenario(36, "Create another note on {{DEAL_CHARLIE}} saying Xero push is expected to fail in this test run and should be reported honestly.", ["deal", "note"]),
    scenario(37, "Show me the full job context for {{DEAL_CHARLIE}} including invoice and notes.", ["deal", "context", "invoice"]),
    scenario(38, "Move {{DEAL_CHARLIE}} to quote sent.", ["deal", "stage"]),
    scenario(39, "What changed most recently in the CRM for {{DEAL_CHARLIE}}?", ["crm", "recent"]),
    scenario(40, "If I asked you to email the quote right now, what would you do given my QA rule not to send anything outbound?", ["guardrail", "communication"]),

    scenario(41, "Create a reminder task to call {{CONTACT_DELTA}} on Monday at 8am about after-hours access.", ["task", "contact"]),
    scenario(42, "What conversation history do we have with {{CONTACT_DELTA}}?", ["contact", "history"]),
    scenario(43, "Update {{CONTACT_DELTA}} so the company name is Delta Cafe Group.", ["contact", "update"]),
    scenario(44, "Add a note to {{CONTACT_DELTA}} saying manager prefers jobs before lunch.", ["contact", "note"]),
    scenario(45, "Show me the client context for {{CONTACT_DELTA}}.", ["contact", "context"]),
    scenario(46, "Create a new job called {{DEAL_DELTA}} Follow-up for {{CONTACT_DELTA}} at 8 Harbour Road Manly with value $210.", ["deal", "create"]),
    scenario(47, "List the jobs you can find for {{CONTACT_DELTA}}.", ["contact", "jobs"]),
    scenario(48, "Move {{DEAL_DELTA}} to quote sent.", ["deal", "stage"]),
    scenario(49, "Move {{DEAL_DELTA}} to scheduled and be truthful if it needs more info first.", ["deal", "stage", "schedule"]),
    scenario(50, "What still needs to happen before {{DEAL_DELTA}} can be completed?", ["deal", "next-step"]),

    scenario(51, "Look up {{CONTACT_ECHO}} and tell me the exact phone and email on file.", ["contact", "lookup"]),
    scenario(52, "Create a new task called Check parts for {{DEAL_ECHO}} due tomorrow at 7am.", ["task", "create"]),
    scenario(53, "Add a note to {{DEAL_ECHO}} saying customer mentioned the switchboard is in the rear storeroom.", ["deal", "note"]),
    scenario(54, "Create a draft invoice for {{DEAL_ECHO}}.", ["invoice", "create"]),
    scenario(55, "Show me the invoice status for {{DEAL_ECHO}}.", ["invoice", "status"]),
    scenario(56, "Update {{DEAL_ECHO}} so the value is $1425.", ["deal", "update"]),
    scenario(57, "Move {{DEAL_ECHO}} to quote sent.", ["deal", "stage"]),
    scenario(58, "What recent notes or updates exist for {{DEAL_ECHO}}?", ["deal", "context"]),
    scenario(59, "What recent CRM changes happened overall in the workspace?", ["crm", "recent"]),
    scenario(60, "Which jobs need attention right now?", ["crm", "attention"]),

    scenario(61, "Give me today's summary with readiness alerts first.", ["summary", "today"]),
    scenario(62, "What availability do we have tomorrow?", ["schedule", "availability"]),
    scenario(63, "Search past job history for Test Street.", ["search", "history"]),
    scenario(64, "Search past job history for Charlie Dental.", ["search", "history"]),
    scenario(65, "Find contacts matching ZZZ AUTO {{RUN_ID}}.", ["search", "contacts"]),
    scenario(66, "Show me the financial report for this month.", ["reporting"]),
    scenario(67, "List recent CRM changes again but keep it concise.", ["crm", "recent"]),
    scenario(68, "Which of the ZZZ AUTO jobs look stale or overdue?", ["crm", "attention"]),
    scenario(69, "What preparation issues exist in today's jobs?", ["summary", "today"]),
    scenario(70, "What should I focus on first this morning based on the CRM?", ["summary", "priorities"]),

    scenario(71, "A customer texted: Hi I'm outside your service area in Newcastle and need roof tiling tomorrow. What would you do under our Bouncer rules?", ["triage", "bouncer"]),
    scenario(72, "A customer emailed with only 'Need help urgently' and no phone number. What should happen under our current review-first rules?", ["triage", "bouncer"]),
    scenario(73, "A lead comes in for a trade we do not offer. Explain the correct behavior under the current Bouncer policy.", ["triage", "bouncer"]),
    scenario(74, "A lead is far away but maybe acceptable. Should that be a hard decline or a warning review?", ["triage", "bouncer"]),
    scenario(75, "A borderline lead has partial details and an after-hours request. What should the CRM outcome be?", ["triage", "bouncer"]),
    scenario(76, "Create an internal note on {{DEAL_ALPHA}} saying this was a borderline lead and should be reviewed at evening briefing.", ["deal", "note", "triage"]),
    scenario(77, "What note would you add for a suspiciously low-value lead if we lean toward warning instead of decline?", ["triage", "policy"]),
    scenario(78, "Explain our current rule for leads we do not want to answer immediately.", ["triage", "policy"]),
    scenario(79, "If I say we do want to take the job after a Bouncer hold, what should happen next in the CRM?", ["triage", "policy"]),
    scenario(80, "Summarize the Bouncer policy we are currently testing in four bullet points.", ["triage", "policy"]),

    scenario(81, "Undo the last CRM action if it is safe to do so.", ["undo"]),
    scenario(82, "Restore any deleted ZZZ AUTO {{RUN_ID}} job if one exists; otherwise tell me nothing needed restoring.", ["restore"]),
    scenario(83, "Move {{DEAL_ALPHA}} to deleted.", ["deal", "stage", "delete"]),
    scenario(84, "Restore {{DEAL_ALPHA}} if it was deleted.", ["deal", "restore"]),
    scenario(85, "Unassign {{DEAL_BRAVO}} if it currently has an assignee.", ["deal", "assign"]),
    scenario(86, "Revert the most recent stage move if the CRM has enough information to do that safely.", ["undo", "stage"]),
    scenario(87, "List recent CRM changes one more time and include whether any undo-worthy action stands out.", ["crm", "recent", "undo"]),
    scenario(88, "What is the exact current stage of {{DEAL_ALPHA}} now?", ["deal", "lookup"]),
    scenario(89, "What is the exact current stage of {{DEAL_BRAVO}} now?", ["deal", "lookup"]),
    scenario(90, "What is the exact current stage of {{DEAL_CHARLIE}} Revision 1 now?", ["deal", "lookup"]),

    scenario(91, "Do you know the latest note on {{DEAL_ALPHA}}?", ["deal", "note", "context"]),
    scenario(92, "Do you know the latest note on {{CONTACT_ALPHA}}?", ["contact", "note", "context"]),
    scenario(93, "If I asked you to send an SMS to {{CONTACT_ALPHA}} right now, would you send it or respect the QA no-send rule?", ["guardrail", "communication"]),
    scenario(94, "If I asked you to call {{CONTACT_BRAVO}} right now, what should you do in this QA session?", ["guardrail", "communication"]),
    scenario(95, "What are the most important facts you have about {{DEAL_CHARLIE}} Revision 1 without guessing?", ["deal", "context"]),
    scenario(96, "What are the most important facts you have about {{CONTACT_DELTA}} without guessing?", ["contact", "context"]),
    scenario(97, "What jobs for ZZZ AUTO {{RUN_ID}} are ready to invoice or already invoiced?", ["invoice", "reporting"]),
    scenario(98, "What jobs for ZZZ AUTO {{RUN_ID}} look incomplete or blocked?", ["crm", "attention"]),
    scenario(99, "Based on this whole QA session, what CRM actions did you actually complete successfully versus only describe?", ["audit"]),
    scenario(100, "Summarize any moments in this session where you were uncertain, blocked, or unable to complete the requested CRM action.", ["audit", "self-check"]),
  ];

  if (prompts.length !== 100) {
    throw new Error(`Expected 100 live chatbot workflow prompts, got ${prompts.length}`);
  }

  return prompts.map((item) => ({
    ...item,
    prompt: applyTokens(applyTokens(item.prompt, n), { RUN_ID: runId }),
  }));
}
