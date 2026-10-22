// Edit profile: change your name. The email is your Firebase login, so it is
// shown but not edited here.
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import Screen from '../components/Screen';
import AppHeader from '../components/AppHeader';
import TextField from '../components/TextField';
import AppButton from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { store } from '../services/store';
import { colors, spacing } from '../constants/theme';
import { compact, validateName } from '../utils/validation';

export default function EditProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
    const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const found = compact({ name: validateName(name, 'Full name') });
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      const { user: updated } = await store.auth.updateMe({ name: name.trim() });
      setUser(updated);
      toast.show('Profile updated');
      router.back();
    } catch (error) {
      if (error.details) setErrors(error.details);
      setFormError(error.message);
      setSaving(false);
    }
  };

  return (
    <Screen keyboard header={<AppHeader title="Edit Profile" />}>
      <TextField label="Full name" value={name} onChangeText={setName} error={errors.name} icon="person-outline" maxLength={60} />
      <TextField
        label="Email"
        value={user?.email || ''}
        editable={false}
        helper="Your email is your login and cannot be changed here."
        icon="mail-outline"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <AppButton title="Save Profile" icon="checkmark" onPress={save} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.error, textAlign: 'center', marginTop: spacing.xs },
});
