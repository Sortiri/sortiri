export type AskSuggestionGroup = {
  id: string;
  title: string;
  questions: string[];
};

export const ASK_SUGGESTION_GROUPS: AskSuggestionGroup[] = [
  {
    id: "replay",
    title: "Replay",
    questions: [
      "What happened today?",
      "What changed before the incident?",
      "What did the agent do yesterday?",
    ],
  },
  {
    id: "decisions",
    title: "Decisions",
    questions: [
      "Why did we change the homepage?",
      "Which decisions affected pricing?",
      "Was this decision rolled back?",
    ],
  },
  {
    id: "engineering",
    title: "Engineering",
    questions: [
      "What PRs were merged recently?",
      "What commands failed?",
      "Did validation pass recently?",
    ],
  },
  {
    id: "product-revenue",
    title: "Product + Revenue",
    questions: [
      "What product events happened recently?",
      "Did any payments fail?",
      "Which Stripe customers had activity?",
    ],
  },
  {
    id: "intelligence",
    title: "Intelligence",
    questions: [
      "What needs attention?",
      "What did we learn recently?",
      "What playbook should I use?",
    ],
  },
];
