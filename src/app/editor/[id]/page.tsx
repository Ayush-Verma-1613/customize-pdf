import { EditorClient } from './EditorClient';

/**
 * The editor route. Everything runs in the browser, so the server component's
 * only job is to hand the document id to the client.
 */
export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditorClient id={id} />;
}
