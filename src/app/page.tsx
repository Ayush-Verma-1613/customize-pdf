import { HomeClient } from '@/components/home/HomeClient';

/**
 * The workspace route. Its only job on the server is to read the template the
 * onboarding page asked for, so the first render is already the right one.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template } = await searchParams;
  return <HomeClient initialTemplateId={template} />;
}
