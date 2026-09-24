/**
 * FAQs Configuration
 * Centralized list of objection-led Q&As
 */
export interface FAQItem {
  objection: string;
  q: string;
  a: string;
}

export const FAQS: FAQItem[] = [
  {
    objection: 'EXPERIENCE FRICTION',
    q: 'Will this system work if I am an absolute beginner?',
    a: 'Yes. The 7-Day Client Challenge is built specifically for freelancers who do not have a massive portfolio or established name. It guides you day-by-day through finding leads, preparing custom pitches, and launching your first conversations.'
  },
  {
    objection: 'COST & HIDDEN FEES',
    q: 'Is there a monthly subscription or recurring fee?',
    a: 'No. Every product listed is a one-time purchase. Once bought, you duplicate the templates into your own free Notion account. You get lifetime access and all future improvements for free, with no hidden charges.'
  },
  {
    objection: 'SCALE & VOLUME LIMITS',
    q: 'Can I scale this system for my agency operations?',
    a: 'Yes. The Notion CRM and Lead Sourcing trackers are built as collaborative databases. You can duplicate them, share the page links with your lead sourcing staff or sales team, and manage your operations in one central system.'
  },
  {
    objection: 'TECH FRICTION',
    q: 'What if I am not technical or good with Notion?',
    a: 'No coding or database setup is needed. Duplicating the workspace into your account takes exactly one click. We provide a short setup guide that walks you through how to use the tables and copy prompts.'
  },
  {
    objection: 'GEOLOCATION LIMITS',
    q: 'Can I use this system to find clients outside of India?',
    a: 'Yes. The outbound scripts, cold email strategies, and platforms sourcing guides are universal. They have been successfully used to secure high-ticket design, development, and marketing retainers in the US, UK, UAE, and Europe.'
  },
  {
    objection: 'REFUND POLICIES',
    q: 'How does the results guarantee actually work?',
    a: 'We want this to be risk-free. If you explore the system, attempt outbound outreach using our templates for 7 days, and genuinely feel it does not add value to your business, contact us and we will review your request for a full refund.'
  }
];
