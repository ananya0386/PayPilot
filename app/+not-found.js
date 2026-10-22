// Shown for any unknown route (e.g. a broken link).
import { useRouter } from 'expo-router';
import Screen from '../components/Screen';
import AppHeader from '../components/AppHeader';
import { EmptyState } from '../components/StateViews';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen scroll={false} header={<AppHeader title="Not found" />}>
      <EmptyState
        icon="compass-outline"
        title="This page doesn't exist"
        message="The link may be broken or the item may have been deleted."
        actionLabel="Go to start"
        actionIcon="home-outline"
        onAction={() => router.replace('/')}
      />
    </Screen>
  );
}
