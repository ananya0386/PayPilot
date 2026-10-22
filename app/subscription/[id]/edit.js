// Screen F (edit mode): update an existing subscription with
// store.subscriptions.update (never creates a duplicate).
import { useLocalSearchParams, useRouter } from 'expo-router';
import Screen from '../../../components/Screen';
import AppHeader from '../../../components/AppHeader';
import SubscriptionForm from '../../../components/SubscriptionForm';
import { ErrorState, LoadingState } from '../../../components/StateViews';
import { useToast } from '../../../context/ToastContext';
import { useData } from '../../../hooks/useData';
import { store } from '../../../services/store';

export default function EditSubscriptionScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { data, error, loading, reload } = useData(() => store.subscriptions.get(id), [id]);

  const handleSubmit = async (values) => {
    const { subscription } = await store.subscriptions.update(id, values);
    toast.show(`${subscription.name} updated`);
    router.back();
  };

  const header = <AppHeader title="Edit Subscription" />;
  if (loading)
    return (
      <Screen scroll={false} header={header}>
        <LoadingState />
      </Screen>
    );
  if (error && !data)
    return (
      <Screen scroll={false} header={header}>
        <ErrorState error={error} onRetry={reload} />
      </Screen>
    );

  return (
    <Screen keyboard header={header}>
      {/* key makes the form start fresh if a different subscription is loaded */}
      <SubscriptionForm
        key={data.subscription.id}
        initialValues={data.subscription}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
        isEdit
      />
    </Screen>
  );
}
