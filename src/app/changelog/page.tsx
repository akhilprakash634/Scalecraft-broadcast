import { Metadata } from 'next';
import ChangelogClientPage from './ChangelogClientPage';

export const metadata: Metadata = {
  title: 'Changelog & System Release History | ScaleCraft',
  description: 'Track ongoing maintenance, new features, Gemini AI prompts, and workspace updates across ScaleCraft systems.',
  alternates: {
    canonical: 'https://thescalecraft.in/changelog',
  },
  openGraph: {
    title: 'Changelog & System Release History | ScaleCraft',
    description: 'Track ongoing maintenance, new features, Gemini AI prompts, and workspace updates across ScaleCraft systems.',
    url: 'https://thescalecraft.in/changelog',
    images: ['/og-image.jpg'],
  },
};

export default function ChangelogPage() {
  return <ChangelogClientPage />;
}
