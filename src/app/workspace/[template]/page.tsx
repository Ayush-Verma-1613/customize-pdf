import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HomeClient } from '@/components/home/HomeClient';
import { getTemplate, TEMPLATES } from '@/lib/templates';
import { absolute } from '@/lib/site';

/**
 * The workspace, opened on a particular template.
 *
 * There are thirteen templates and they are known at build time, so each gets
 * its own prerendered page rather than the workspace reading a query string in
 * the browser. That keeps the seeded template applied on the very first render
 * - no flash of the default one - and gives each starting point a real page a
 * search engine can index.
 */
export function generateStaticParams() {
  return TEMPLATES.map((template) => ({ template: template.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ template: string }>;
}): Promise<Metadata> {
  const { template: id } = await params;
  const template = getTemplate(id);
  if (!template) return {};

  return {
    title: `${template.name} template`,
    description: template.description,
    alternates: { canonical: absolute(`/workspace/${template.id}`) },
  };
}

export default async function WorkspaceTemplatePage({
  params,
}: {
  params: Promise<{ template: string }>;
}) {
  const { template } = await params;
  const def = getTemplate(template);
  if (!def) notFound();

  return (
    <>
      {/* The workspace is a set of panels and has no visible heading of its
          own, so this names the page for a screen reader arriving on it and
          for a crawler deciding what the page is about. It is the page's real
          subject rather than a keyword: the template you just opened. */}
      <h1 className="sr-only">{def.name} template</h1>
      <HomeClient initialTemplateId={template} />
    </>
  );
}
