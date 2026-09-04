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

import { sendPasswordReset } from '../../src/data/auth';
import { useData } from '../../src/data/context';
import { useTranslator } from '../../src/i18n/hook';
import { useDirIcons } from '../../src/i18n/rtl';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SHADOW, SPACING } from '../../src/theme/tokens';

export default function ForgotPasswordScreen() {
  const { supabaseEnabled } = useData();
  const { t } = useTranslator();
  const dirIcons = useDirIcons();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit() {
    setError(null);
    setSent(false);
    setPending(true);
    try {
      const r = await sendPasswordReset(email);
      if (!r.ok) return setError(r.error ?? t('auth.error.somethingWrong'));
      setSent(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name={dirIcons.back} size={22} color={COLORS.ink900} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('auth.forgotPassword.header')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>{t('auth.forgotPassword.eyebrow')}</Text>
          <Text style={styles.title}>{t('auth.forgotPassword.titleShort')}</Text>
          <Text style={styles.subtitle}>{t('auth.forgotPassword.subtitleShort')}</Text>

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

          {error && <Text style={styles.error}>{error}</Text>}
          {sent && <Text style={styles.notice}>{t('auth.forgotPassword.checkInbox')}</Text>}

          <Pressable
            style={[styles.primary, (pending || !supabaseEnabled) && { opacity: 0.5 }]}
            onPress={submit}
            disabled={pending || !supabaseEnabled}
          >
            {pending ? (
              <ActivityIndicator color={COLORS.cream} />
            ) : (
              <Text style={styles.primaryText}>{t('auth.sendResetLink')}</Text>
            )}
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
  container: { padding: SPACING.lg },
  eyebrow: {
    color: COLORS.ink400,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  title: { fontFamily: FONTS.display, fontSize: FONT_SIZES.hero, color: COLORS.ink900, marginTop: 4 },
  subtitle: { fontFamily: FONTS.body, fontSize: FONT_SIZES.md, color: COLORS.ink500, marginTop: 6 },
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
});
