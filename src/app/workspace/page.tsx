import { HomeClient } from '@/components/home/HomeClient';
import { LegacyTemplateLink } from './LegacyTemplateLink';

/**
 * The workspace with no template chosen. A plain server component, so the page
 * prerenders in full rather than waiting on anything read in the browser.
 */
export default function WorkspacePage() {
  return (
    <>
      <LegacyTemplateLink />
      <h1 className="sr-only">Docraft workspace</h1>
      <HomeClient />
    </>
  );
}
