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

import { useData } from '../../src/data/context';
import { sendMagicLink, signInWithPassword } from '../../src/data/auth';
import { useTranslator } from '../../src/i18n/hook';
import { useDirIcons } from '../../src/i18n/rtl';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SHADOW, SPACING } from '../../src/theme/tokens';

type Mode = 'password' | 'magic';

export default function SignInScreen() {
  const { supabaseEnabled } = useData();
  const { t } = useTranslator();
  const dirIcons = useDirIcons();
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      if (mode === 'password') {
        const r = await signInWithPassword(email, password);
        if (!r.ok) return setError(r.error ?? t('auth.error.signInFailed'));
        router.replace('/(tabs)/today');
      } else {
        const r = await sendMagicLink(email);
        if (!r.ok) return setError(r.error ?? t('auth.error.magicLinkFailed'));
        setNotice(t('auth.magicLink.sent', { email }));
      }
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
        <Text style={styles.headerTitle}>{t('auth.signIn.header')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>{t('auth.signIn.eyebrow')}</Text>
          <Text style={styles.title}>{t('auth.signIn.header')}</Text>
          <Text style={styles.subtitle}>{t('auth.signIn.subtitleShort')}</Text>

          {!supabaseEnabled && (
            <View style={styles.disabledCard}>
              <Text style={styles.disabledText}>{t('auth.signIn.disabledHint')}</Text>
            </View>
          )}

          <View style={styles.modeRow}>
            {(['password', 'magic'] as Mode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              >
                <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
                  {m === 'password' ? t('auth.signIn.mode.password') : t('auth.signIn.mode.magic')}
                </Text>
              </Pressable>
            ))}
          </View>

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

          {mode === 'password' && (
            <>
              <Text style={styles.label}>{t('auth.password')}</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
                style={styles.input}
              />
              <Pressable onPress={() => router.push('/auth/forgot-password')} hitSlop={8}>
                <Text style={styles.forgot}>{t('auth.forgotPassword.link')}</Text>
              </Pressable>
            </>
          )}

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
              <Text style={styles.primaryText}>
                {mode === 'password' ? t('action.signIn') : t('auth.sendMagicLink')}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.replace('/auth/sign-up')} hitSlop={8}>
            <Text style={styles.link}>
              {t('auth.signIn.newHerePrefix')}
              <Text style={styles.linkStrong}>{t('auth.signIn.createAccountLink')}</Text>
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
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.md,
    color: COLORS.ink500,
    marginTop: 6,
  },
  disabledCard: {
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.ink100,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
  },
  disabledText: { fontFamily: FONTS.body, color: COLORS.ink500, fontSize: FONT_SIZES.sm },
  modeRow: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignSelf: 'flex-start',
    padding: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.ink100,
    backgroundColor: COLORS.white,
    gap: 4,
  },
  modeBtn: { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.pill },
  modeBtnActive: { backgroundColor: COLORS.emerald700 },
  modeText: { color: COLORS.ink700, fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm },
  modeTextActive: { color: COLORS.cream },
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
  forgot: {
    marginTop: SPACING.xs,
    color: COLORS.emerald700,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.sm,
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
