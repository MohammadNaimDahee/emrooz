import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useData } from '../../src/data/context';
import { useTranslator } from '../../src/i18n/hook';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SHADOW, SPACING } from '../../src/theme/tokens';

export default function Pantry() {
  const { data, profile } = useData();
  const { t } = useTranslator();
  const client = useQueryClient();
  const [q, setQ] = useState('');

  const suggestions = useQuery({
    queryKey: ['ingredient-search', q],
    queryFn: () => data.ingredients.search(q, 200),
  });
  const current = useQuery({
    queryKey: ['pantry', profile?.id],
    enabled: !!profile,
    queryFn: () => data.pantry.list(profile!.id),
  });

  const pantryIds = useMemo(
    () => new Set((current.data ?? []).map((p) => p.ingredientId)),
    [current.data],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, NonNullable<typeof suggestions.data>>();
    for (const ing of suggestions.data ?? []) {
      const list = map.get(ing.category) ?? [];
      list.push(ing);
      map.set(ing.category, list);
    }
    return [...map.entries()];
  }, [suggestions.data]);

  async function toggle(ingredientId: string) {
    if (!profile) return;
    if (pantryIds.has(ingredientId)) {
      await data.pantry.remove(profile.id, ingredientId);
    } else {
      await data.pantry.add({
        id: `pn_${Math.random().toString(36).slice(2)}`,
        userId: profile.id,
        ingredientId,
        addedAt: new Date().toISOString(),
      });
    }
    await client.invalidateQueries({ queryKey: ['pantry'] });
    await client.invalidateQueries({ queryKey: ['today'] });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>{t('pantry.eyebrow')}</Text>
        <Text style={styles.title}>{t('pantry.title')}</Text>
        <Text style={styles.subtitle}>{t('pantry.subtitle')}</Text>

        <View style={styles.search}>
          <Ionicons name="search-outline" size={18} color={COLORS.ink400} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t('pantry.searchPlaceholder')}
            placeholderTextColor={COLORS.ink400}
            style={styles.searchInput}
          />
        </View>

        {pantryIds.size > 0 && (
          <Text style={styles.count}>
            {t(pantryIds.size === 1 ? 'pantry.count.one' : 'pantry.count.many', {
              count: pantryIds.size,
            })}
          </Text>
        )}

        {grouped.map(([category, items]) => (
          <View key={category} style={{ marginTop: SPACING.md }}>
            <Text style={styles.section}>{t(`pantry.category.${category}` as never)}</Text>
            <View style={styles.chipWrap}>
              {items.map((ing) => {
                const active = pantryIds.has(ing.id);
                return (
                  <Pressable
                    key={ing.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggle(ing.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    {active && <Ionicons name="checkmark" size={14} color={COLORS.cream} />}
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {ing.name.en}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  container: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.xxl },
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
  },
  subtitle: {
    color: COLORS.ink500,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.xs,
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
    marginTop: SPACING.md,
    ...SHADOW.soft,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.md,
    color: COLORS.ink900,
  },
  count: {
    color: COLORS.ink500,
    fontFamily: FONTS.body,
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.sm,
  },
  section: {
    color: COLORS.ink400,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: SPACING.xs,
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
  },
  chipActive: { backgroundColor: COLORS.emerald700, borderColor: COLORS.emerald700 },
  chipText: { color: COLORS.ink900, fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm },
  chipTextActive: { color: COLORS.cream },
});
