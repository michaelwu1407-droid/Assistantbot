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
    summaryTeaser: "Stop losing jobs to voicemail after hours.",
    summaryAngle: "Tracey picks up urgent fault calls, logs the job, and follows up on quotes — so you never lose a lead to a competitor who answered first.",
    eyebrow: "Solutions / Electricians",
    title: "Never miss another electrical lead after hours",
    summary: "Electrical work doesn't stop at 5pm — and neither does Tracey. She answers urgent fault calls, logs every job, follows up on quotes, and keeps your pipeline visible so you can stay on the tools.",
    heroDetail: "Fault-finding · Switchboard upgrades · New installs · Commercial maintenance · Quote follow-up",
    workflows: [
      {
        title: "Never lose an after-hours fault call",
        body: "When a switchboard trips or a circuit goes down at 11pm, Tracey answers, captures the fault details, and keeps the lead hot — even when you're unavailable.",
      },
      {
        title: "Book installs and planned work without the back-and-forth",
        body: "From data cabling to large-scale commercial installs, Earlymark keeps scheduled work confirmed and visible without you chasing customers back.",
      },
      {
        title: "Follow up quotes before they go cold",
        body: "Most electricians quote and forget. Tracey follows up automatically — politely, on your behalf — so approved work doesn't slip away to the next tradesperson.",
      },
      {
        title: "Close every job cleanly and get paid",
        body: "Log outcomes, collect payment, and ask for a review without adding it to your own to-do list. Tracey handles the post-job admin so you don't have to.",
      },
    ],
    faqs: [
      {
        question: "How does Tracey handle after-hours calls?",
        answer: "Your number forwards to Tracey when you're busy or unavailable. She answers in your business name, gathers the fault details, and captures the lead so nothing goes cold overnight. You review it in the morning and call back when you're ready.",
      },
      {
        question: "Can Earlymark manage both emergency callouts and planned installs?",
        answer: "Yes — and it handles both in the same pipeline. Urgent fault calls get captured immediately, while scheduled install work gets confirmations, reminders, and follow-ups all managed by Tracey.",
      },
      {
        question: "What happens to quotes that don't get approved immediately?",
        answer: "Tracey follows up automatically at intervals you set. Most electricians lose work simply because they don't follow up consistently. Tracey makes sure that never happens.",
      },
    ],
    seoTitle: "AI receptionist and CRM for electricians | Earlymark",
    seoDescription: "Earlymark helps electricians capture urgent leads, follow up quotes, schedule installs, and reduce admin with an AI receptionist and CRM.",
  },
  {
    slug: "plumbers",
    navLabel: "Plumbers",
    summaryTitle: "Plumbers",
    summaryTeaser: "Burst pipe at 2am? Tracey's already got it.",
    summaryAngle: "Plumbing leads go to whoever answers first. Tracey makes sure that's always you — 24 hours a day.",
    eyebrow: "Solutions / Plumbers",
    title: "Win every urgent plumbing job — even when you're on site",
    summary: "Hot water down, pipe burst, blocked drain — these calls go to whoever answers first. Tracey makes sure that's always you. She picks up, captures the job, and keeps the lead from walking to your competitor.",
    heroDetail: "Emergency callouts · Hot water replacement · Blocked drains · Commercial maintenance · Large plumbing projects",
    workflows: [
      {
        title: "Answer every emergency call immediately",
        body: "Burst pipes and hot water failures don't wait. Tracey picks up instantly, collects the urgency and location, and keeps the job from going to the next plumber in a Google search.",
      },
      {
        title: "Confirm bookings fast and reduce no-shows",
        body: "Customers who don't hear back quickly go elsewhere. Tracey confirms bookings fast, sends reminders, and keeps your schedule tight so your day stays predictable.",
      },
      {
        title: "Keep quotes, callout fees, and invoices in one place",
        body: "From first callout through to final invoice, Earlymark tracks what was quoted, approved, and completed — without it getting lost in a trail of texts and memory.",
      },
      {
        title: "Update customers without stopping work",
        body: "Tracey sends ETA updates, post-job summaries, and payment reminders on your behalf. Customers stay informed, and you stay on the tools.",
      },
    ],
    faqs: [
      {
        question: "What happens if I'm already on a job when an emergency call comes in?",
        answer: "Tracey answers on your behalf, captures all the relevant details, and queues the job for you. When you're free, everything is logged and ready — you never have to wonder what you missed.",
      },
      {
        question: "Can Earlymark handle larger plumbing projects, not just emergencies?",
        answer: "Absolutely. The same system that captures urgent callouts also manages slower quote and project workflows. Everything sits in one pipeline regardless of job type.",
      },
      {
        question: "How does it handle customer follow-up and payment?",
        answer: "After the job is done, Tracey can send a payment request or follow-up message automatically. No more chasing invoices at the end of the week.",
      },
    ],
    seoTitle: "AI receptionist and CRM for plumbers | Earlymark",
    seoDescription: "Earlymark helps plumbers capture urgent jobs, confirm bookings, manage quotes, and reduce admin with an AI receptionist and CRM.",
  },
  {
    slug: "landscapers",
    navLabel: "Landscapers",
    summaryTitle: "Landscapers",
    summaryTeaser: "Keep recurring jobs running and project quotes converting.",
    summaryAngle: "From weekly maintenance to large-scale projects, Tracey keeps your schedule full, your clients in the loop, and your pipeline converting.",
    eyebrow: "Solutions / Landscapers",
    title: "More jobs booked. Less time spent chasing them.",
    summary: "Landscaping runs on repeat customers and slow-burning project quotes. Tracey keeps your recurring work visible, follows up on estimates, and handles the client communication that usually falls through the cracks.",
    heroDetail: "Recurring maintenance · Site visits · Project quoting · Seasonal work · Garden design",
    workflows: [
      {
        title: "Never lose a recurring client to poor communication",
        body: "Repeat clients are the backbone of landscaping. Tracey keeps them informed, confirms upcoming visits, and handles the small communication moments that build long-term relationships.",
      },
      {
        title: "Handle project enquiries before they go cold",
        body: "Site visits and large project quotes are where the real revenue is. Earlymark captures every enquiry and keeps the opportunity moving while you're in the field.",
      },
      {
        title: "Follow up quotes that went quiet",
        body: "Most landscaping quotes don't convert immediately. Tracey follows up at the right time with the right message — instead of letting a $10,000 project slip away silently.",
      },
      {
        title: "Plan routes and manage your crew's day",
        body: "With schedule and map visibility, Earlymark helps you group nearby jobs, reduce driving time, and keep your team working efficiently day to day.",
      },
    ],
    faqs: [
      {
        question: "Can Earlymark help with recurring maintenance schedules?",
        answer: "Yes. It keeps recurring jobs visible, sends client reminders, and manages the communication around regular visits so nothing falls off the schedule.",
      },
      {
        question: "How does it handle project quoting and follow-up?",
        answer: "When a site visit turns into a quote, Earlymark tracks that opportunity and follows up automatically. You set the timing — Tracey handles the communication.",
      },
      {
        question: "Does it work for larger landscaping teams?",
        answer: "Yes. You can assign jobs, track crew, and manage scheduling across multiple team members through simple chat commands to Tracey.",
      },
    ],
    seoTitle: "AI receptionist and CRM for landscapers | Earlymark",
    seoDescription: "Earlymark helps landscapers manage recurring jobs, follow up project quotes, coordinate crews, and reduce admin with an AI receptionist and CRM.",
  },
  {
    slug: "cleaners",
    navLabel: "Cleaners",
    summaryTitle: "Cleaners",
    summaryTeaser: "Fill your schedule and stop losing time to booking calls.",
    summaryAngle: "Tracey handles the repetitive booking, confirmation, and follow-up conversations — so you spend your day cleaning, not managing messages.",
    eyebrow: "Solutions / Cleaners",
    title: "More bookings. Less admin. A cleaning business that runs itself.",
    summary: "Booking conversations, reschedule requests, customer follow-up — it's a lot of repetitive work for a solo operator or growing cleaning team. Tracey handles all of it so you can focus on the job.",
    heroDetail: "Domestic cleaning · End-of-lease · Commercial cleaning · Recurring bookings · Move-in/move-out",
    workflows: [
      {
        title: "Book jobs without playing phone tag",
        body: "New enquiries get an immediate, professional response from Tracey — day or night. She captures what they need, checks availability, and locks in the booking.",
      },
      {
        title: "Reduce no-shows with automated reminders",
        body: "Confirmed jobs that don't show up cost real money. Tracey sends reminders ahead of each appointment so your day stays productive.",
      },
      {
        title: "Manage recurring clients without the admin overhead",
        body: "Weekly, fortnightly, monthly — Tracey keeps your regular clients on schedule, handles rescheduling requests, and makes sure no one slips through the gaps.",
      },
      {
        title: "Turn one-off jobs into repeat customers",
        body: "After every clean, Tracey follows up with a thank-you and a soft prompt to rebook. It's the kind of customer experience that builds a loyal, growing base.",
      },
    ],
    faqs: [
      {
        question: "Is Earlymark useful for a solo cleaning operator?",
        answer: "Absolutely. Solo operators often lose the most time to admin — booking calls, confirmations, rescheduling. Tracey handles all of it so you can focus on the actual cleaning work.",
      },
      {
        question: "Can it handle the high volume of communication in a cleaning business?",
        answer: "That's exactly what it's built for. Tracey manages booking requests, confirmations, reminders, and follow-ups without any manual effort on your part.",
      },
      {
        question: "Does it work for both domestic and commercial cleaning?",
        answer: "Yes. Whether you're running a residential round, commercial contracts, or one-off end-of-lease jobs, Earlymark manages every workflow consistently.",
      },
    ],
    seoTitle: "AI receptionist and CRM for cleaning businesses | Earlymark",
    seoDescription: "Earlymark helps cleaning businesses fill their schedule, manage recurring clients, reduce no-shows, and automate follow-up with an AI receptionist and CRM.",
  },
  {
    slug: "pest-control",
    navLabel: "Pest control",
    summaryTitle: "Pest control",
    summaryTeaser: "Fast responses win urgent pest jobs. Tracey makes sure you're always first.",
    summaryAngle: "When someone finds cockroaches or a possum in the roof, they call whoever answers. Tracey makes sure that's always you.",
    eyebrow: "Solutions / Pest control",
    title: "Win urgent pest jobs and keep repeat business growing.",
    summary: "Pest control leads are time-sensitive — customers call two or three businesses and go with whoever responds first. Tracey answers immediately, captures the pest details, and locks in the job before anyone else gets a chance.",
    heroDetail: "Urgent treatments · Inspections · Follow-up visits · Recurring service plans · Commercial contracts",
    workflows: [
      {
        title: "Answer urgent pest calls before competitors do",
        body: "When someone finds cockroaches or a rodent issue, the first business to respond usually wins. Tracey answers immediately and captures the booking before the customer calls the next number.",
      },
      {
        title: "Schedule inspections and treatments cleanly",
        body: "Keep callouts, follow-up treatments, and scheduled inspections in a visible pipeline — not scattered across texts and calendar notes.",
      },
      {
        title: "Manage repeat service and follow-up visits",
        body: "Pest work often needs return visits. Tracey tracks what was treated, when follow-up is due, and sends reminders so recurring revenue never falls through the cracks.",
      },
      {
        title: "Communicate clearly on uncomfortable jobs",
        body: "When customers are dealing with an infestation, clear and fast communication builds serious trust. Tracey keeps customers updated so you look professional even on the most stressful jobs.",
      },
    ],
    faqs: [
      {
        question: "Does Earlymark work for urgent same-day pest jobs?",
        answer: "Yes — that's one of its strongest use cases. Tracey picks up immediately, captures the pest details and location, and confirms the booking before the customer calls a competitor.",
      },
      {
        question: "Can it manage repeat treatments and annual inspection reminders?",
        answer: "Yes. Tracey tracks what was done and when follow-up is needed, so repeat revenue is never lost to a missed reminder.",
      },
      {
        question: "What about commercial pest control contracts?",
        answer: "Earlymark can manage both reactive residential work and scheduled commercial contracts in the same system. Everything sits in one pipeline.",
      },
    ],
    seoTitle: "AI receptionist and CRM for pest control businesses | Earlymark",
    seoDescription: "Earlymark helps pest control businesses capture urgent leads, manage treatments, and grow repeat business with an AI receptionist and CRM.",
  },
  {
    slug: "locksmiths",
    navLabel: "Locksmiths",
    summaryTitle: "Locksmiths",
    summaryTeaser: "Every missed call is a job that went to your competitor.",
    summaryAngle: "Locksmith jobs go to whoever answers. Tracey makes sure that's you — any time, any hour.",
    eyebrow: "Solutions / Locksmiths",
    title: "Answer every lockout call. Win every urgent job.",
    summary: "A lockout call at 10pm is a guaranteed job — for whoever picks up. Tracey answers every call the moment it comes in, captures the location and urgency, and locks in the booking before the customer dials someone else.",
    heroDetail: "Lockouts · Rekeying · Security upgrades · Mobile field work · After-hours emergency",
    workflows: [
      {
        title: "Capture lockout calls the instant they come in",
        body: "Lockout jobs go to the first business that picks up the phone. Tracey answers immediately, captures the address and urgency, and confirms the job before another locksmith gets a chance.",
      },
      {
        title: "Stay available after hours — when it matters most",
        body: "Most locksmith work happens outside of 9 to 5. Tracey answers at all hours so missed calls don't become missed jobs, even when you're already on site or finishing for the night.",
      },
      {
        title: "Keep mobile jobs and locations organised",
        body: "Track active jobs, ETAs, and field locations without relying on memory or scattered manual notes. Everything stays visible in your CRM.",
      },
      {
        title: "Follow up security upgrade enquiries professionally",
        body: "Not every call is a lockout. Security audits, rekeying, and upgrade quotes deserve proper follow-up. Tracey keeps those opportunities moving after the urgent work is done.",
      },
    ],
    faqs: [
      {
        question: "How does Tracey handle calls when I'm already on a job?",
        answer: "She answers on your behalf, captures the location and urgency, and queues the job so you can call back the moment you're free. Nothing falls through the gaps.",
      },
      {
        question: "Can Earlymark help with after-hours locksmith work?",
        answer: "That's one of its strongest use cases. Tracey answers any time — midnight, weekends, public holidays. Locksmith businesses using Earlymark stop losing those after-hours jobs entirely.",
      },
      {
        question: "Does it only work for lockout jobs?",
        answer: "No. It also handles rekeying enquiries, security upgrade quotes, and follow-up communication — the full range of locksmith work in one system.",
      },
    ],
    seoTitle: "AI receptionist and CRM for locksmiths | Earlymark",
    seoDescription: "Earlymark helps locksmiths capture urgent calls, stay available after hours, win more lockout jobs, and reduce admin with an AI receptionist and CRM.",
  },
  {
    slug: "painters",
    navLabel: "Painters",
    summaryTitle: "Painters",
    summaryTeaser: "Quote more jobs. Follow up every one. Win more work.",
    summaryAngle: "Most painters lose jobs by quoting and going quiet. Tracey makes sure your quotes are always followed up — professionally, automatically, on your behalf.",
    eyebrow: "Solutions / Painters",
    title: "Stop losing painting jobs to your own inbox.",
    summary: "Most painting businesses quote well and follow up poorly. Tracey fixes that — she captures every enquiry, keeps site visit coordination moving, and follows up on every quote until you get an answer.",
    heroDetail: "Residential repaints · New builds · Commercial painting · Interior & exterior · Quote-to-project pipelines",
    workflows: [
      {
        title: "Respond to quote requests before the competition",
        body: "Painting customers get multiple quotes. The business that responds fastest and most professionally usually wins. Tracey responds the moment a lead comes in — day or night.",
      },
      {
        title: "Coordinate site visits without the back-and-forth",
        body: "Site visits that take three texts to confirm often end up falling over. Tracey handles the scheduling conversation and locks in the visit cleanly.",
      },
      {
        title: "Follow up quotes until you get a yes or no",
        body: "Most painters lose jobs they've already quoted by simply not following up. Tracey does it automatically — at the right interval, in the right tone — so you close more of the work you've already invested in.",
      },
      {
        title: "Keep longer project pipelines active",
        body: "Large painting jobs can take weeks to convert. Earlymark keeps those opportunities visible and followed up so they don't quietly expire while you're focused on current work.",
      },
    ],
    faqs: [
      {
        question: "Is Earlymark built for painters who rely heavily on quoting?",
        answer: "Yes. The follow-up workflow is particularly strong for quote-heavy businesses. Most painters lose jobs simply by not following up — Tracey makes that automatic.",
      },
      {
        question: "How does it handle site visit coordination?",
        answer: "Tracey manages the back-and-forth of scheduling a site visit, confirms the time, and sends a reminder — so you show up to an appointment that's confirmed, not one that might fall through.",
      },
      {
        question: "Can it work for both residential and commercial painting?",
        answer: "Yes. Earlymark handles both residential repaints and larger commercial painting pipelines in the same system, with the same follow-up workflows.",
      },
    ],
    seoTitle: "AI receptionist and CRM for painters | Earlymark",
    seoDescription: "Earlymark helps painters capture leads, follow up quotes, coordinate site visits, and win more work with an AI receptionist and CRM.",
  },
  {
    slug: "hvac",
    navLabel: "HVAC",
    summaryTitle: "HVAC",
    summaryTeaser: "Peak season demand spikes. Tracey handles the surge.",
    summaryAngle: "When summer hits and every AC unit breaks at once, Tracey answers every call, triages urgency, and keeps your schedule full without the chaos.",
    eyebrow: "Solutions / HVAC",
    title: "Stay on top of every job — even when the season gets busy.",
    summary: "HVAC businesses face intense seasonal peaks — and missing a call during those periods means missing real revenue. Tracey handles the surge, keeps service and install work organised, and maintains the customer communication that sets you apart.",
    heroDetail: "AC repairs · Heating installations · Seasonal servicing · Maintenance agreements · Commercial HVAC",
    workflows: [
      {
        title: "Handle the seasonal surge without dropping calls",
        body: "When summer hits and every AC unit breaks, calls spike overnight. Tracey answers all of them, captures the job details, and keeps your pipeline from getting chaotic.",
      },
      {
        title: "Keep service and install work in one visible pipeline",
        body: "Repairs, replacements, new installs, and maintenance contracts all sit together so you're never losing track of active work across different job types.",
      },
      {
        title: "Build recurring revenue from maintenance agreements",
        body: "HVAC businesses with repeat service relationships are more stable. Tracey helps you manage those relationships, send servicing reminders, and keep intervals on track.",
      },
      {
        title: "Deliver fast, professional communication during urgent breakdowns",
        body: "When heating fails in winter or AC dies in summer, customers are stressed. Fast, professional communication from Tracey makes you the calm, trusted option — which wins repeat business.",
      },
    ],
    faqs: [
      {
        question: "How does Earlymark help during peak HVAC periods?",
        answer: "It ensures every incoming call gets answered immediately, so you capture the job instead of losing it to a competitor who happened to be available. During peak season, that difference is thousands of dollars.",
      },
      {
        question: "Can it manage both service work and larger installations?",
        answer: "Yes. HVAC businesses use the same system for same-day repairs, quote-based installations, and recurring maintenance — each with appropriate workflows.",
      },
      {
        question: "Does it work for businesses with maintenance agreement customers?",
        answer: "Yes. Tracey can track servicing intervals, send reminders, and manage the communication around recurring HVAC maintenance so those customers stay loyal.",
      },
    ],
    seoTitle: "AI receptionist and CRM for HVAC businesses | Earlymark",
    seoDescription: "Earlymark helps HVAC businesses handle seasonal demand, manage service and install jobs, build recurring revenue, and reduce admin with an AI receptionist and CRM.",
  },
];

export const TRADE_SERVICES_BY_SLUG = Object.fromEntries(
  TRADE_SERVICES.map((service) => [service.slug, service]),
) as Record<TradeService["slug"], TradeService>;

export const TRADE_SERVICES_SUMMARY = {
  eyebrow: "Solutions",
  title: "Earlymark for your trade.",
  description:
    "Every trade runs differently. Earlymark adapts — with AI-powered call answering, CRM, and follow-up workflows built around how your jobs actually move.",
  navSummary:
    "Trade services with AI receptionist, CRM, scheduling, and follow-up workflows built for field businesses.",
};
