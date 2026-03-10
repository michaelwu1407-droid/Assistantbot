export type TradeService = {
  slug:
    | "electricians"
    | "plumbers"
    | "landscapers"
    | "cleaners"
    | "pest-control"
    | "locksmiths"
    | "painters"
    | "hvac";
  navLabel: string;
  summaryTitle: string;
  summaryTeaser: string;
  summaryAngle: string;
  eyebrow: string;
  title: string;
  summary: string;
  heroDetail: string;
  workflows: Array<{
    title: string;
    body: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  seoTitle: string;
  seoDescription: string;
};

export const TRADE_SERVICES: TradeService[] = [
  {
    slug: "electricians",
    navLabel: "Electricians",
    summaryTitle: "Electricians",
    summaryTeaser: "Capture urgent fault-finding calls, keep installs scheduled, and stop losing jobs after hours.",
    summaryAngle: "Built for emergency callouts, quoting, and keeping the right crew moving.",
    eyebrow: "Trade services / Electricians",
    title: "AI receptionist and CRM for electricians",
    summary: "Handle urgent enquiries fast, book installs cleanly, and keep every quoted or completed electrical job moving through the right workflow.",
    heroDetail: "Ideal for fault-finding, switchboard upgrades, installs, maintenance, and follow-up admin.",
    workflows: [
      {
        title: "Answer urgent callouts immediately",
        body: "Tracey picks up after-hours and high-intent calls, captures fault details, and helps you decide which jobs need fast follow-up.",
      },
      {
        title: "Book the right work into the right day",
        body: "From installs to inspections, Earlymark keeps scheduled work visible so your crew and customers stay aligned.",
      },
      {
        title: "Keep quotes, approvals, and invoices moving",
        body: "Track what was quoted, what was approved, and what the final job value became without losing the context in scattered texts or calls.",
      },
      {
        title: "Close the loop after the job",
        body: "Log outcomes, send follow-ups, and keep the customer experience sharp once the electrical work is done.",
      },
    ],
    faqs: [
      {
        question: "Can Earlymark help with urgent electrical callouts?",
        answer: "Yes. It is designed to capture urgent faults quickly, gather the key details, and help you respond faster when the job matters.",
      },
      {
        question: "Does it work for both installs and maintenance?",
        answer: "Yes. Electricians can use the same workflow for emergency work, planned installs, recurring maintenance, and quote follow-up.",
      },
      {
        question: "Can it help reduce missed after-hours leads?",
        answer: "That is one of the main use cases. Tracey answers when you are unavailable and keeps the lead from going cold overnight.",
      },
    ],
    seoTitle: "AI receptionist and CRM for electricians | Earlymark",
    seoDescription: "Earlymark helps electricians capture urgent leads, manage quotes, schedule installs, and reduce admin with an AI receptionist and CRM.",
  },
  {
    slug: "plumbers",
    navLabel: "Plumbers",
    summaryTitle: "Plumbers",
    summaryTeaser: "Handle burst pipes, hot-water failures, and quoting without getting buried in phone tag and admin.",
    summaryAngle: "Built for urgency, clear customer updates, and cleaner quote-to-payment workflows.",
    eyebrow: "Trade services / Plumbers",
    title: "AI receptionist and CRM for plumbers",
    summary: "Capture urgent plumbing jobs faster, keep customers updated, and manage quotes, callouts, and follow-up from one operating system.",
    heroDetail: "Built for emergency work, hot water jobs, blocked drains, maintenance, and larger plumbing projects.",
    workflows: [
      {
        title: "Triage urgent plumbing jobs quickly",
        body: "Burst pipes and no-hot-water calls need speed. Tracey helps collect the right details and keeps those leads from slipping through.",
      },
      {
        title: "Confirm jobs and reduce back-and-forth",
        body: "Customers get faster responses and clearer confirmations so your day is not wasted on repetitive booking admin.",
      },
      {
        title: "Track callout fees, quotes, and final values",
        body: "Earlymark gives plumbers one place to follow the job from first enquiry through to invoiced outcome.",
      },
      {
        title: "Keep customers informed",
        body: "Use SMS and follow-up workflows to keep the customer updated when the tradie is on the way or the job is complete.",
      },
    ],
    faqs: [
      {
        question: "Is Earlymark suitable for urgent plumbing work?",
        answer: "Yes. It is especially useful for urgent inbound calls where quick capture and fast response make the biggest difference.",
      },
      {
        question: "Can it support quotes and maintenance jobs too?",
        answer: "Yes. It can handle both emergency plumbing enquiries and slower quote or maintenance workflows in the same system.",
      },
      {
        question: "Will it help with customer updates?",
        answer: "Yes. Tracey can help keep customers informed with confirmations and follow-up communication rather than leaving it all manual.",
      },
    ],
    seoTitle: "AI receptionist and CRM for plumbers | Earlymark",
    seoDescription: "Earlymark helps plumbers capture urgent leads, send updates, manage quotes, and reduce admin with an AI receptionist and CRM.",
  },
  {
    slug: "landscapers",
    navLabel: "Landscapers",
    summaryTitle: "Landscapers",
    summaryTeaser: "Coordinate site visits, recurring maintenance, and project work without losing visibility across jobs and crews.",
    summaryAngle: "Built for quote pipelines, route-aware field work, and recurring schedules.",
    eyebrow: "Trade services / Landscapers",
    title: "AI receptionist and CRM for landscapers",
    summary: "Manage seasonal work, recurring maintenance, and larger landscaping projects from one place so jobs, quotes, and follow-ups do not drift.",
    heroDetail: "Designed for maintenance runs, site visits, project quoting, and longer landscaping pipelines.",
    workflows: [
      {
        title: "Qualify maintenance versus project enquiries",
        body: "Not every landscaping lead should be handled the same way. Earlymark helps separate quick recurring work from larger project opportunities.",
      },
      {
        title: "Coordinate recurring work more cleanly",
        body: "Recurring mowing, garden maintenance, and seasonal visits stay visible instead of being buried across messages and spreadsheets.",
      },
      {
        title: "Keep project quotes moving",
        body: "For larger landscaping jobs, Tracey helps keep communication active while the opportunity moves from site visit to quote to approval.",
      },
      {
        title: "Stay organised in the field",
        body: "With schedule and map visibility, landscapers can keep routes, job timing, and customer context tighter day to day.",
      },
    ],
    faqs: [
      {
        question: "Can Earlymark handle both recurring and one-off landscaping jobs?",
        answer: "Yes. It is designed to support both maintenance-style work and larger project-based landscaping jobs.",
      },
      {
        question: "Is it useful for site-visit follow-up?",
        answer: "Yes. It helps keep quotes and customer communication moving after an initial site visit.",
      },
      {
        question: "Can it support route-aware field work?",
        answer: "Yes. The workflow is especially useful when you need better visibility across multiple jobs in a day.",
      },
    ],
    seoTitle: "AI receptionist and CRM for landscapers | Earlymark",
    seoDescription: "Earlymark helps landscapers manage recurring jobs, site visits, project quotes, and customer follow-up with an AI receptionist and CRM.",
  },
  {
    slug: "cleaners",
    navLabel: "Cleaners",
    summaryTitle: "Cleaners",
    summaryTeaser: "Book regular cleaning work, coordinate one-off jobs, and reduce the admin load around customer communication.",
    summaryAngle: "Built for recurring bookings, field coordination, and clean handovers between enquiries and scheduled work.",
    eyebrow: "Trade services / Cleaners",
    title: "AI receptionist and CRM for cleaning businesses",
    summary: "Earlymark helps cleaning businesses respond faster, manage recurring work, and keep customers informed without drowning in repetitive admin.",
    heroDetail: "Useful for domestic cleaning, commercial work, end-of-lease jobs, and recurring service runs.",
    workflows: [
      {
        title: "Book recurring and one-off jobs cleanly",
        body: "Keep regular cleans, once-off deep cleans, and larger end-of-lease jobs visible in one operating flow.",
      },
      {
        title: "Reduce repetitive customer communication",
        body: "Tracey helps handle the same booking and confirmation conversations that would otherwise consume your day.",
      },
      {
        title: "Keep team schedules and customer expectations aligned",
        body: "Clearer job timing and communication means fewer missed visits and less avoidable confusion.",
      },
      {
        title: "Stay on top of lead follow-up",
        body: "Capture quote requests and keep the enquiry warm until the job is scheduled or clearly declined.",
      },
    ],
    faqs: [
      {
        question: "Can Earlymark work for recurring cleaning schedules?",
        answer: "Yes. It is a good fit for cleaning businesses with repeat bookings and a high volume of similar customer communication.",
      },
      {
        question: "Does it help with quote and booking admin?",
        answer: "Yes. It helps reduce the repetitive back-and-forth around availability, confirmation, and follow-up.",
      },
      {
        question: "Is it only for large teams?",
        answer: "No. It can help solo operators and growing cleaning businesses that need less admin and better responsiveness.",
      },
    ],
    seoTitle: "AI receptionist and CRM for cleaning businesses | Earlymark",
    seoDescription: "Earlymark helps cleaning businesses manage recurring bookings, quote requests, and customer communication with an AI receptionist and CRM.",
  },
  {
    slug: "pest-control",
    navLabel: "Pest control",
    summaryTitle: "Pest control",
    summaryTeaser: "Respond faster to urgent pest issues, schedule treatments cleanly, and keep follow-up organised.",
    summaryAngle: "Built for urgency, treatment scheduling, and repeat customer communication.",
    eyebrow: "Trade services / Pest control",
    title: "AI receptionist and CRM for pest control businesses",
    summary: "Capture urgent enquiries quickly, keep treatment jobs organised, and maintain better follow-up for repeat pest-control work.",
    heroDetail: "Useful for urgent treatments, inspections, follow-up visits, and recurring service plans.",
    workflows: [
      {
        title: "Capture urgent pest issues quickly",
        body: "When customers call about a serious issue, Earlymark helps you collect the core details and respond faster.",
      },
      {
        title: "Book inspections and treatments into the right slots",
        body: "Keep treatment work, callouts, and follow-up visits structured instead of juggling them manually.",
      },
      {
        title: "Maintain follow-up and repeat service workflows",
        body: "Pest control often needs return visits or reminders. Earlymark helps keep those touchpoints from being missed.",
      },
      {
        title: "Keep communication clear and professional",
        body: "Customers get quicker updates and clearer next steps, which improves trust during urgent or unpleasant situations.",
      },
    ],
    faqs: [
      {
        question: "Is Earlymark suitable for urgent pest-control leads?",
        answer: "Yes. It works well for urgent inbound calls where speed and clear next steps matter.",
      },
      {
        question: "Can it support repeat treatments and follow-up visits?",
        answer: "Yes. It is useful for businesses that need to manage both one-off treatments and recurring service schedules.",
      },
      {
        question: "Does it help with customer communication after booking?",
        answer: "Yes. Tracey can help keep communication moving from first contact through treatment and follow-up.",
      },
    ],
    seoTitle: "AI receptionist and CRM for pest control businesses | Earlymark",
    seoDescription: "Earlymark helps pest control businesses capture urgent leads, schedule treatments, and manage follow-up with an AI receptionist and CRM.",
  },
  {
    slug: "locksmiths",
    navLabel: "Locksmiths",
    summaryTitle: "Locksmiths",
    summaryTeaser: "Handle high-urgency calls fast, keep mobile jobs moving, and reduce missed opportunities after hours.",
    summaryAngle: "Built for immediate response, mobile field work, and fast-turnaround job admin.",
    eyebrow: "Trade services / Locksmiths",
    title: "AI receptionist and CRM for locksmiths",
    summary: "Earlymark helps locksmiths capture urgent jobs quickly, stay responsive after hours, and keep field work and follow-up tighter.",
    heroDetail: "Designed for urgent lockouts, rekey jobs, security upgrades, and mobile field work.",
    workflows: [
      {
        title: "Capture urgent lockout and access jobs fast",
        body: "High-intent calls need speed. Tracey helps make sure those urgent jobs are captured even when you are unavailable.",
      },
      {
        title: "Stay available after hours",
        body: "For locksmiths, missed calls often mean lost revenue. Earlymark helps reduce that drop-off when urgency is highest.",
      },
      {
        title: "Keep mobile jobs organised",
        body: "Track active enquiries, scheduled jobs, and completed work without relying on scattered manual notes.",
      },
      {
        title: "Follow up professionally",
        body: "Once the urgent work is done, keep the customer experience strong with clear follow-up and recorded outcomes.",
      },
    ],
    faqs: [
      {
        question: "Is Earlymark a good fit for emergency locksmith work?",
        answer: "Yes. It is especially suited to fast-response businesses where missed calls mean lost jobs.",
      },
      {
        question: "Can it help after hours?",
        answer: "Yes. That is one of the strongest use cases for locksmith businesses using Earlymark.",
      },
      {
        question: "Does it only work for emergency jobs?",
        answer: "No. It can also support rekeying, security upgrades, and other planned locksmith work.",
      },
    ],
    seoTitle: "AI receptionist and CRM for locksmiths | Earlymark",
    seoDescription: "Earlymark helps locksmiths capture urgent calls, stay available after hours, and reduce admin with an AI receptionist and CRM.",
  },
  {
    slug: "painters",
    navLabel: "Painters",
    summaryTitle: "Painters",
    summaryTeaser: "Manage quote-heavy pipelines, keep site visits moving, and follow up professionally without admin drag.",
    summaryAngle: "Built for quote conversion, project follow-up, and clearer customer communication.",
    eyebrow: "Trade services / Painters",
    title: "AI receptionist and CRM for painters",
    summary: "Earlymark helps painting businesses handle quote requests, coordinate site visits, and move customers from enquiry to booked work more cleanly.",
    heroDetail: "Useful for residential painting, commercial work, repaints, and quote-heavy project pipelines.",
    workflows: [
      {
        title: "Capture and qualify quote requests",
        body: "Painting businesses often run on estimates and site visits. Earlymark helps keep those opportunities organised from the first enquiry.",
      },
      {
        title: "Coordinate visits and approvals",
        body: "Reduce the back-and-forth around site inspections, quote timing, and next steps.",
      },
      {
        title: "Keep long sales cycles active",
        body: "Not every painting lead converts immediately. Tracey helps you follow up consistently instead of letting the opportunity go cold.",
      },
      {
        title: "Deliver a cleaner customer experience",
        body: "Professional communication helps you stand out in a category where trust and responsiveness matter before the first brush hits the wall.",
      },
    ],
    faqs: [
      {
        question: "Is Earlymark useful for quote-heavy painting businesses?",
        answer: "Yes. It is a strong fit when the workflow depends on enquiries, site visits, estimates, and follow-up.",
      },
      {
        question: "Can it help keep unapproved quotes moving?",
        answer: "Yes. Follow-up is one of the main benefits for painters managing slower conversion cycles.",
      },
      {
        question: "Does it work for both residential and commercial painting?",
        answer: "Yes. The workflow can support different painting job types as long as you want cleaner lead and communication handling.",
      },
    ],
    seoTitle: "AI receptionist and CRM for painters | Earlymark",
    seoDescription: "Earlymark helps painters manage quote requests, site visits, and follow-up with an AI receptionist and CRM for trade businesses.",
  },
  {
    slug: "hvac",
    navLabel: "HVAC",
    summaryTitle: "HVAC",
    summaryTeaser: "Capture service calls, manage installs and maintenance, and keep customer communication tight across busy seasons.",
    summaryAngle: "Built for seasonal demand, installs, maintenance agreements, and service responsiveness.",
    eyebrow: "Trade services / HVAC",
    title: "AI receptionist and CRM for HVAC businesses",
    summary: "Earlymark helps HVAC businesses stay responsive during peak demand, manage service and install workflows, and reduce communication bottlenecks.",
    heroDetail: "Designed for repairs, installs, servicing, and recurring HVAC maintenance work.",
    workflows: [
      {
        title: "Respond faster during peak periods",
        body: "When heating or cooling demand spikes, Earlymark helps make sure incoming leads are captured and triaged instead of missed.",
      },
      {
        title: "Manage service and install work in one flow",
        body: "Track repairs, maintenance, and larger installation jobs without splitting your operating process across disconnected tools.",
      },
      {
        title: "Support recurring maintenance relationships",
        body: "For HVAC businesses with repeat servicing, Earlymark helps keep bookings and communication more consistent.",
      },
      {
        title: "Keep customers updated clearly",
        body: "Faster replies and clearer next steps improve the customer experience, especially when the issue is urgent or uncomfortable.",
      },
    ],
    faqs: [
      {
        question: "Can Earlymark help during seasonal HVAC rush periods?",
        answer: "Yes. It is especially useful when call volumes rise and responsiveness becomes harder to maintain manually.",
      },
      {
        question: "Does it work for both service calls and installs?",
        answer: "Yes. HVAC businesses can use the same system for repairs, servicing, and installation workflows.",
      },
      {
        question: "Can it support maintenance-based customer relationships?",
        answer: "Yes. It works well for businesses that need repeat communication and recurring service coordination.",
      },
    ],
    seoTitle: "AI receptionist and CRM for HVAC businesses | Earlymark",
    seoDescription: "Earlymark helps HVAC businesses capture leads, manage service and install jobs, and reduce admin with an AI receptionist and CRM.",
  },
];

export const TRADE_SERVICES_BY_SLUG = Object.fromEntries(
  TRADE_SERVICES.map((service) => [service.slug, service]),
) as Record<TradeService["slug"], TradeService>;

export const TRADE_SERVICES_SUMMARY = {
  eyebrow: "Solutions / Trade services",
  title: "Built for the way trade businesses actually run.",
  description:
    "Start with a trade-specific version of Earlymark and give customers a workflow that fits the jobs you quote every day.",
  navSummary:
    "Trade services with AI receptionist, CRM, scheduling, and follow-up workflows built for field businesses.",
};
