import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Allergen, DietaryTag, Locale, UserPreferences } from '@emrooz/types';

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { signOut } from '../src/data/auth';
import { useData } from '../src/data/context';
import { getSupabase } from '../src/data/supabase';
import { useTranslator } from '../src/i18n/hook';
import { useDirIcons } from '../src/i18n/rtl';
import { scheduleDailyReminder, cancelDailyReminder } from '../src/notifications/reminder';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SHADOW, SPACING } from '../src/theme/tokens';

const LANGS: { code: Locale; label: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', dir: 'ltr' },
  { code: 'fa-AF', label: 'دری', dir: 'rtl' },
  { code: 'ps', label: 'پښتو', dir: 'rtl' },
];
const DIETS: DietaryTag[] = [
  'vegetarian',
  'vegan',
  'pescatarian',
  'halal',
  'kosher',
  'gluten_free',
  'dairy_free',
  'egg_free',
  'nut_free',
];
const ALLERGENS: Allergen[] = [
  'gluten',
  'dairy',
  'egg',
  'peanut',
  'tree_nut',
  'soy',
  'sesame',
  'fish',
  'shellfish',
];

export default function SettingsScreen() {
  const { data, profile, preferences, setPreferences, supabaseEnabled } = useData();
  const { t } = useTranslator();
  const dirIcons = useDirIcons();
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseEnabled) return;
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setAccountEmail(data.user?.email ?? null));
  }, [supabaseEnabled, profile?.id]);

  const [language, setLanguage] = useState<Locale>('en');
  const [household, setHousehold] = useState('2');
  const [maxCookMinutes, setMaxCookMinutes] = useState<number | undefined>(undefined);
  const [diets, setDiets] = useState<DietaryTag[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderTime, setReminderTime] = useState('17:00');

  useEffect(() => {
    if (!preferences) return;
    setLanguage(preferences.language);
    setHousehold(String(preferences.householdSize));
    setMaxCookMinutes(preferences.maxCookMinutes);
    setDiets(preferences.dietaryTags);
    setAllergens(preferences.allergens);
    setReminderOn(preferences.reminder?.enabled ?? false);
    setReminderTime(preferences.reminder?.time ?? '17:00');
  }, [preferences]);

  function toggle<T>(v: T, list: T[], setter: (l: T[]) => void) {
    setter(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  async function apply() {
    if (!profile) return;
    const next: UserPreferences = {
      userId: profile.id,
      language,
      cuisineIds: preferences?.cuisineIds ?? [],
      householdSize: Math.max(1, Number.parseInt(household, 10) || 1),
      maxCookMinutes,
      dietaryTags: diets,
      allergens,
      dislikedIngredientIds: preferences?.dislikedIngredientIds ?? [],
      pantrySeedIngredientIds: preferences?.pantrySeedIngredientIds ?? [],
      preferredDifficulty: preferences?.preferredDifficulty,
      reminder: { enabled: reminderOn, time: reminderTime },
      onboardedAt: preferences?.onboardedAt ?? new Date().toISOString(),
    };
    await setPreferences(next);
    if (reminderOn) {
      try {
        await scheduleDailyReminder(reminderTime);
      } catch (err) {
        Alert.alert(t('settings.reminders.error.title'), String(err));
      }
    } else {
      await cancelDailyReminder();
    }
    Alert.alert(t('settings.saved.title'), t('settings.saved.body'));
  }

  async function exportData() {
    if (!profile) return;

    // Assemble a snapshot from whichever adapter is active. In Supabase mode
    // this fetches the user's rows via their session (RLS-scoped); in demo
    // mode it reads the in-memory adapter.
    const [prefsC, pantry, favorites, history, feedback, planner, list] = await Promise.all([
      data.preferences.get(profile.id),
      data.pantry.list(profile.id),
      data.favorites.list(profile.id),
      data.history.list(profile.id),
      data.feedback.list(profile.id),
      data.planner.listForRange(profile.id, '1970-01-01', '2999-12-31'),
      data.shoppingList.list(profile.id),
    ]);
    const payload = {
      emroozExport: { version: 1, generatedAt: new Date().toISOString(), userId: profile.id },
      profile,
      preferences: prefsC,
      pantryItems: pantry,
      favorites,
      cookingHistory: history,
      recommendationFeedback: feedback,
      mealPlanEntries: planner,
      shoppingListItems: list,
    };

    const filename = `emrooz-export-${new Date().toISOString().slice(0, 10)}.json`;
    const uri = FileSystem.cacheDirectory + filename;
    try {
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/json',
          UTI: 'public.json',
          dialogTitle: t('settings.export.dialogTitle'),
        });
      } else {
        Alert.alert(t('settings.export.savedTitle'), t('settings.export.savedBody', { uri }));
      }
    } catch (err) {
      Alert.alert(t('settings.export.failedTitle'), String(err));
    }
  }

  function confirmDelete() {
    if (!profile) return;
    if (supabaseEnabled) {
      Alert.prompt?.(
        t('settings.delete.account.title'),
        t('settings.delete.account.body'),
        [
          { text: t('action.cancel'), style: 'cancel' },
          {
            text: t('action.delete'),
            style: 'destructive',
            onPress: async (input) => {
              if (input !== 'DELETE') {
                Alert.alert(
                  t('settings.delete.cancelled.title'),
                  t('settings.delete.cancelled.body'),
                );
                return;
              }
              const supabase = getSupabase();
              if (!supabase) return;
              const { data: sessionData } = await supabase.auth.getSession();
              const token = sessionData.session?.access_token;
              // Read EXPO_PUBLIC_EMROOZ_BASE_URL via globalThis so we don't
              // need @types/node in the mobile compilation.
              const env =
                (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
                  ?.env ?? {};
              const url = env.EXPO_PUBLIC_EMROOZ_BASE_URL ?? 'https://emroozapp.com';
              try {
                const res = await fetch(`${url}/api/account/delete`, {
                  method: 'POST',
                  headers: {
                    'content-type': 'application/json',
                    ...(token ? { authorization: `Bearer ${token}` } : {}),
                  },
                  body: JSON.stringify({ confirm: 'DELETE' }),
                });
                if (!res.ok) {
                  const body = await res.json().catch(() => ({}));
                  Alert.alert(
                    t('settings.delete.failed.title'),
                    body.error ?? `HTTP ${res.status}`,
                  );
                  return;
                }
                router.replace('/onboarding');
              } catch (err) {
                Alert.alert(t('settings.delete.failed.title'), String(err));
              }
            },
          },
        ],
        'plain-text',
      );
      return;
    }

    Alert.alert(t('settings.delete.local.title'), t('settings.delete.local.body'), [
      { text: t('action.cancel'), style: 'cancel' },
      {
        text: t('action.delete'),
        style: 'destructive',
        onPress: async () => {
          await data.pantry.clear(profile.id);
          await data.shoppingList.clear(profile.id);
          for (const h of await data.history.list(profile.id))
            await data.history.remove(profile.id, h.id);
          for (const f of await data.favorites.list(profile.id))
            await data.favorites.remove(profile.id, f.recipeId);
          for (const p of await data.planner.listForRange(profile.id, '1970-01-01', '2999-12-31')) {
            await data.planner.remove(profile.id, p.id);
          }
          router.replace('/onboarding');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityLabel={t('action.back')}
        >
          <Ionicons name={dirIcons.back} size={22} color={COLORS.ink900} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {supabaseEnabled && (
          <View style={styles.accountCard}>
            <Text style={styles.accountEyebrow}>{t('settings.account.title')}</Text>
            {accountEmail ? (
              <>
                <View style={styles.accountRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(accountEmail[0] ?? '?').toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.accountEmail} numberOfLines={1}>
                      {accountEmail}
                    </Text>
                    <Text style={styles.accountHint}>{t('settings.account.signedInHint')}</Text>
                  </View>
                </View>
                <Pressable
                  style={styles.signOutBtn}
                  onPress={() =>
                    Alert.alert(
                      t('settings.account.signOut.title'),
                      t('settings.account.signOut.body'),
                      [
                        { text: t('action.cancel'), style: 'cancel' },
                        {
                          text: t('action.signOut'),
                          style: 'destructive',
                          onPress: async () => {
                            await signOut();
                            router.replace('/onboarding');
                          },
                        },
                      ],
                    )
                  }
                >
                  <Text style={styles.signOutText}>{t('action.signOut')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.accountHint}>{t('settings.account.guestHint')}</Text>
                <View style={{ flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.sm }}>
                  <Pressable
                    style={styles.primarySmall}
                    onPress={() => router.push('/auth/sign-in')}
                  >
                    <Text style={styles.primarySmallText}>{t('action.signIn')}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.secondarySmall}
                    onPress={() => router.push('/auth/sign-up')}
                  >
                    <Text style={styles.secondarySmallText}>{t('action.signUp')}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}

        <Section title={t('settings.language')}>
          <View style={styles.row}>
            {LANGS.map((l) => (
              <Chip
                key={l.code}
                active={language === l.code}
                onPress={() => setLanguage(l.code)}
                label={l.label}
              />
            ))}
          </View>
        </Section>

        <Section title={t('settings.household.title')}>
          <View style={styles.rowGap}>
            <TextInput
              value={household}
              onChangeText={setHousehold}
              keyboardType="numeric"
              maxLength={2}
              style={styles.input}
            />
            <Text style={styles.dim}>{t('settings.household.people')}</Text>
          </View>
        </Section>

        <Section title={t('settings.time.title')}>
          <View style={styles.row}>
            {[20, 30, 45, 60].map((m) => (
              <Chip
                key={m}
                active={maxCookMinutes === m}
                onPress={() => setMaxCookMinutes(m)}
                label={t('today.timeMin', { count: m })}
              />
            ))}
            <Chip
              active={maxCookMinutes === undefined}
              onPress={() => setMaxCookMinutes(undefined)}
              label={t('settings.time.noLimit')}
            />
          </View>
        </Section>

        <Section title={t('settings.diet')}>
          <View style={styles.row}>
            {DIETS.map((d) => (
              <Chip
                key={d}
                active={diets.includes(d)}
                onPress={() => toggle(d, diets, setDiets)}
                label={t(`diet.${d}` as never)}
              />
            ))}
          </View>
        </Section>

        <Section title={t('settings.allergies')}>
          <View style={styles.row}>
            {ALLERGENS.map((a) => (
              <Chip
                key={a}
                active={allergens.includes(a)}
                onPress={() => toggle(a, allergens, setAllergens)}
                label={t(`allergen.${a}` as never)}
              />
            ))}
          </View>
        </Section>

        <Section title={t('settings.reminders')}>
          <View style={styles.rowGap}>
            <Switch
              value={reminderOn}
              onValueChange={setReminderOn}
              trackColor={{ true: COLORS.emerald700, false: COLORS.ink100 }}
            />
            <TextInput
              value={reminderTime}
              onChangeText={setReminderTime}
              editable={reminderOn}
              placeholder="HH:mm"
              placeholderTextColor={COLORS.ink400}
              style={[styles.input, !reminderOn && { opacity: 0.4 }]}
            />
          </View>
          <Text style={styles.hint}>{t('settings.reminders.permissionHint')}</Text>
        </Section>

        <Pressable style={styles.saveBtn} onPress={apply}>
          <Text style={styles.saveBtnText}>{t('settings.save')}</Text>
        </Pressable>

        <Section title={t('settings.data.title')}>
          <View style={styles.row}>
            <Pressable style={styles.secondaryBtn} onPress={exportData}>
              <Ionicons name="download-outline" size={16} color={COLORS.emerald700} />
              <Text style={styles.secondaryBtnText}>{t('settings.data.exportBtn')}</Text>
            </Pressable>
            <Pressable style={styles.dangerBtn} onPress={confirmDelete}>
              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
              <Text style={styles.dangerBtnText}>{t('settings.data.deleteBtn')}</Text>
            </Pressable>
          </View>
        </Section>

        <Pressable
          style={styles.link}
          onPress={() => router.push('/history')}
          accessibilityRole="button"
        >
          <Ionicons name="time-outline" size={16} color={COLORS.emerald700} />
          <Text style={styles.linkText}>{t('settings.data.viewHistory')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Chip({ active, onPress, label }: { active: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
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
  headerTitle: { fontFamily: FONTS.bodySemi, fontSize: FONT_SIZES.md, color: COLORS.ink900 },
  container: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    ...SHADOW.soft,
  },
  sectionTitle: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.lg,
    color: COLORS.ink900,
    marginBottom: SPACING.sm,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  input: {
    borderWidth: 1,
    borderColor: COLORS.ink100,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.md,
    color: COLORS.ink900,
    minWidth: 80,
  },
  dim: { color: COLORS.ink500, fontFamily: FONTS.body },
  hint: {
    color: COLORS.ink500,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
  chip: {
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.ink100,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: COLORS.emerald700, borderColor: COLORS.emerald700 },
  chipText: {
    color: COLORS.ink900,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.sm,
    textTransform: 'capitalize',
  },
  chipTextActive: { color: COLORS.cream },
  accountCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    ...SHADOW.soft,
  },
  accountEyebrow: {
    color: COLORS.ink400,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
  },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.emerald700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.cream, fontFamily: FONTS.bodyBold, fontSize: FONT_SIZES.md },
  accountEmail: { color: COLORS.ink900, fontFamily: FONTS.bodySemi, fontSize: FONT_SIZES.md },
  accountHint: {
    color: COLORS.ink500,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  signOutBtn: {
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(178,58,72,0.35)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  signOutText: { color: COLORS.danger, fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm },
  primarySmall: {
    backgroundColor: COLORS.emerald700,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  primarySmallText: { color: COLORS.cream, fontFamily: FONTS.bodySemi, fontSize: FONT_SIZES.sm },
  secondarySmall: {
    borderWidth: 1,
    borderColor: COLORS.ink100,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
  },
  secondarySmallText: {
    color: COLORS.ink900,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.sm,
  },
  saveBtn: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.emerald700,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    ...SHADOW.card,
  },
  saveBtnText: { color: COLORS.cream, fontFamily: FONTS.bodySemi, fontSize: FONT_SIZES.md },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.ink100,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
  },
  secondaryBtnText: {
    color: COLORS.emerald700,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.sm,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: 'rgba(178,58,72,0.35)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
  },
  dangerBtnText: { color: COLORS.danger, fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm },
  link: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    ...SHADOW.soft,
  },
  linkText: { color: COLORS.emerald700, fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.md },
});
