import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { addDays, missingIngredientsFor, startOfWeek, toIsoDate } from '@emrooz/core';
import type { MealPlanEntry, Recipe, RecipeSummary } from '@emrooz/types';

import { CuisineArt } from '../../src/components/CuisineArt';
import { useData } from '../../src/data/context';
import { useTranslator } from '../../src/i18n/hook';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SHADOW, SPACING } from '../../src/theme/tokens';

const MEALS = ['breakfast', 'lunch', 'dinner'] as const;
type Meal = (typeof MEALS)[number];
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export default function Planner() {
  const { data, profile } = useData();
  const { t } = useTranslator();
  const client = useQueryClient();

  const [weekStart, setWeekStart] = useState<string>(() => startOfWeek(toIsoDate()));
  const [picker, setPicker] = useState<{ date: string; meal: Meal } | null>(null);

  const weekEnd = addDays(weekStart, 6);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const entriesQ = useQuery({
    queryKey: ['planner', profile?.id, weekStart, weekEnd],
    enabled: !!profile,
    queryFn: () => data.planner.listForRange(profile!.id, weekStart, weekEnd),
  });
  const recipesQ = useQuery({
    queryKey: ['recipes-all'],
    queryFn: () => data.recipes.listPublished({ limit: 500 }),
  });
  const summariesQ = useQuery({
    queryKey: ['recipes-summaries-all'],
    queryFn: () => data.recipes.listSummaries({ limit: 500 }),
  });
  const pantryQ = useQuery({
    queryKey: ['pantry', profile?.id],
    enabled: !!profile,
    queryFn: () => data.pantry.list(profile!.id),
  });

  const recipesById = useMemo(
    () => new Map((recipesQ.data ?? []).map((r) => [r.id, r] as const)),
    [recipesQ.data],
  );

  const entriesBySlot = useMemo(() => {
    const map = new Map<string, MealPlanEntry>();
    for (const e of entriesQ.data ?? []) map.set(`${e.date}::${e.meal}`, e);
    return map;
  }, [entriesQ.data]);

  const assign = useMutation({
    mutationFn: async (v: { date: string; meal: Meal; recipeId: string }) => {
      if (!profile) return;
      const existing = entriesBySlot.get(`${v.date}::${v.meal}`);
      if (existing) await data.planner.remove(profile.id, existing.id);
      await data.planner.upsert({
        id: `mp_${Math.random().toString(36).slice(2)}`,
        userId: profile.id,
        date: v.date,
        meal: v.meal,
        recipeId: v.recipeId,
        servings: 2,
        createdAt: new Date().toISOString(),
      });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['planner'] }),
  });

  const clearSlot = useMutation({
    mutationFn: async (entryId: string) => {
      if (!profile) return;
      await data.planner.remove(profile.id, entryId);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['planner'] }),
  });

  const addWeekToShoppingList = useMutation({
    mutationFn: async () => {
      if (!profile) return 0;
      const weekRecipes = (entriesQ.data ?? [])
        .map((e) => recipesById.get(e.recipeId))
        .filter((r): r is Recipe => Boolean(r));
      const pantrySet = new Set((pantryQ.data ?? []).map((p) => p.ingredientId));
      const missing = missingIngredientsFor(weekRecipes, pantrySet);
      const existing = await data.shoppingList.list(profile.id);
      const existingByIngredient = new Map(
        existing.filter((i) => i.ingredientId).map((i) => [i.ingredientId!, i]),
      );
      const now = new Date().toISOString();
      let added = 0;
      for (const ingredientId of missing) {
        if (existingByIngredient.has(ingredientId)) continue;
        await data.shoppingList.upsert({
          id: `sl_${Math.random().toString(36).slice(2)}`,
          userId: profile.id,
          ingredientId,
          sourceRecipeIds: [],
          checked: false,
          addedAt: now,
          updatedAt: now,
        });
        added += 1;
      }
      return added;
    },
    onSuccess: (added) => {
      client.invalidateQueries({ queryKey: ['shopping-list'] });
      const title = added
        ? t(added === 1 ? 'planner.addedItems.one' : 'planner.addedItems.many', { count: added })
        : t('planner.nothingNew');
      Alert.alert(
        title,
        added ? undefined : t('planner.allInPantry'),
        [
          { text: t('ok'), style: 'default' },
          { text: t('planner.openList'), onPress: () => router.push('/shopping-list') },
        ],
      );
    },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>{t('planner.eyebrow')}</Text>
        <Text style={styles.title}>{t('planner.title')}</Text>

        <View style={styles.weekNav}>
          <Pressable
            onPress={() => setWeekStart(addDays(weekStart, -7))}
            hitSlop={12}
            style={styles.navBtn}
            accessibilityLabel={t('planner.prevWeek')}
          >
            <Ionicons name="chevron-back" size={18} color={COLORS.ink900} />
          </Pressable>
          <Text style={styles.weekLabel}>
            {t('planner.weekRange', { start: weekStart, end: weekEnd })}
          </Text>
          <Pressable
            onPress={() => setWeekStart(addDays(weekStart, 7))}
            hitSlop={12}
            style={styles.navBtn}
            accessibilityLabel={t('planner.nextWeek')}
          >
            <Ionicons name="chevron-forward" size={18} color={COLORS.ink900} />
          </Pressable>
        </View>

        <Pressable
          style={[styles.addWeekBtn, !entriesQ.data?.length && { opacity: 0.4 }]}
          onPress={() => addWeekToShoppingList.mutate()}
          disabled={!entriesQ.data?.length}
        >
          <Ionicons name="basket-outline" size={16} color={COLORS.cream} />
          <Text style={styles.addWeekBtnText}>{t('planner.addWeekToList')}</Text>
        </Pressable>

        {MEALS.map((meal) => (
          <View key={meal} style={{ marginTop: SPACING.lg }}>
            <Text style={styles.meal}>{t(`planner.slot.${meal}` as never)}</Text>
            <View style={styles.grid}>
              {days.map((d, i) => {
                const entry = entriesBySlot.get(`${d}::${meal}`);
                const recipe = entry ? recipesById.get(entry.recipeId) : undefined;
                const dayLabel = t(`planner.day.${DAY_KEYS[i]}` as never);
                if (!entry || !recipe) {
                  return (
                    <Pressable
                      key={d}
                      style={styles.slot}
                      onPress={() => setPicker({ date: d, meal })}
                    >
                      <Text style={styles.slotDay}>{dayLabel}</Text>
                      <Ionicons name="add" size={20} color={COLORS.ink300} />
                    </Pressable>
                  );
                }
                return (
                  <Pressable
                    key={d}
                    style={styles.slotFilled}
                    onPress={() =>
                      Alert.alert(
                        recipe.title.en,
                        t('planner.slot.dayMeal', { day: dayLabel, meal: t(`planner.slot.${meal}` as never) }),
                        [
                          {
                            text: t('planner.openRecipe'),
                            onPress: () =>
                              router.push({
                                pathname: '/recipe/[slug]',
                                params: { slug: recipe.slug },
                              }),
                          },
                          { text: t('planner.replace'), onPress: () => setPicker({ date: d, meal }) },
                          { text: t('planner.remove'), style: 'destructive', onPress: () => clearSlot.mutate(entry.id) },
                          { text: t('action.cancel'), style: 'cancel' },
                        ],
                        { cancelable: true },
                      )
                    }
                  >
                    <CuisineArt
                      seed={recipe.cuisineIds[0] ?? recipe.slug}
                      height={82}
                      radius={RADIUS.md}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.slotOverlay} />
                    <Text style={styles.slotDayFilled}>{dayLabel}</Text>
                    <Text style={styles.slotRecipeTitle} numberOfLines={2}>
                      {recipe.title.en}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {picker && (
        <RecipePicker
          date={picker.date}
          meal={picker.meal}
          recipes={summariesQ.data ?? []}
          onCancel={() => setPicker(null)}
          onPick={(recipeId) => {
            assign.mutate({ date: picker.date, meal: picker.meal, recipeId });
            setPicker(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

function RecipePicker({
  date,
  meal,
  recipes,
  onCancel,
  onPick,
}: {
  date: string;
  meal: Meal;
  recipes: RecipeSummary[];
  onCancel: () => void;
  onPick: (recipeId: string) => void;
}) {
  const { t } = useTranslator();
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return recipes
      .filter((r) => (needle ? r.title.en.toLowerCase().includes(needle) : true))
      .filter((r) => r.mealTypes.includes(meal) || !needle);
  }, [recipes, q, meal]);

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.modalBackdrop} onPress={onCancel}>
        <Pressable style={styles.pickerCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <View style={styles.pickerHeader}>
            <View>
              <Text style={styles.pickerTitle}>{t('planner.pickTitle')}</Text>
              <Text style={styles.pickerSub}>
                {t('planner.pickSubtitle', {
                  meal: t(`planner.slot.${meal}` as never),
                  date,
                })}
              </Text>
            </View>
            <Pressable onPress={onCancel} hitSlop={8} accessibilityLabel={t('action.close')}>
              <Ionicons name="close" size={22} color={COLORS.ink500} />
            </Pressable>
          </View>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color={COLORS.ink400} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={t('planner.pickSearch')}
              placeholderTextColor={COLORS.ink400}
              style={styles.searchInput}
              autoFocus
            />
          </View>
          <FlatList
            data={filtered.slice(0, 60)}
            keyExtractor={(r) => r.id}
            contentContainerStyle={{ paddingBottom: SPACING.xl }}
            renderItem={({ item }) => (
              <Pressable style={styles.pickerRow} onPress={() => onPick(item.id)}>
                <CuisineArt
                  seed={item.cuisineIds[0] ?? item.slug}
                  height={56}
                  radius={RADIUS.sm}
                  style={{ width: 56 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerRowTitle} numberOfLines={2}>
                    {item.title.en}
                  </Text>
                  <Text style={styles.pickerRowSub}>
                    {t('discover.row.subtitle', {
                      minutes: item.totalMinutes,
                      difficulty: t(`recipe.difficulty.${item.difficulty}` as never),
                    })}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  container: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  eyebrow: {
    color: COLORS.ink400,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  title: { fontFamily: FONTS.display, fontSize: FONT_SIZES.xxl, color: COLORS.ink900, marginTop: 4 },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.pill,
    padding: 4,
    ...SHADOW.soft,
  },
  navBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  weekLabel: { fontFamily: FONTS.bodyMedium, color: COLORS.ink700, fontSize: FONT_SIZES.sm },
  addWeekBtn: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.emerald700,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.sm,
    ...SHADOW.card,
  },
  addWeekBtnText: { color: COLORS.cream, fontFamily: FONTS.bodySemi, fontSize: FONT_SIZES.sm },
  meal: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.lg,
    color: COLORS.ink900,
    marginBottom: SPACING.sm,
    textTransform: 'capitalize',
  },
  grid: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  slot: {
    flexBasis: '13%',
    flexGrow: 1,
    minWidth: 42,
    height: 82,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.ink100,
    borderStyle: 'dashed',
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotDay: {
    color: COLORS.ink400,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    marginBottom: 2,
  },
  slotFilled: {
    flexBasis: '13%',
    flexGrow: 1,
    minWidth: 42,
    height: 82,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOW.soft,
    padding: 6,
    justifyContent: 'flex-end',
  },
  slotOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  slotDayFilled: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  slotRecipeTitle: { color: '#fff', fontFamily: FONTS.bodySemi, fontSize: 11, lineHeight: 13 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(29,29,27,0.5)', justifyContent: 'flex-end' },
  pickerCard: {
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
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
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  pickerTitle: { fontFamily: FONTS.display, fontSize: FONT_SIZES.xl, color: COLORS.ink900 },
  pickerSub: {
    fontFamily: FONTS.bodyMedium,
    color: COLORS.ink500,
    fontSize: FONT_SIZES.sm,
    textTransform: 'capitalize',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.ink100,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.md,
    color: COLORS.ink900,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.xs,
    marginBottom: SPACING.xs,
    ...SHADOW.soft,
  },
  pickerRowTitle: { fontFamily: FONTS.bodySemi, fontSize: FONT_SIZES.md, color: COLORS.ink900 },
  pickerRowSub: { fontFamily: FONTS.body, fontSize: FONT_SIZES.sm, color: COLORS.ink500, marginTop: 2 },
});
