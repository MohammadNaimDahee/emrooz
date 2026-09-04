import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { pantryMatch } from '@emrooz/core';
import type { DietaryTag, Difficulty, MealType, RecipeSummary } from '@emrooz/types';

import { CuisineArt } from '../../src/components/CuisineArt';
import { useData } from '../../src/data/context';
import { useTranslator } from '../../src/i18n/hook';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SHADOW, SPACING } from '../../src/theme/tokens';

type SortMode = 'relevance' | 'time' | 'pantry';

const TIME_BUCKETS: { key: string; label: string; max: number }[] = [
  { key: 't20', label: '≤20', max: 20 },
  { key: 't30', label: '≤30', max: 30 },
  { key: 't45', label: '≤45', max: 45 },
  { key: 't60', label: '≤60', max: 60 },
];

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const MEALS: MealType[] = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'soup',
  'salad',
  'side',
  'dessert',
];
const DIETS: DietaryTag[] = ['vegetarian', 'vegan', 'halal', 'gluten_free', 'dairy_free'];

export default function Discover() {
  const { data, profile } = useData();
  const { t } = useTranslator();

  const [q, setQ] = useState('');
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [meal, setMeal] = useState<MealType | null>(null);
  const [diets, setDiets] = useState<DietaryTag[]>([]);
  const [pantryOnly, setPantryOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>('relevance');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const recipesQ = useQuery({
    queryKey: ['recipes-all'],
    queryFn: () => data.recipes.listPublished({ limit: 500 }),
  });
  const pantryQ = useQuery({
    queryKey: ['pantry', profile?.id],
    enabled: !!profile,
    queryFn: () => data.pantry.list(profile!.id),
  });

  const pantrySet = useMemo(
    () => new Set((pantryQ.data ?? []).map((p) => p.ingredientId)),
    [pantryQ.data],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const results = (recipesQ.data ?? [])
      .filter((r) => {
        if (maxMinutes !== null && r.totalMinutes > maxMinutes) return false;
        if (difficulty && r.difficulty !== difficulty) return false;
        if (meal && !r.mealTypes.includes(meal)) return false;
        for (const d of diets) if (!r.dietaryTags.includes(d)) return false;
        if (needle) {
          const hay = [r.title.en, r.description?.en ?? '', ...r.cuisineIds]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .map((r) => ({ recipe: r, matchRatio: pantryMatch(r, pantrySet).ratio }))
      .filter((x) => (pantryOnly ? x.matchRatio >= 0.6 : true));

    results.sort((a, b) => {
      if (sort === 'time') return a.recipe.totalMinutes - b.recipe.totalMinutes;
      if (sort === 'pantry') return b.matchRatio - a.matchRatio;
      if (needle) {
        const at = a.recipe.title.en.toLowerCase().indexOf(needle);
        const bt = b.recipe.title.en.toLowerCase().indexOf(needle);
        if (at !== bt) return at === -1 ? 1 : bt === -1 ? -1 : at - bt;
      }
      if (a.matchRatio !== b.matchRatio) return b.matchRatio - a.matchRatio;
      return a.recipe.title.en.localeCompare(b.recipe.title.en);
    });
    return results.map((x) => x.recipe);
  }, [recipesQ.data, q, maxMinutes, difficulty, meal, diets, sort, pantryOnly, pantrySet]);

  const activeFilterCount =
    (maxMinutes !== null ? 1 : 0) +
    (difficulty ? 1 : 0) +
    (meal ? 1 : 0) +
    diets.length +
    (pantryOnly ? 1 : 0);

  function toggleDiet(d: DietaryTag) {
    setDiets((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }
  function clearAll() {
    setMaxMinutes(null);
    setDifficulty(null);
    setMeal(null);
    setDiets([]);
    setPantryOnly(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>{t('discover.eyebrow')}</Text>
        <Text style={styles.title}>{t('discover.title')}</Text>

        <View style={styles.search}>
          <Ionicons name="search-outline" size={18} color={COLORS.ink400} />
          <TextInput
            placeholder={t('discover.search.placeholder')}
            placeholderTextColor={COLORS.ink400}
            value={q}
            onChangeText={setQ}
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>

        <View style={styles.filterBar}>
          <Pressable
            onPress={() => setFiltersOpen(true)}
            style={styles.filterBtn}
            accessibilityLabel={t('discover.openFilters')}
          >
            <Ionicons name="options-outline" size={16} color={COLORS.ink700} />
            <Text style={styles.filterBtnText}>{t('discover.filters')}</Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterCount}>
                <Text style={styles.filterCountText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>

          <View style={{ flex: 1 }} />

          <SortPicker sort={sort} onChange={setSort} />
        </View>

        <Text style={styles.resultCount}>
          {t(filtered.length === 1 ? 'discover.results.one' : 'discover.results.many', {
            count: filtered.length,
          })}
        </Text>

        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingBottom: SPACING.xxl }}
          renderItem={({ item }: { item: RecipeSummary }) => (
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push({ pathname: '/recipe/[slug]', params: { slug: item.slug } })
              }
            >
              <CuisineArt
                seed={item.cuisineIds[0] ?? item.slug}
                height={72}
                radius={RADIUS.md}
                style={{ width: 72 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowMeta}>
                  {item.mealTypes[0]
                    ? t(`discover.mealType.${item.mealTypes[0]}` as never)
                    : t('today.mealFallback')}
                </Text>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {item.title.en}
                </Text>
                <Text style={styles.rowSub}>
                  {t('discover.row.subtitle', {
                    minutes: item.totalMinutes,
                    difficulty: t(`recipe.difficulty.${item.difficulty}` as never),
                  })}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{t('discover.empty.title')}</Text>
              <Text style={styles.emptyBody}>{t('discover.empty.body')}</Text>
            </View>
          }
        />
      </View>

      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        maxMinutes={maxMinutes}
        difficulty={difficulty}
        meal={meal}
        diets={diets}
        pantryOnly={pantryOnly}
        onMaxMinutes={setMaxMinutes}
        onDifficulty={setDifficulty}
        onMeal={setMeal}
        onToggleDiet={toggleDiet}
        onPantryOnly={setPantryOnly}
        onClearAll={clearAll}
      />
    </SafeAreaView>
  );
}

function SortPicker({ sort, onChange }: { sort: SortMode; onChange: (s: SortMode) => void }) {
  const { t } = useTranslator();
  const options: { key: SortMode; labelKey: 'relevance' | 'time' | 'pantryMatch' }[] = [
    { key: 'relevance', labelKey: 'relevance' },
    { key: 'time', labelKey: 'time' },
    { key: 'pantry', labelKey: 'pantryMatch' },
  ];
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.key === sort)!;
  return (
    <View>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={styles.sortBtn}
        accessibilityLabel={t('discover.sortBy')}
      >
        <Text style={styles.sortBtnText}>{t(`discover.sort.${current.labelKey}` as never)}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.ink500} />
      </Pressable>
      {open && (
        <View style={styles.sortMenu}>
          {options.map((o) => (
            <Pressable
              key={o.key}
              onPress={() => {
                onChange(o.key);
                setOpen(false);
              }}
              style={styles.sortItem}
            >
              <Text style={styles.sortItemText}>{t(`discover.sort.${o.labelKey}` as never)}</Text>
              {o.key === sort && <Ionicons name="checkmark" size={14} color={COLORS.emerald700} />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function FilterSheet(props: {
  visible: boolean;
  onClose: () => void;
  maxMinutes: number | null;
  difficulty: Difficulty | null;
  meal: MealType | null;
  diets: DietaryTag[];
  pantryOnly: boolean;
  onMaxMinutes: (v: number | null) => void;
  onDifficulty: (v: Difficulty | null) => void;
  onMeal: (v: MealType | null) => void;
  onToggleDiet: (v: DietaryTag) => void;
  onPantryOnly: (v: boolean) => void;
  onClearAll: () => void;
}) {
  const { t } = useTranslator();
  return (
    <Modal transparent visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
      <Pressable style={styles.modalBackdrop} onPress={props.onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('discover.filters')}</Text>
              <Pressable onPress={props.onClearAll} hitSlop={8}>
                <Text style={styles.sheetClear}>{t('discover.clearAll')}</Text>
              </Pressable>
            </View>

            <FilterSection label={t('discover.filter.cookingTime')}>
              {TIME_BUCKETS.map((bucket) => (
                <Chip
                  key={bucket.key}
                  active={props.maxMinutes === bucket.max}
                  onPress={() =>
                    props.onMaxMinutes(props.maxMinutes === bucket.max ? null : bucket.max)
                  }
                >
                  {t('discover.filter.timeBucket', { minutes: bucket.max })}
                </Chip>
              ))}
            </FilterSection>

            <FilterSection label={t('discover.filter.difficulty')}>
              {DIFFICULTIES.map((d) => (
                <Chip
                  key={d}
                  active={props.difficulty === d}
                  onPress={() => props.onDifficulty(props.difficulty === d ? null : d)}
                >
                  {t(`recipe.difficulty.${d}` as never)}
                </Chip>
              ))}
            </FilterSection>

            <FilterSection label={t('discover.filter.mealType')}>
              {MEALS.map((m) => (
                <Chip
                  key={m}
                  active={props.meal === m}
                  onPress={() => props.onMeal(props.meal === m ? null : m)}
                >
                  {t(`discover.mealType.${m}` as never)}
                </Chip>
              ))}
            </FilterSection>

            <FilterSection label={t('discover.filter.dietary')}>
              {DIETS.map((d) => (
                <Chip
                  key={d}
                  active={props.diets.includes(d)}
                  onPress={() => props.onToggleDiet(d)}
                >
                  {t(`diet.${d}` as never)}
                </Chip>
              ))}
            </FilterSection>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>{t('discover.pantryOnly.label')}</Text>
                <Text style={styles.switchHint}>{t('discover.pantryOnly.hint')}</Text>
              </View>
              <Switch
                value={props.pantryOnly}
                onValueChange={props.onPantryOnly}
                trackColor={{ true: COLORS.emerald700, false: COLORS.ink100 }}
              />
            </View>

            <Pressable style={styles.doneBtn} onPress={props.onClose}>
              <Text style={styles.doneBtnText}>{t('discover.showRecipes')}</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: SPACING.md }}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.chipWrap}>{children}</View>
    </View>
  );
}

function Chip({
  active,
  onPress,
  children,
}: {
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  container: { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  eyebrow: {
    color: COLORS.ink400,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.xxl,
    color: COLORS.ink900,
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.ink100,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    ...SHADOW.soft,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.md,
    color: COLORS.ink900,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.ink100,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    backgroundColor: COLORS.white,
  },
  filterBtnText: { color: COLORS.ink700, fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm },
  filterCount: {
    backgroundColor: COLORS.emerald700,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterCountText: { color: COLORS.cream, fontFamily: FONTS.bodyBold, fontSize: FONT_SIZES.xs },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.ink100,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    backgroundColor: COLORS.white,
  },
  sortBtnText: { color: COLORS.ink700, fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm },
  sortMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    minWidth: 160,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.ink100,
    ...SHADOW.card,
    zIndex: 20,
  },
  sortItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  sortItemText: { color: COLORS.ink900, fontFamily: FONTS.body, fontSize: FONT_SIZES.sm },
  resultCount: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.ink500,
    fontSize: FONT_SIZES.sm,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    ...SHADOW.soft,
  },
  rowMeta: {
    color: COLORS.ink400,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  rowTitle: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.lg,
    color: COLORS.ink900,
    lineHeight: 22,
  },
  rowSub: { color: COLORS.ink500, marginTop: 2, fontFamily: FONTS.body, fontSize: FONT_SIZES.sm },

  empty: { marginTop: SPACING.xxl, alignItems: 'center' },
  emptyTitle: { fontFamily: FONTS.display, fontSize: FONT_SIZES.xl, color: COLORS.ink900 },
  emptyBody: { fontFamily: FONTS.body, color: COLORS.ink500, marginTop: SPACING.xs },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(29,29,27,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: SPACING.lg,
    maxHeight: '85%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.ink200,
    marginBottom: SPACING.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: { fontFamily: FONTS.display, fontSize: FONT_SIZES.xl, color: COLORS.ink900 },
  sheetClear: { color: COLORS.ink500, fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm },
  sectionLabel: {
    color: COLORS.ink400,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: SPACING.xs,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  switchLabel: { color: COLORS.ink900, fontFamily: FONTS.bodySemi, fontSize: FONT_SIZES.md },
  switchHint: { color: COLORS.ink500, fontFamily: FONTS.body, fontSize: FONT_SIZES.sm },
  doneBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.emerald700,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    ...SHADOW.card,
  },
  doneBtnText: { color: COLORS.cream, fontFamily: FONTS.bodySemi, fontSize: FONT_SIZES.md },
});
