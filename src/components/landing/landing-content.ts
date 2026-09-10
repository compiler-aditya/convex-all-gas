export const questions = [
  {
    id: 'about',
    question: 'What exactly is Overlap?',
    answer: 'Overlap is a workspace for two people to explore an agreement, with an agent in each person’s corner. You give your agent a private brief, follow the shared proposals, and decide whether the final terms work for you. It is about finding a workable deal, not winning at the other person’s expense.',
  },
  {
    id: 'demo',
    question: 'Is the demo negotiating with real people?',
    answer: 'No. This is an interactive product preview using fictional people and sample data. It does not run AI, invite anyone, send proposals, or save your negotiation inputs. Explore the waiting, negotiating, hard-limit, and settled scenarios without creating an account.',
  },
  {
    id: 'privacy',
    question: 'Can the other person see my private limits?',
    answer: 'The experience separates your private brief from the shared offer record. Your priorities and limits belong with your own agent. The shared record contains public proposals, not the other person’s private boundaries. All information in this demo is fictional.',
  },
  {
    id: 'confirmation',
    question: 'Does matching on terms mean we have agreed?',
    answer: 'Not by itself. Matching terms are progress, but an agreement requires both people to confirm the same complete proposal. The settled demo shows those two confirmations alongside the final terms, so there is a clear record of what was agreed.',
  },
  {
    id: 'boundaries',
    question: 'What if there is no common ground?',
    answer: 'A deal is not worth crossing a firm boundary. Your agent can explore other terms while holding a hard limit. If no proposal works for both sides, there may not be an agreement—and that is a valid outcome. Overlap does not guarantee a deal.',
  },
] as const

export const exampleSteps = [
  {
    id: 'brief',
    title: 'Tell your agent what matters.',
    description: 'Your ideal outcome. Your priorities. Your non-negotiables. Start with a brief that stays on your side of the table.',
    cardTitle: 'A good deal starts with your priorities.',
    cardDescription: 'Maya is briefing her agent for a freelance website project.',
    action: 'Next: compare proposals',
  },
  {
    id: 'proposals',
    title: 'Let the agents find the possibilities.',
    description: 'Each agent represents its own person. Follow the shared proposals while your private boundaries stay private.',
    cardTitle: 'Closer on the scope. Still room on the fee.',
    cardDescription: 'Two public proposals, side by side. Nothing hidden in a long email thread.',
    action: 'Next: see an agreement',
  },
  {
    id: 'agreement',
    title: 'Agree only when it works for you.',
    description: 'Review the complete terms. An agreement is reached only after both people confirm the same proposal.',
    cardTitle: 'Common ground, found.',
    cardDescription: 'In this example, Maya and Devin have both confirmed the same complete proposal.',
    action: 'Replay example',
  },
] as const

export function nextExampleStep(current: number) {
  return (current + 1) % exampleSteps.length
}
