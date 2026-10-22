// Screen F (add mode): create a new subscription.
import { useRouter } from 'expo-router';
import Screen from '../../components/Screen';
import AppHeader from '../../components/AppHeader';
import SubscriptionForm from '../../components/SubscriptionForm';
import { useToast } from '../../context/ToastContext';
import { store } from '../../services/store';

export default function NewSubscriptionScreen() {
  const router = useRouter();
  const toast = useToast();

  const handleSubmit = async (values) => {
    const { subscription } = await store.subscriptions.create(values);
    toast.show(`${subscription.name} added`);
    // Return to the Bills tab; it reloads its list when it comes into view.
    router.dismissTo('/subscriptions');
  };

  return (
    <Screen keyboard header={<AppHeader title="Add Subscription" />}>
      <SubscriptionForm onSubmit={handleSubmit} submitLabel="Save Subscription" />
    </Screen>
  );
}
