/**
 * Product Roadmap Configuration
 * Map upcoming systems, timelines, and statuses
 */
export interface RoadmapItem {
  quarter: string;
  item: string;
  desc: string;
  status: 'planned' | 'in-progress' | 'shipped';
}

export const ROADMAP_ITEMS: RoadmapItem[] = [
  {
    quarter: "Q3 2026",
    item: "Upgraded proposal generator dashboard",
    desc: "Interactive tool inside Notion to compute client acquisition costs and frame ROI.",
    status: "in-progress"
  },
  {
    quarter: "Q3 2026",
    item: "WhatsApp outreach automation scraper templates",
    desc: "Pre-configured settings for WhatsApp group extraction without phone ban risk.",
    status: "planned"
  },
  {
    quarter: "Q4 2026",
    item: "ScaleCraft local AI agent SaaS tool",
    desc: "Autonomous local scraper agent integration to filter leads and run personalized DMs.",
    status: "planned"
  }
];
