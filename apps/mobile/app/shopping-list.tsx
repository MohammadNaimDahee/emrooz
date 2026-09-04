import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { combineShoppingList, groupShoppingByCategory } from '@emrooz/core';
import type { ShoppingListItem } from '@emrooz/types';

import { useData } from '../src/data/context';
import { useTranslator } from '../src/i18n/hook';
import { useDirIcons } from '../src/i18n/rtl';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SHADOW, SPACING } from '../src/theme/tokens';

const CATEGORY_KEYS = [
  'produce',
  'vegetable',
  'fruit',
  'herb',
  'spice',
  'grain',
  'legume',
  'dairy',
  'egg',
  'meat',
  'poultry',
  'seafood',
  'fat_or_oil',
  'sweetener',
  'condiment',
  'baking',
  'nut_or_seed',
  'beverage',
  'other',
] as const;

export default function ShoppingListScreen() {
  const { data, profile } = useData();
  const { t } = useTranslator();
  const dirIcons = useDirIcons();
  const client = useQueryClient();
  const [manualLabel, setManualLabel] = useState('');

  const listQ = useQuery({
    queryKey: ['shopping-list', profile?.id],
    enabled: !!profile,
    queryFn: () => data.shoppingList.list(profile!.id),
  });
  const ingQ = useQuery({
    queryKey: ['ingredients-index'],
    queryFn: () => data.ingredients.all(),
  });

  const ingredientMap = useMemo(
    () => new Map((ingQ.data ?? []).map((i) => [i.id, i])),
    [ingQ.data],
  );

  const grouped = useMemo(() => {
    const combined = combineShoppingList(listQ.data ?? [], ingredientMap);
    return groupShoppingByCategory(combined);
  }, [listQ.data, ingredientMap]);

  const upsert = useMutation({
    mutationFn: (item: ShoppingListItem) => data.shoppingList.upsert(item),
    onSuccess: () => client.invalidateQueries({ queryKey: ['shopping-list'] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => data.shoppingList.remove(profile!.id, id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['shopping-list'] }),
  });

  async function toggleGroup(group: (typeof grouped)[number]['items'][number], next: boolean) {
    for (const item of group.items) {
      await upsert.mutateAsync({
        ...item,
        checked: next,
        updatedAt: new Date().toISOString(),
      });
    }
  }
  async function removeGroup(group: (typeof grouped)[number]['items'][number]) {
    for (const item of group.items) await remove.mutateAsync(item.id);
  }

  async function addManual() {
    if (!manualLabel.trim() || !profile) return;
    await upsert.mutateAsync({
      id: `sl_${Math.random().toString(36).slice(2)}`,
      userId: profile.id,
      label: manualLabel.trim(),
      sourceRecipeIds: [],
      checked: false,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setManualLabel('');
  }

  function clearCompleted() {
    if (!profile) return;
    data.shoppingList
      .clear(profile.id, { completedOnly: true })
      .then(() => client.invalidateQueries({ queryKey: ['shopping-list'] }));
  }

  function clearAll() {
    if (!profile) return;
    Alert.alert(
      t('shoppingList.clearEntire.title'),
      t('shoppingList.clearEntire.body'),
      [
        { text: t('action.cancel'), style: 'cancel' },
        {
          text: t('shoppingList.clearAll'),
          style: 'destructive',
          onPress: () =>
            data.shoppingList
              .clear(profile.id)
              .then(() => client.invalidateQueries({ queryKey: ['shopping-list'] })),
        },
      ],
      { cancelable: true },
    );
  }

  const activeCount = (listQ.data ?? []).filter((i) => !i.checked).length;
  const doneCount = (listQ.data ?? []).filter((i) => i.checked).length;

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
        <Text style={styles.headerTitle}>{t('shoppingList.title')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: SPACING.xxl }}>
        <Text style={styles.eyebrow}>{t('shoppingList.headerEyebrow')}</Text>
        <Text style={styles.title}>
          {activeCount === 0 ? t('shoppingList.allDone') : t('shoppingList.toBuy', { count: activeCount })}
        </Text>
        {doneCount > 0 && (
          <Text style={styles.subtitle}>{t('shoppingList.completed', { count: doneCount })}</Text>
        )}

        {/* Add manual */}
        <View style={styles.addRow}>
          <TextInput
            value={manualLabel}
            onChangeText={setManualLabel}
            placeholder={t('shoppingList.addPlaceholder')}
            placeholderTextColor={COLORS.ink400}
            style={styles.addInput}
            returnKeyType="done"
            onSubmitEditing={addManual}
          />
          <Pressable
            style={[styles.addBtn, !manualLabel.trim() && { opacity: 0.5 }]}
            onPress={addManual}
            disabled={!manualLabel.trim()}
            accessibilityLabel={t('action.add')}
          >
            <Ionicons name="add" size={22} color={COLORS.cream} />
          </Pressable>
        </View>

        {(activeCount > 0 || doneCount > 0) && (
          <View style={styles.bulkRow}>
            {doneCount > 0 && (
              <Pressable onPress={clearCompleted} hitSlop={8}>
                <Text style={styles.bulkText}>
                  {t('shoppingList.clearCountCompleted', { count: doneCount })}
                </Text>
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            <Pressable onPress={clearAll} hitSlop={8}>
              <Text style={[styles.bulkText, { color: COLORS.danger }]}>
                {t('shoppingList.clearAll')}
              </Text>
            </Pressable>
          </View>
        )}

        {grouped.map(({ category, items }) => {
          const isKnown = (CATEGORY_KEYS as readonly string[]).includes(category);
          const sectionLabel = isKnown
            ? t(`shoppingList.category.${category}` as never)
            : category;
          return (
          <View key={category} style={{ marginTop: SPACING.lg }}>
            <Text style={styles.section}>{sectionLabel}</Text>
            <View style={styles.card}>
              {items.map((it, i) => (
                <View
                  key={it.key}
                  style={[
                    styles.row,
                    i < items.length - 1 && styles.rowDivider,
                    it.checked && { opacity: 0.55 },
                  ]}
                >
                  <Pressable
                    onPress={() => toggleGroup(it, !it.checked)}
                    accessibilityLabel={it.checked ? t('shoppingList.uncheck') : t('shoppingList.check')}
                    style={[styles.checkbox, it.checked && styles.checkboxOn]}
                    hitSlop={8}
                  >
                    {it.checked && <Ionicons name="checkmark" size={14} color={COLORS.cream} />}
                  </Pressable>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemLabel, it.checked && { textDecorationLine: 'line-through' }]}>
                      {it.label}
                    </Text>
                    {(it.quantity !== undefined || it.unit) && (
                      <Text style={styles.itemQty}>
                        {[it.quantity, it.unit].filter(Boolean).join(' ')}
                      </Text>
                    )}
                    {it.sourceRecipeIds.length > 0 && (
                      <Text style={styles.itemFrom}>
                        {t(
                          it.sourceRecipeIds.length === 1
                            ? 'shoppingList.itemFromRecipes.one'
                            : 'shoppingList.itemFromRecipes.many',
                          { count: it.sourceRecipeIds.length },
                        )}
                      </Text>
                    )}
                  </View>

                  <Pressable
                    onPress={() => removeGroup(it)}
                    accessibilityLabel={t('shoppingList.remove')}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={18} color={COLORS.ink300} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
          );
        })}

        {grouped.length === 0 && (
          <View style={[styles.card, { padding: SPACING.lg, marginTop: SPACING.lg }]}>
            <Text style={styles.emptyTitle}>{t('shoppingList.empty.title')}</Text>
            <Text style={styles.emptyBody}>
              {t('shoppingList.empty.body')}
            </Text>
          </View>
        )}
      </ScrollView>
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
  headerTitle: { fontFamily: FONTS.bodySemi, fontSize: FONT_SIZES.md, color: COLORS.ink900 },
  eyebrow: {
    color: COLORS.ink400,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  title: { fontFamily: FONTS.display, fontSize: FONT_SIZES.hero, color: COLORS.ink900, marginTop: 4 },
  subtitle: { fontFamily: FONTS.body, color: COLORS.ink500, marginTop: 2 },
  addRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.md,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.ink100,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.md,
    color: COLORS.ink900,
    ...SHADOW.soft,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.emerald700,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.card,
  },
  bulkRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md, gap: SPACING.sm },
  bulkText: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.ink500 },
  section: {
    color: COLORS.ink400,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
    ...SHADOW.soft,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.ink100 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.ink200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: COLORS.emerald700, borderColor: COLORS.emerald700 },
  itemLabel: { color: COLORS.ink900, fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.md },
  itemQty: { color: COLORS.ink500, fontFamily: FONTS.body, fontSize: FONT_SIZES.sm },
  itemFrom: { color: COLORS.ink400, fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, marginTop: 2 },
  emptyTitle: { fontFamily: FONTS.display, fontSize: FONT_SIZES.xl, color: COLORS.ink900 },
  emptyBody: { fontFamily: FONTS.body, color: COLORS.ink500, marginTop: SPACING.xs },
});
