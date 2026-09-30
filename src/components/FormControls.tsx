import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableStateCallbackType,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors, fonts } from '../theme';
import { AppText } from './AppText';

type FieldProps = { label: string; hint?: string; required?: boolean; style?: StyleProp<ViewStyle>; children: ReactNode };

export function Field({ label, hint, required, style, children }: FieldProps) {
  return (
    <View style={style}>
      <AppText style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
        {hint && <Text style={styles.hint}> {hint}</Text>}
      </AppText>
      {children}
    </View>
  );
}

type InputProps = Omit<TextInputProps, 'onSubmitEditing' | 'multiline' | 'numberOfLines' | 'style'> & {
  label: string;
  required?: boolean;
  rows?: number;
  onSubmit?: () => void;
};

export function FormInput({ label, required, rows, onSubmit, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  const multiline = !!rows;
  return (
    <TextInput
      autoComplete="off"
      autoCorrect={false}
      {...rest}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onSubmitEditing={multiline ? undefined : onSubmit}
      accessibilityLabel={label}
      aria-required={required || undefined}
      multiline={multiline}
      numberOfLines={rows}
      style={[styles.input, multiline ? styles.textarea : styles.singleLine, focused && styles.inputFocus]}
    />
  );
}

function hovered(state: PressableStateCallbackType): boolean {
  return !!(state as PressableStateCallbackType & { hovered?: boolean }).hovered;
}

type ButtonProps = {
  label: string;
  variant?: 'primary' | 'ghost';
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function FormButton({ label, variant = 'primary', onPress, disabled, style }: ButtonProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={(state) => [
        styles.button,
        primary ? styles.primary : styles.ghost,
        primary && hovered(state) && styles.primaryHover,
        disabled && styles.disabled,
        style,
      ]}
    >
      <AppText style={[styles.buttonText, primary ? styles.primaryText : styles.ghostText]}>{label}</AppText>
    </Pressable>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <AppText role="alert" style={styles.error}>
      {message}
    </AppText>
  );
}

export const formStyles = StyleSheet.create({
  // 그리드(단어 폼)에서 필드가 행을 나눠 갖는 레이아웃.
  gridField: { flex: 1, minWidth: 0 },
});

const styles = StyleSheet.create({
  label: { marginBottom: 7, marginLeft: 2, fontSize: 13, fontWeight: '700' },
  required: { color: colors.accent },
  hint: { color: colors.muted, fontSize: 10.8, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: '#dfe4ea',
    borderRadius: 14,
    backgroundColor: '#fafbfc',
    paddingVertical: 12,
    paddingHorizontal: 13,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    outlineWidth: 0,
  },
  singleLine: { height: 47 },
  // 원본의 textarea는 inline-block이라 아래에 4px 줄 여백이 생긴다.
  textarea: { textAlignVertical: 'top', marginBottom: 4 },
  inputFocus: { borderColor: colors.accent, backgroundColor: '#fff', boxShadow: '0 0 0 3px rgba(23, 111, 242, 0.1)' },
  button: { minHeight: 47, paddingHorizontal: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 14, fontWeight: '700' },
  ghost: { backgroundColor: '#eef1f5' },
  ghostText: { color: '#5d6673' },
  primary: { backgroundColor: colors.accent },
  primaryHover: { backgroundColor: colors.accentDark },
  primaryText: { color: '#fff' },
  disabled: { opacity: 0.6 },
  error: { marginTop: 12, marginLeft: 2, color: colors.danger, fontSize: 13 },
});
