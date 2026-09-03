import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SUPPORTED_LOCALES } from '@emrooz/types';
import type { Allergen, DietaryTag, Locale, UserPreferences } from '@emrooz/types';
import type { MessageKey } from '@emrooz/i18n';

import { useData } from '../../src/data/context';
import { useTranslator } from '../../src/i18n/hook';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SHADOW, SPACING } from '../../src/theme/tokens';

const CUISINE_OPTIONS: { id: string; label: string }[] = [
  { id: 'cu_afghan', label: 'Afghan' },
  { id: 'cu_italian', label: 'Italian' },
  { id: 'cu_japanese', label: 'Japanese' },
  { id: 'cu_mexican', label: 'Mexican' },
  { id: 'cu_indian', label: 'Indian' },
  { id: 'cu_turkish', label: 'Turkish' },
  { id: 'cu_vietnamese', label: 'Vietnamese' },
  { id: 'cu_french', label: 'French' },
  { id: 'cu_ethiopian', label: 'Ethiopian' },
  { id: 'cu_thai', label: 'Thai' },
  { id: 'cu_korean', label: 'Korean' },
  { id: 'cu_brazilian', label: 'Brazilian' },
  { id: 'cu_greek', label: 'Greek' },
  { id: 'cu_iranian', label: 'Iranian' },
  { id: 'cu_moroccan', label: 'Moroccan' },
  { id: 'cu_german', label: 'German' },
];

const TIME_OPTION_META: { value: number; labelKey: MessageKey; subKey: MessageKey }[] = [
  { value: 20, labelKey: 'onboarding.time.20', subKey: 'onboarding.time.sub.quick' },
  { value: 30, labelKey: 'onboarding.time.30', subKey: 'onboarding.time.sub.weeknight' },
  { value: 45, labelKey: 'onboarding.time.45', subKey: 'onboarding.time.sub.comfortable' },
  { value: 60, labelKey: 'onboarding.time.60', subKey: 'onboarding.time.sub.weekend' },
];

const DIET_OPTIONS: DietaryTag[] = [
  'vegetarian', 'vegan', 'pescatarian', 'halal', 'kosher',
  'gluten_free', 'dairy_free', 'egg_free', 'nut_free',
];

const ALLERGEN_OPTIONS: Allergen[] = [
  'gluten', 'dairy', 'egg', 'peanut', 'tree_nut', 'soy', 'sesame', 'fish', 'shellfish',
];

const LANG_OPTIONS: { code: Locale; label: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', dir: 'ltr' },
  { code: 'fa-AF', label: 'دری', dir: 'rtl' },
  { code: 'ps', label: 'پښتو', dir: 'rtl' },
];

const STEPS = ['Language', 'Cuisines', 'Household', 'Time', 'Diet', 'Allergies'] as const;

export default function Onboarding() {
  const { profile, setPreferences } = useData();
  const { t } = useTranslator();
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState<Locale>('en');
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [householdSize, setHouseholdSize] = useState(2);
  const [maxCookMinutes, setMaxCookMinutes] = useState<number | undefined>(45);
  const [dietary, setDietary] = useState<DietaryTag[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);

  const stepMeta = useMemo(
    () => [
      { title: t('onboarding.step.language'), hint: t('onboarding.step.language.subtitle') },
      { title: t('onboarding.step.cuisines'), hint: t('onboarding.step.cuisines.subtitle') },
      { title: t('onboarding.step.household'), hint: t('onboarding.step.household.subtitle') },
      { title: t('onboarding.step.time'), hint: t('onboarding.step.time.subtitle') },
      { title: t('onboarding.step.diet'), hint: t('onboarding.step.diet.subtitle') },
      { title: t('onboarding.step.allergies'), hint: t('onboarding.step.allergies.subtitle') },
    ],
    [t],
  );

  const isLast = step === STEPS.length - 1;

  async function finish() {
    if (!profile) return;
    const prefs: UserPreferences = {
      userId: profile.id,
      language,
      cuisineIds: cuisines,
      householdSize,
      maxCookMinutes,
      dietaryTags: dietary,
      allergens,
      dislikedIngredientIds: [],
      pantrySeedIngredientIds: [],
      onboardedAt: new Date().toISOString(),
    };
    await setPreferences(prefs);
    router.replace('/(tabs)/today');
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#F5EBD8', '#FBF6EC']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.brand}>{t('onboarding.brandTitle')}</Text>
          <Text style={styles.progress}>
            {t('onboarding.stepCounter', { current: step + 1, total: STEPS.length })}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{stepMeta[step]!.title}</Text>
          <Text style={styles.hint}>{stepMeta[step]!.hint}</Text>

          {STEPS[step] === 'Language' && (
            <View style={styles.gridTwo}>
              {LANG_OPTIONS.map((l) => (
                <ChoiceCard
                  key={l.code}
                  active={language === l.code}
                  onPress={() => {
                    if (SUPPORTED_LOCALES.includes(l.code)) setLanguage(l.code);
                  }}
                  title={l.label}
                  subtitle={l.code}
                  rtl={l.dir === 'rtl'}
                />
              ))}
            </View>
          )}

          {STEPS[step] === 'Cuisines' && (
            <View style={styles.chipWrap}>
              {CUISINE_OPTIONS.map((c) => (
                <Chip
                  key={c.id}
                  label={c.label}
                  active={cuisines.includes(c.id)}
                  onPress={() =>
                    setCuisines((prev) =>
                      prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                    )
                  }
                />
              ))}
            </View>
          )}

          {STEPS[step] === 'Household' && (
            <View style={styles.gridSix}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setHouseholdSize(n)}
                  style={[styles.numberBox, householdSize === n && styles.numberBoxActive]}
                >
                  <Text
                    style={[
                      styles.numberBoxText,
                      householdSize === n && styles.numberBoxTextActive,
                    ]}
                  >
                    {n === 6 ? '6+' : n}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {STEPS[step] === 'Time' && (
            <View style={styles.gridTwo}>
              {TIME_OPTION_META.map((m) => (
                <ChoiceCard
                  key={m.value}
                  active={maxCookMinutes === m.value}
                  onPress={() => setMaxCookMinutes(m.value)}
                  title={t(m.labelKey)}
                  subtitle={t(m.subKey)}
                />
              ))}
              <ChoiceCard
                active={maxCookMinutes === undefined}
                onPress={() => setMaxCookMinutes(undefined)}
                title={t('onboarding.time.noLimit')}
                subtitle={t('onboarding.time.sub.noLimit')}
              />
            </View>
          )}

          {STEPS[step] === 'Diet' && (
            <View style={styles.chipWrap}>
              {DIET_OPTIONS.map((d) => (
                <Chip
                  key={d}
                  label={t(`diet.${d}` as MessageKey)}
                  active={dietary.includes(d)}
                  onPress={() =>
                    setDietary((prev) =>
                      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
                    )
                  }
                />
              ))}
            </View>
          )}

          {STEPS[step] === 'Allergies' && (
            <View style={styles.chipWrap}>
              {ALLERGEN_OPTIONS.map((a) => (
                <Chip
                  key={a}
                  label={t(`allergen.${a}` as MessageKey)}
                  active={allergens.includes(a)}
                  onPress={() =>
                    setAllergens((prev) =>
                      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
                    )
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.actions}>
          <Pressable
            onPress={() => (step === 0 ? finish() : setStep(step - 1))}
            style={styles.ghost}
          >
            <Text style={styles.ghostText}>{step === 0 ? t('onboarding.skip') : t('onboarding.back')}</Text>
          </Pressable>
          {!isLast ? (
            <Pressable onPress={() => setStep(step + 1)} style={styles.primary}>
              <Text style={styles.primaryText}>{t('onboarding.next')}</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.cream} />
            </Pressable>
          ) : (
            <Pressable onPress={finish} style={[styles.primary, { backgroundColor: COLORS.saffron500 }]}>
              <Text style={[styles.primaryText, { color: COLORS.ink900 }]}>{t('onboarding.finish')}</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.ink900} />
            </Pressable>
          )}
        </SafeAreaView>
      </SafeAreaView>
    </View>
  );
}

function ChoiceCard({
  active,
  onPress,
  title,
  subtitle,
  rtl,
}: {
  active: boolean;
  onPress: () => void;
  title: string;
  subtitle: string;
  rtl?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, active && styles.choiceActive]}>
      <Text style={[styles.choiceTitle, rtl && { writingDirection: 'rtl' as const }]}>{title}</Text>
      <Text style={styles.choiceSub}>{subtitle}</Text>
    </Pressable>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {active && <Ionicons name="checkmark" size={14} color={COLORS.cream} />}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  brand: { fontFamily: FONTS.display, fontSize: FONT_SIZES.xl, color: COLORS.emerald700 },
  progress: { fontFamily: FONTS.bodyMedium, color: COLORS.ink400, fontSize: FONT_SIZES.sm },
  progressTrack: {
    height: 3,
    marginHorizontal: SPACING.lg,
    borderRadius: 2,
    backgroundColor: COLORS.ink100,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.emerald700 },
  container: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  title: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.hero,
    color: COLORS.ink900,
    lineHeight: 40,
    marginTop: SPACING.md,
  },
  hint: {
    color: COLORS.ink500,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },

  gridTwo: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  gridSix: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  numberBox: {
    width: '30%',
    aspectRatio: 1.2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.ink100,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
  numberBoxActive: { backgroundColor: COLORS.emerald700, borderColor: COLORS.emerald700 },
  numberBoxText: { fontFamily: FONTS.display, fontSize: FONT_SIZES.xxl, color: COLORS.ink900 },
  numberBoxTextActive: { color: COLORS.cream },

  choice: {
    minWidth: '46%',
    flexGrow: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.ink100,
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    ...SHADOW.soft,
  },
  choiceActive: { borderColor: COLORS.emerald700, backgroundColor: COLORS.emerald50 },
  choiceTitle: { fontFamily: FONTS.display, fontSize: FONT_SIZES.xl, color: COLORS.ink900 },
  choiceSub: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.ink400,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.ink100,
    backgroundColor: COLORS.white,
    minHeight: 40,
  },
  chipActive: { backgroundColor: COLORS.emerald700, borderColor: COLORS.emerald700 },
  chipText: {
    color: COLORS.ink900,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.sm,
    textTransform: 'capitalize',
  },
  chipTextActive: { color: COLORS.cream },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
  },
  ghost: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  ghostText: { color: COLORS.ink500, fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.md },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.emerald700,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.pill,
    minHeight: 48,
    ...SHADOW.card,
  },
  primaryText: { color: COLORS.cream, fontFamily: FONTS.bodySemi, fontSize: FONT_SIZES.md },
});
