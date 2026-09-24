/**
 * Changelog Configuration
 * Release updates logs linked to system version tags
 */
export interface ChangelogItem {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export const CHANGELOG_ITEMS: ChangelogItem[] = [
  {
    version: "v2.4.0",
    date: "July 07, 2026",
    title: "Notion CRM Updates & Real Screenshot Audit",
    changes: [
      "Added authentic screenshots and WhatsApp outreach scripts to sandbox.",
      "Integrated centralized content-config directory structure.",
      "Expanded natural language query synonym weights in search overlay."
    ]
  },
  {
    version: "v2.3.0",
    date: "June 15, 2026",
    title: "AI Lead Finder Launch",
    changes: [
      "Released Google Maps and Instagram extraction modules.",
      "Launched Apify workflows configuration guides."
    ]
  }
];
