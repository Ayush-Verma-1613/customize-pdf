import { redirect } from 'next/navigation';

/**
 * The landing page used to live here. Kept as a redirect rather than deleted,
 * so a bookmark or an open tab from before the move still arrives somewhere.
 */
export default function OnboardingRedirect() {
  redirect('/');
}
