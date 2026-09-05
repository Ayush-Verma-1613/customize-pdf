'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTemplate } from '@/lib/templates';

/**
 * Templates used to be chosen with /workspace?template=id before each one got
 * its own page. Links of that shape are still in circulation, so one is sent on
 * to the page it now names rather than quietly opening the default template.
 *
 * An id that names no template is ignored, which is what stops a hand-edited
 * link bouncing the workspace somewhere that does not exist.
 */
export function LegacyTemplateLink() {
  const router = useRouter();

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('template');
    if (id && getTemplate(id)) router.replace(`/workspace/${id}`);
  }, [router]);

  return null;
}
