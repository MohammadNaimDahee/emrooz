import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CuisineArt } from '../../src/components/CuisineArt';
import { useData } from '../../src/data/context';
import { useTranslator } from '../../src/i18n/hook';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SHADOW, SPACING } from '../../src/theme/tokens';

export default function Favorites() {
  const { data, profile } = useData();
  const { t } = useTranslator();

  const q = useQuery({
    queryKey: ['favorites', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const favs = await data.favorites.list(profile!.id);
      const recipes = await Promise.all(favs.map((f) => data.recipes.findById(f.recipeId)));
      return recipes.filter((r): r is NonNullable<typeof r> => Boolean(r));
    },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>{t('favorites.eyebrow')}</Text>
        <Text style={styles.title}>{t('favorites.title')}</Text>

        <FlatList
          data={q.data ?? []}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingBottom: SPACING.xxl, paddingTop: SPACING.md }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push({ pathname: '/recipe/[slug]', params: { slug: item.slug } })
              }
            >
              <CuisineArt
                seed={item.cuisineIds[0] ?? item.slug}
                height={90}
                radius={RADIUS.md}
                style={{ width: 90 }}
              />
              <View style={{ flex: 1, paddingVertical: SPACING.xs }}>
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
              <Text style={styles.emptyTitle}>{t('favorites.empty.title')}</Text>
              <Text style={styles.emptyBody}>{t('favorites.empty.body')}</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
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
  rowSub: { color: COLORS.ink500, fontFamily: FONTS.body, fontSize: FONT_SIZES.sm, marginTop: 2 },
  empty: { marginTop: SPACING.xxl, alignItems: 'center' },
  emptyTitle: { fontFamily: FONTS.display, fontSize: FONT_SIZES.xl, color: COLORS.ink900 },
  emptyBody: { fontFamily: FONTS.body, color: COLORS.ink500, marginTop: SPACING.xs },
});
