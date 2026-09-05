import { EditorClient } from './EditorClient';

/**
 * One prerendered shell serves every document. Ids are created in the browser,
 * so there is no set of them to build pages from; hosting rewrites /editor/*
 * onto this file and the client reads the id back out of the address bar.
 */
export function generateStaticParams() {
  return [{ id: 'doc' }];
}

export default function EditorPage() {
  return <EditorClient />;
}
