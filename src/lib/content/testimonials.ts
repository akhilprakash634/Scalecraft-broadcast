/**
 * Testimonials Configuration
 * Centralized list of verified reviews and client attributes
 */
export interface Review {
  _id: string;
  name: string;
  rating: number;
  comment: string;
  profession: string;
}

export const VERIFIED_REVIEWS: Review[] = [
  {
    _id: '1',
    name: 'Rohan Sharma',
    rating: 5,
    comment: 'The follow-up scripts are gold. Closed a ₹15,000 onboarding retainer from Instagram in 4 days of sending warm pitches.',
    profession: 'UI Designer · Mumbai'
  },
  {
    _id: '2',
    name: 'Preeti Nair',
    rating: 5,
    comment: 'Found exactly where eCommerce owners hang out using the lead finder workflows. Sourced 50 leads in 40 minutes.',
    profession: 'Copywriter · Bangalore'
  },
  {
    _id: '3',
    name: 'Aditya K.',
    rating: 5,
    comment: 'No fluff templates. The Notion database CRM keeps me from forgetting follow-ups. Best investment I made this year.',
    profession: 'Frontend Developer · Delhi'
  }
];
