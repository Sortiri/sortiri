export type PricingFaqItem = {
  question: string;
  answer: string;
};

export const PRICING_FAQ_ITEMS: PricingFaqItem[] = [
  {
    question: "Which plan should I start with?",
    answer:
      "Start with Free if you are testing Sortiri on one project. Use Developer if you are using agents every day. Use Startup when your team needs shared history, impact analysis, private evals, audit evidence, and longer retention.",
  },
  {
    question: "Why is Developer affordable?",
    answer:
      "Sortiri is most valuable when it starts recording company history early. Developer is priced so founders and solo builders can start before their company grows.",
  },
  {
    question: "Who is Startup for?",
    answer:
      "Startup is for early AI-native teams using coding agents, GitHub, product analytics, Stripe, and internal decisions across multiple projects.",
  },
  {
    question: "What happens if I go over included usage?",
    answer:
      "You keep recording history. Extra usage is billed at simple usage rates unless you set workspace limits.",
  },
  {
    question: "Can I set usage limits?",
    answer:
      "Yes. Workspaces can set event, storage, and AI-credit limits to avoid surprise bills.",
  },
  {
    question: "Is Sortiri priced per seat?",
    answer:
      "Developer includes 2 seats. Startup includes 5 seats. Extra seats are billed monthly.",
  },
  {
    question: "Is Sortiri a raw log sink?",
    answer:
      "No. Sortiri is designed for high-signal company memory: agent actions, decisions, workstreams, PRs, product events, revenue events, evals, incidents, and rollbacks.",
  },
  {
    question: "Do you offer YC or startup credits?",
    answer:
      "Yes. Early-stage startups can apply for startup credits or extended free usage.",
  },
  {
    question: "What is Enterprise for?",
    answer:
      "Enterprise is for companies that need SSO, advanced permissions, audit evidence rooms, custom retention, regional deployment options, security review support, and higher event volume.",
  },
];
