// Placeholder route for the middle "+" tab. The tab button itself opens
// /subscription/new, so this screen is never shown; it only redirects.
import { Redirect } from 'expo-router';

export default function AddTab() {
  return <Redirect href="/subscription/new" />;
}
