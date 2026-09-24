import { Metadata } from 'next';
import ResourcesClientPage from './ResourcesClientPage';
import { generateCreativeWorkSchema, generateFAQSchema } from '@/lib/schemaGenerator';

export const metadata: Metadata = {
  title: 'Free Resources & Tools | ScaleCraft',
  description: 'Access free client acquisition calculators, copy-paste prompt packs, operating checklists, and release timelines to scale your freelance business.',
  alternates: {
    canonical: 'https://thescalecraft.in/resources',
  },
  openGraph: {
    title: 'Free Resources & Tools | ScaleCraft',
    description: 'Access free client acquisition calculators, copy-paste prompt packs, operating checklists, and release timelines to scale your freelance business.',
    url: 'https://thescalecraft.in/resources',
    images: ['/og-image.jpg'],
  },
};

export default function ResourcesPage() {
  const creativeWorkSchema = generateCreativeWorkSchema({
    name: 'ScaleCraft Free Resources Hub',
    description: 'Free client acquisition calculators, copy-paste prompt packs, operating checklists, and release timelines for freelancers.',
    url: 'https://thescalecraft.in/resources',
  });

  const resourceFaqs = generateFAQSchema([
    { question: 'Are ScaleCraft resources 100% free?', answer: 'Yes! All playbooks, prompt guides, and calculators in our resources hub are 100% free to access.' },
    { question: 'How do I import Notion templates into my workspace?', answer: 'Click the resource link, then click "Duplicate" in the top right corner of Notion to copy it into your workspace.' }
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(creativeWorkSchema) }}
      />
      {resourceFaqs && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(resourceFaqs) }}
        />
      )}
      <ResourcesClientPage />
    </>
  );
}
