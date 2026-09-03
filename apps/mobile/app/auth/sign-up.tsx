import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signUp } from '../../src/data/auth';
import { useData } from '../../src/data/context';
import { useTranslator } from '../../src/i18n/hook';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SHADOW, SPACING } from '../../src/theme/tokens';

export default function SignUpScreen() {
  const { supabaseEnabled } = useData();
  const { t } = useTranslator();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setError(null);
    setNotice(null);
    if (password.length < 8) return setError(t('auth.error.shortPassword'));
    setPending(true);
    try {
      const r = await signUp(email, password);
      if (!r.ok) return setError(r.error ?? t('auth.error.signUpFailed'));
      if (r.needsVerification) {
        setNotice(t('auth.signUp.confirmationSent', { email }));
      } else {
        router.replace('/(tabs)/today');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink900} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('auth.signUp.header')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>{t('auth.signUp.eyebrow')}</Text>
          <Text style={styles.title}>{t('auth.signUp.titleShort')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.signUp.subtitleShort')}
          </Text>

          {!supabaseEnabled && (
            <View style={styles.disabledCard}>
              <Text style={styles.disabledText}>
                {t('auth.signUp.disabledHint')}
              </Text>
            </View>
          )}

          <Text style={styles.label}>{t('auth.email')}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            style={styles.input}
            placeholder={t('auth.email.placeholder')}
            placeholderTextColor={COLORS.ink400}
          />

          <Text style={styles.label}>{t('auth.password')}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            style={styles.input}
          />
          <Text style={styles.hint}>{t('auth.signUp.passwordHint')}</Text>

          {error && <Text style={styles.error}>{error}</Text>}
          {notice && <Text style={styles.notice}>{notice}</Text>}

          <Pressable
            style={[styles.primary, (pending || !supabaseEnabled) && { opacity: 0.5 }]}
            onPress={submit}
            disabled={pending || !supabaseEnabled}
          >
            {pending ? (
              <ActivityIndicator color={COLORS.cream} />
            ) : (
              <Text style={styles.primaryText}>{t('action.signUp')}</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.replace('/auth/sign-in')} hitSlop={8}>
            <Text style={styles.link}>
              {t('auth.signUp.alreadyHavePrefix')}
              <Text style={styles.linkStrong}>{t('auth.signUp.signInLink')}</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONTS.bodySemi, color: COLORS.ink900, fontSize: FONT_SIZES.md },
  container: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  eyebrow: {
    color: COLORS.ink400,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.hero,
    color: COLORS.ink900,
    marginTop: 4,
    lineHeight: 40,
  },
  subtitle: { fontFamily: FONTS.body, fontSize: FONT_SIZES.md, color: COLORS.ink500, marginTop: 6 },
  disabledCard: {
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.ink100,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
  },
  disabledText: { fontFamily: FONTS.body, color: COLORS.ink500, fontSize: FONT_SIZES.sm },
  label: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.ink700,
    fontSize: FONT_SIZES.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.ink100,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.md,
    color: COLORS.ink900,
  },
  hint: {
    marginTop: SPACING.xs,
    color: COLORS.ink400,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.xs,
  },
  error: {
    marginTop: SPACING.md,
    color: COLORS.danger,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.sm,
    backgroundColor: 'rgba(178,58,72,0.10)',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
  },
  notice: {
    marginTop: SPACING.md,
    color: COLORS.emerald700,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.sm,
    backgroundColor: COLORS.emerald50,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
  },
  primary: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.emerald700,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    ...SHADOW.card,
  },
  primaryText: { color: COLORS.cream, fontFamily: FONTS.bodySemi, fontSize: FONT_SIZES.md },
  link: {
    marginTop: SPACING.lg,
    textAlign: 'center',
    color: COLORS.ink500,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.sm,
  },
  linkStrong: { color: COLORS.emerald700, fontFamily: FONTS.bodySemi },
});
