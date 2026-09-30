import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ApiError } from '../api/client';
import { digitsOnly, validateName, validatePhoneLast4 } from '../auth/validate';
import { colors } from '../theme';
import { AppText } from './AppText';
import { Field, FormButton, FormError, FormInput } from './FormControls';

type Props = {
  submitLabel: string;
  onSubmit: (name: string, phoneLast4: string) => Promise<void>;
  linkLabel: string;
  linkHref: Href;
};

export function CredentialsForm({ submitLabel, onSubmit, linkLabel, linkHref }: Props) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const submit = async () => {
    if (busy.current) return;
    const invalid = validateName(name) ?? validatePhoneLast4(pin);
    if (invalid) {
      setError(invalid);
      return;
    }
    busy.current = true;
    setPending(true);
    setError('');
    try {
      await onSubmit(name, pin);
    } catch (e) {
      if (mounted.current) setError(e instanceof ApiError ? e.message : '요청에 실패했어요');
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  };

  return (
    <View>
      <View style={styles.fields}>
        <Field label="이름">
          <FormInput label="이름" value={name} onChangeText={setName} onSubmit={submit} placeholder="예: 김민준" />
        </Field>
        <Field label="휴대폰 번호 뒤 4자리">
          <FormInput
            label="휴대폰 번호 뒤 4자리"
            value={pin}
            onChangeText={(value) => setPin(digitsOnly(value))}
            onSubmit={submit}
            placeholder="1234"
            inputMode="numeric"
            maxLength={4}
            secureTextEntry
            autoComplete="off"
          />
        </Field>
      </View>
      <FormError message={error} />
      <FormButton label={submitLabel} onPress={submit} disabled={pending} style={styles.submit} />
      <Pressable accessibilityRole="link" onPress={() => router.replace(linkHref)} style={styles.link}>
        <AppText style={styles.linkText}>{linkLabel}</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { rowGap: 14 },
  submit: { marginTop: 18 },
  link: { alignSelf: 'center', marginTop: 8, paddingVertical: 10, paddingHorizontal: 8 },
  linkText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
});
