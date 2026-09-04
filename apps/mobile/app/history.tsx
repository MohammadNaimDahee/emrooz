import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { toIsoDate } from '@emrooz/core';

import { CuisineArt } from '../src/components/CuisineArt';
import { useData } from '../src/data/context';
import { useTranslator } from '../src/i18n/hook';
import { useDirIcons } from '../src/i18n/rtl';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SHADOW, SPACING } from '../src/theme/tokens';

export default function HistoryScreen() {
  const { data, profile } = useData();
  const { t } = useTranslator();
  const dirIcons = useDirIcons();
  const client = useQueryClient();

  const q = useQuery({
    queryKey: ['history', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const entries = await data.history.list(profile!.id);
      const withRecipe = await Promise.all(
        entries
          .sort((a, b) => (a.cookedOn < b.cookedOn ? 1 : -1))
          .map(async (e) => ({ entry: e, recipe: await data.recipes.findById(e.recipeId) })),
      );
      return withRecipe.filter(
        (
          x,
        ): x is {
          entry: (typeof withRecipe)[number]['entry'];
          recipe: NonNullable<(typeof withRecipe)[number]['recipe']>;
        } => Boolean(x.recipe),
      );
    },
  });

  const cookAgain = useMutation({
    mutationFn: async (recipeId: string) => {
      if (!profile) return;
      await data.history.add({
        id: `hi_${Math.random().toString(36).slice(2)}`,
        userId: profile.id,
        recipeId,
        cookedOn: toIsoDate(),
        servings: 2,
        createdAt: new Date().toISOString(),
      });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['history'] }),
  });

  const removeEntry = useMutation({
    mutationFn: async (entryId: string) => {
      if (!profile) return;
      await data.history.remove(profile.id, entryId);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['history'] }),
  });

  const addToPlanner = useMutation({
    mutationFn: async (v: { recipeId: string }) => {
      if (!profile) return;
      await data.planner.upsert({
        id: `mp_${Math.random().toString(36).slice(2)}`,
        userId: profile.id,
        date: toIsoDate(),
        meal: 'dinner',
        recipeId: v.recipeId,
        servings: 2,
        createdAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['planner'] });
      Alert.alert(t('history.addedToPlanner.title'), t('history.addedToPlanner.body'));
    },
  });

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
        <Text style={styles.headerTitle}>{t('nav.history')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={q.data ?? []}
        keyExtractor={(x) => x.entry.id}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.sm }}
        ListHeaderComponent={
          <View style={{ marginBottom: SPACING.sm }}>
            <Text style={styles.eyebrow}>{t('history.headerEyebrow')}</Text>
            <Text style={styles.title}>
              {t('history.mealsCount', { count: q.data?.length ?? 0 })}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <CuisineArt
                seed={item.recipe.cuisineIds[0] ?? item.recipe.slug}
                height={80}
                radius={RADIUS.md}
                style={{ width: 80 }}
              />
              <View style={{ flex: 1 }}>
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/recipe/[slug]', params: { slug: item.recipe.slug } })
                  }
                >
                  <Text style={styles.recipeTitle} numberOfLines={2}>
                    {item.recipe.title.en}
                  </Text>
                </Pressable>
                <Text style={styles.metaLine}>
                  {item.entry.cookedOn} ·{' '}
                  {t(
                    item.entry.servings === 1
                      ? 'history.servingsCount.one'
                      : 'history.servingsCount.many',
                    { count: item.entry.servings },
                  )}
                </Text>
              </View>
            </View>
            {item.entry.note && <Text style={styles.note}>"{item.entry.note}"</Text>}
            <View style={styles.actions}>
              <SmallBtn
                icon="restaurant-outline"
                label={t('history.cookAgain')}
                onPress={() => cookAgain.mutate(item.recipe.id)}
              />
              <SmallBtn
                icon="calendar-outline"
                label={t('history.addToPlanner')}
                onPress={() => addToPlanner.mutate({ recipeId: item.recipe.id })}
              />
              <Pressable
                onPress={() =>
                  Alert.alert(t('history.removeEntry.title'), undefined, [
                    { text: t('action.cancel'), style: 'cancel' },
                    {
                      text: t('action.remove'),
                      style: 'destructive',
                      onPress: () => removeEntry.mutate(item.entry.id),
                    },
                  ])
                }
                style={{ marginLeft: 'auto' }}
                hitSlop={8}
                accessibilityLabel={t('history.remove')}
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.ink300} />
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t('history.emptyTitle')}</Text>
            <Text style={styles.emptyBody}>{t('history.emptyBodyAlt')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function SmallBtn({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.smallBtn} onPress={onPress}>
      <Ionicons name={icon} size={14} color={COLORS.emerald700} />
      <Text style={styles.smallBtnText}>{label}</Text>
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
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
    padding: SPACING.sm,
    ...SHADOW.soft,
  },
  recipeTitle: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.lg,
    color: COLORS.emerald700,
    lineHeight: 22,
  },
  metaLine: {
    fontFamily: FONTS.body,
    color: COLORS.ink500,
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
  },
  note: {
    marginTop: SPACING.xs,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.sm,
    color: COLORS.ink700,
    fontStyle: 'italic',
    backgroundColor: COLORS.ink50,
    borderRadius: RADIUS.sm,
    padding: SPACING.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  smallBtn: {
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
  smallBtnText: { color: COLORS.emerald700, fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.xs },
  empty: { marginTop: SPACING.xxl, alignItems: 'center' },
  emptyTitle: { fontFamily: FONTS.display, fontSize: FONT_SIZES.xl, color: COLORS.ink900 },
  emptyBody: {
    fontFamily: FONTS.body,
    color: COLORS.ink500,
    marginTop: SPACING.xs,
    textAlign: 'center',
    maxWidth: 260,
  },
});
