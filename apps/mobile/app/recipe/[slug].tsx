import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { scaleIngredients, toIsoDate } from '@emrooz/core';

import { CuisineArt } from '../../src/components/CuisineArt';
import { useData } from '../../src/data/context';
import { useTranslator } from '../../src/i18n/hook';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SHADOW, SPACING } from '../../src/theme/tokens';

export default function RecipeScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, profile } = useData();
  const { t } = useTranslator();
  const client = useQueryClient();

  const recipeQ = useQuery({
    queryKey: ['recipe', slug],
    enabled: !!slug,
    queryFn: () => data.recipes.findBySlug(slug!),
  });
  const ingredientsQ = useQuery({
    queryKey: ['ingredients-index'],
    queryFn: () => data.ingredients.all(),
  });
  const favQ = useQuery({
    queryKey: ['favorite', profile?.id, recipeQ.data?.id],
    enabled: !!profile && !!recipeQ.data,
    queryFn: () => data.favorites.isFavorite(profile!.id, recipeQ.data!.id),
  });
  const pantryQ = useQuery({
    queryKey: ['pantry', profile?.id],
    enabled: !!profile,
    queryFn: () => data.pantry.list(profile!.id),
  });

  const [servings, setServings] = useState<number | undefined>();
  const [cookModalOpen, setCookModalOpen] = useState(false);
  const [note, setNote] = useState('');
  const [addedToList, setAddedToList] = useState(false);

  const recipe = recipeQ.data;
  const target = servings ?? recipe?.servings ?? 2;

  const ingredientMap = useMemo(
    () => new Map((ingredientsQ.data ?? []).map((i) => [i.id, i])),
    [ingredientsQ.data],
  );

  const pantrySet = useMemo(
    () => new Set((pantryQ.data ?? []).map((p) => p.ingredientId)),
    [pantryQ.data],
  );

  if (!recipe) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.cream }}>
        <View style={{ padding: SPACING.lg }}>
          <Text style={{ fontFamily: FONTS.body }}>{t('error.generic')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const scaled = scaleIngredients(recipe, target);
  const recipeId = recipe.id;
  const recipeTitle = recipe.title.en;
  const recipeSlug = recipe.slug;
  const missing = recipe.ingredients
    .filter((i) => !i.optional && !pantrySet.has(i.ingredientId))
    .map((i) => i.ingredientId);

  async function toggleFavorite() {
    if (!profile) return;
    if (favQ.data) {
      await data.favorites.remove(profile.id, recipeId);
    } else {
      await data.favorites.add({
        id: `fv_${Math.random().toString(36).slice(2)}`,
        userId: profile.id,
        recipeId,
        favoritedAt: new Date().toISOString(),
      });
    }
    await client.invalidateQueries({ queryKey: ['favorite'] });
    await client.invalidateQueries({ queryKey: ['favorites'] });
  }

  async function markCooked() {
    if (!profile) return;
    await data.history.add({
      id: `hi_${Math.random().toString(36).slice(2)}`,
      userId: profile.id,
      recipeId,
      cookedOn: toIsoDate(),
      servings: target,
      note: note.trim() ? note.trim() : undefined,
      createdAt: new Date().toISOString(),
    });
    await client.invalidateQueries({ queryKey: ['today'] });
    await client.invalidateQueries({ queryKey: ['history'] });
    setCookModalOpen(false);
    setNote('');
    router.back();
  }

  async function addMissingToList() {
    if (!profile || missing.length === 0) return;
    const existing = await data.shoppingList.list(profile.id);
    const existingByIngredient = new Map(
      existing.filter((i) => i.ingredientId).map((i) => [i.ingredientId!, i]),
    );
    const now = new Date().toISOString();
    for (const ingredientId of missing) {
      const found = existingByIngredient.get(ingredientId);
      if (found) {
        if (!found.sourceRecipeIds.includes(recipeId)) {
          await data.shoppingList.upsert({
            ...found,
            sourceRecipeIds: [...found.sourceRecipeIds, recipeId],
            updatedAt: now,
          });
        }
      } else {
        await data.shoppingList.upsert({
          id: `sl_${Math.random().toString(36).slice(2)}`,
          userId: profile.id,
          ingredientId,
          sourceRecipeIds: [recipeId],
          checked: false,
          addedAt: now,
          updatedAt: now,
        });
      }
    }
    await client.invalidateQueries({ queryKey: ['shopping-list'] });
    setAddedToList(true);
    setTimeout(() => setAddedToList(false), 2200);
  }

  async function shareRecipe() {
    try {
      await Share.share({
        message: t('recipe.share.message', { title: recipeTitle, slug: recipeSlug }),
        title: recipeTitle,
      });
    } catch {
      // User cancelled.
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.cream }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View>
          <CuisineArt seed={recipe.cuisineIds[0] ?? recipe.slug} height={320} />
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'transparent', 'rgba(251,246,236,0.85)', COLORS.cream]}
            locations={[0, 0.35, 0.85, 1]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={['top']} style={styles.heroSafe}>
            <Pressable
              onPress={() => router.back()}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel={t('recipe.back')}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={22} color={COLORS.ink900} />
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={shareRecipe}
              style={[styles.iconButton, { marginRight: SPACING.xs }]}
              accessibilityLabel={t('recipe.share')}
              hitSlop={12}
            >
              <Ionicons name="share-outline" size={20} color={COLORS.ink900} />
            </Pressable>
            <Pressable
              onPress={toggleFavorite}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel={t(favQ.data ? 'recipe.unfavorite' : 'recipe.favorite')}
              hitSlop={12}
            >
              <Ionicons
                name={favQ.data ? 'heart' : 'heart-outline'}
                size={22}
                color={favQ.data ? COLORS.saffron500 : COLORS.ink900}
              />
            </Pressable>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          <Text style={styles.eyebrow}>
            {recipe.mealTypes[0]
              ? t(`discover.mealType.${recipe.mealTypes[0]}` as never)
              : t('recipe.eyebrowFallback')}
          </Text>
          <Text style={styles.title}>{recipe.title.en}</Text>
          {recipe.description?.en && <Text style={styles.description}>{recipe.description.en}</Text>}

          <View style={styles.metaRow}>
            <Meta icon="time-outline" label={t('recipe.prepTime')} value={t('recipe.minutesShort', { count: recipe.prepMinutes })} />
            <Meta icon="flame-outline" label={t('recipe.cookTime')} value={t('recipe.minutesShort', { count: recipe.cookMinutes })} />
            <Meta icon="hourglass-outline" label={t('recipe.totalTime')} value={t('recipe.minutesShort', { count: recipe.totalMinutes })} />
            <Meta icon="restaurant-outline" label={t('recipe.level')} value={t(`recipe.difficulty.${recipe.difficulty}` as never)} />
          </View>

          {/* Ingredients */}
          <View style={styles.card}>
            <View style={styles.servingsRow}>
              <Text style={styles.sectionTitle}>{t('recipe.ingredients')}</Text>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => setServings(Math.max(1, target - 1))}
                  style={styles.stepperBtn}
                  accessibilityLabel={t('recipe.qtyDecrease')}
                  hitSlop={8}
                >
                  <Text style={styles.stepperText}>−</Text>
                </Pressable>
                <Text style={styles.servingsCount}>{target}</Text>
                <Pressable
                  onPress={() => setServings(target + 1)}
                  style={styles.stepperBtn}
                  accessibilityLabel={t('recipe.qtyIncrease')}
                  hitSlop={8}
                >
                  <Text style={styles.stepperText}>+</Text>
                </Pressable>
              </View>
            </View>

            {scaled.map((ing, i) => {
              const ingredient = ingredientMap.get(ing.ingredientId);
              const inPantry = pantrySet.has(ing.ingredientId);
              return (
                <View
                  key={i}
                  style={[styles.ingredientRow, i < scaled.length - 1 && styles.ingredientDivider]}
                >
                  <Text style={styles.ingredientQty}>
                    {ing.quantity ? `${ing.quantity} ${ing.unit ?? ''}`.trim() : t('recipe.toTaste')}
                  </Text>
                  <Text style={[styles.ingredientName, inPantry && { color: COLORS.ink500 }]}>
                    {ingredient?.name.en ?? ing.ingredientId}
                  </Text>
                  {inPantry && !ing.optional && (
                    <Ionicons name="checkmark" size={16} color={COLORS.emerald700} />
                  )}
                  {ing.optional && (
                    <Text style={{ fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.ink400, fontStyle: 'italic' }}>
                      {t('recipe.optional')}
                    </Text>
                  )}
                </View>
              );
            })}

            {missing.length > 0 && (
              <Pressable
                style={[
                  styles.addToListBtn,
                  addedToList && { backgroundColor: COLORS.emerald50, borderColor: COLORS.emerald100 },
                ]}
                onPress={addMissingToList}
              >
                <Ionicons
                  name={addedToList ? 'checkmark' : 'basket-outline'}
                  size={16}
                  color={COLORS.emerald700}
                />
                <Text style={styles.addToListText}>
                  {t(addedToList ? 'recipe.addedToList' : 'recipe.addMissingToList', {
                    count: missing.length,
                  })}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Steps */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('recipe.method')}</Text>
            {recipe.steps.map((s) => (
              <View key={s.order} style={styles.step}>
                <View style={styles.stepIndex}>
                  <Text style={styles.stepIndexText}>{s.order + 1}</Text>
                </View>
                <Text style={styles.stepText}>{s.text.en}</Text>
              </View>
            ))}
          </View>

          {(recipe.dietaryTags.length > 0 || recipe.allergens.length > 0) && (
            <View style={styles.tagRow}>
              {recipe.dietaryTags.map((d) => (
                <View key={d} style={[styles.tag, styles.tagOk]}>
                  <Text style={[styles.tagText, styles.tagOkText]}>{t(`diet.${d}` as never)}</Text>
                </View>
              ))}
              {recipe.allergens.map((a) => (
                <View key={a} style={[styles.tag, styles.tagWarn]}>
                  <Text style={[styles.tagText, styles.tagWarnText]}>
                    {t('recipe.contains', { allergen: t(`allergen.${a}` as never) })}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {recipe.provenance.attributionText && (
            <Text style={styles.attribution}>{t('recipe.attribution', { source: recipe.provenance.attributionText })}</Text>
          )}
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.stickyBar}>
        <Pressable style={styles.primaryBtn} onPress={() => setCookModalOpen(true)}>
          <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.cream} />
          <Text style={styles.primaryBtnText}>{t('recipe.iCookedThis.button')}</Text>
        </Pressable>
      </SafeAreaView>

      {/* Cook modal */}
      <Modal transparent visible={cookModalOpen} animationType="fade" onRequestClose={() => setCookModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCookModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('recipe.log.title')}</Text>
            <Text style={styles.modalHint}>{t('recipe.log.hint')}</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              placeholder={t('recipe.log.notePlaceholder')}
              placeholderTextColor={COLORS.ink400}
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setCookModalOpen(false)} style={styles.modalGhost}>
                <Text style={styles.modalGhostText}>{t('action.cancel')}</Text>
              </Pressable>
              <Pressable onPress={markCooked} style={styles.modalPrimary}>
                <Text style={styles.modalPrimaryText}>{t('action.save')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Meta({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={16} color={COLORS.emerald700} />
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroSafe: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
  body: { padding: SPACING.lg, marginTop: -SPACING.xl },
  eyebrow: {
    color: COLORS.ink400,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  title: {
    color: COLORS.ink900,
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.display,
    lineHeight: 46,
    marginTop: 4,
  },
  description: {
    color: COLORS.ink500,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
    marginTop: SPACING.sm,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.lg },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    ...SHADOW.soft,
  },
  metaLabel: {
    color: COLORS.ink400,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaValue: {
    color: COLORS.ink900,
    fontFamily: FONTS.bodySemi,
    fontSize: FONT_SIZES.sm,
    textTransform: 'capitalize',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    ...SHADOW.soft,
  },
  servingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: { fontFamily: FONTS.display, fontSize: FONT_SIZES.xl, color: COLORS.ink900 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.ink50,
    borderRadius: RADIUS.pill,
    padding: 4,
  },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: { fontSize: FONT_SIZES.lg, color: COLORS.ink900, fontFamily: FONTS.bodyBold },
  servingsCount: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bodyBold,
    minWidth: 24,
    textAlign: 'center',
    color: COLORS.ink900,
  },
  ingredientRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
    alignItems: 'baseline',
  },
  ingredientDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.ink100 },
  ingredientQty: {
    fontVariant: ['tabular-nums'],
    color: COLORS.ink400,
    minWidth: 88,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.sm,
  },
  ingredientName: { color: COLORS.ink900, flex: 1, fontFamily: FONTS.body, fontSize: FONT_SIZES.md },
  step: { flexDirection: 'row', gap: SPACING.md, paddingVertical: SPACING.sm },
  stepIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.emerald700,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepIndexText: { color: COLORS.cream, fontFamily: FONTS.display, fontSize: FONT_SIZES.md },
  stepText: {
    color: COLORS.ink900,
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.md,
    lineHeight: 24,
  },
  addToListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.ink100,
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
  },
  addToListText: { color: COLORS.emerald700, fontFamily: FONTS.bodySemi, fontSize: FONT_SIZES.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.md },
  tag: { borderRadius: RADIUS.pill, paddingHorizontal: SPACING.sm, paddingVertical: 5, borderWidth: 1 },
  tagOk: { backgroundColor: COLORS.emerald50, borderColor: COLORS.emerald100 },
  tagOkText: { color: COLORS.emerald700 },
  tagWarn: { backgroundColor: 'rgba(234,144,66,0.10)', borderColor: 'rgba(234,144,66,0.20)' },
  tagWarnText: { color: COLORS.saffron700 },
  tagText: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.xs, textTransform: 'capitalize' },
  attribution: {
    color: COLORS.ink400,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },

  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: SPACING.md,
    backgroundColor: 'rgba(251,246,236,0.94)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.ink100,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.emerald700,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md,
    ...SHADOW.card,
  },
  primaryBtnText: { color: COLORS.cream, fontFamily: FONTS.bodySemi, fontSize: FONT_SIZES.md },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(29,29,27,0.5)',
    justifyContent: 'flex-end',
    padding: SPACING.md,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    ...SHADOW.card,
  },
  modalTitle: { fontFamily: FONTS.display, fontSize: FONT_SIZES.xl, color: COLORS.ink900 },
  modalHint: { fontFamily: FONTS.body, color: COLORS.ink500, marginTop: 4 },
  modalInput: {
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.ink100,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: FONTS.body,
    color: COLORS.ink900,
    backgroundColor: COLORS.white,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm, marginTop: SPACING.md },
  modalGhost: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  modalGhostText: { color: COLORS.ink500, fontFamily: FONTS.bodyMedium },
  modalPrimary: {
    backgroundColor: COLORS.emerald700,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
  },
  modalPrimaryText: { color: COLORS.cream, fontFamily: FONTS.bodySemi },
});
