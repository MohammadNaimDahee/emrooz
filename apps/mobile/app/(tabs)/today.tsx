import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { recommend } from '@emrooz/recommendations';
import { timeOfDay, toIsoDate } from '@emrooz/core';
import type { FeedbackType } from '@emrooz/types';

import { CuisineArt } from '../../src/components/CuisineArt';
import { useData } from '../../src/data/context';
import { useTranslator } from '../../src/i18n/hook';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SHADOW, SPACING } from '../../src/theme/tokens';

// Feedback options (matches @emrooz/types FeedbackType). Order matters
// because ActionSheetIOS resolves by index and Alert.alert renders buttons top-down.
// Labels are looked up from t() inside the component so they respect the
// active locale — this array only holds the stable metadata.
const FEEDBACK_OPTIONS: {
  kind: FeedbackType;
  key: 'notToday' | 'doNotLike' | 'tooDifficult' | 'tooLong';
}[] = [
  { kind: 'not_today', key: 'notToday' },
  { kind: 'do_not_like', key: 'doNotLike' },
  { kind: 'too_difficult', key: 'tooDifficult' },
  { kind: 'takes_too_long', key: 'tooLong' },
];

type QuickFilter =
  | undefined
  | 'time_20'
  | 'time_30'
  | 'quick_meal'
  | 'vegetarian'
  | 'use_what_i_have'
  | 'surprise_me';

const FILTERS: {
  key: Exclude<QuickFilter, undefined>;
  labelKey: 'quick' | 'time20' | 'vegetarian' | 'fromPantry' | 'surpriseMe';
}[] = [
  { key: 'quick_meal', labelKey: 'quick' },
  { key: 'time_20', labelKey: 'time20' },
  { key: 'vegetarian', labelKey: 'vegetarian' },
  { key: 'use_what_i_have', labelKey: 'fromPantry' },
  { key: 'surprise_me', labelKey: 'surpriseMe' },
];

export default function TodayScreen() {
  const { data, profile, preferences } = useData();
  const { t } = useTranslator();
  const [filter, setFilter] = useState<QuickFilter>();
  const [ackId, setAckId] = useState<string | null>(null);
  const client = useQueryClient();

  const sendFeedback = useMutation({
    mutationFn: async (v: { recipeId: string; kind: FeedbackType }) => {
      if (!profile) return;
      await data.feedback.add({
        id: `fb_${Math.random().toString(36).slice(2)}`,
        userId: profile.id,
        recipeId: v.recipeId,
        feedback: v.kind,
        createdAt: new Date().toISOString(),
      });
    },
    onSuccess: (_r, vars) => {
      client.invalidateQueries({ queryKey: ['today'] });
      setAckId(vars.recipeId);
      setTimeout(() => setAckId((cur) => (cur === vars.recipeId ? null : cur)), 2000);
    },
  });

  function showFeedbackMenu(recipeId: string) {
    const title = t('today.feedback.title');
    const cancel = t('action.cancel');
    const labels = FEEDBACK_OPTIONS.map((o) => t(`today.feedback.${o.key}` as never));
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          options: [...labels, cancel],
          cancelButtonIndex: FEEDBACK_OPTIONS.length,
        },
        (index) => {
          if (index >= 0 && index < FEEDBACK_OPTIONS.length) {
            sendFeedback.mutate({ recipeId, kind: FEEDBACK_OPTIONS[index]!.kind });
          }
        },
      );
    } else {
      Alert.alert(
        title,
        undefined,
        [
          ...FEEDBACK_OPTIONS.map((o, i) => ({
            text: labels[i]!,
            onPress: () => sendFeedback.mutate({ recipeId, kind: o.kind }),
          })),
          { text: cancel, style: 'cancel' as const },
        ],
        { cancelable: true },
      );
    }
  }
  const today = toIsoDate();
  const greetingKey =
    timeOfDay() === 'morning'
      ? 'today.greeting.morning'
      : timeOfDay() === 'afternoon'
        ? 'today.greeting.afternoon'
        : 'today.greeting.evening';

  const query = useQuery({
    queryKey: ['today', profile?.id, today, filter, preferences?.onboardedAt],
    enabled: !!profile,
    queryFn: async () => {
      const [recipes, ingredientsList, pantry, favorites, history, feedback, impressions] =
        await Promise.all([
          data.recipes.listPublished({ limit: 200 }),
          data.ingredients.all(),
          data.pantry.list(profile!.id),
          data.favorites.list(profile!.id),
          data.history.list(profile!.id),
          data.feedback.list(profile!.id),
          data.impressions.list(profile!.id),
        ]);
      return recommend({
        today,
        userId: profile!.id,
        preferences: preferences ?? {
          userId: profile!.id,
          language: 'en',
          cuisineIds: [],
          householdSize: 2,
          dietaryTags: [],
          allergens: [],
          dislikedIngredientIds: [],
          pantrySeedIngredientIds: [],
        },
        pantry: new Set(pantry.map((p) => p.ingredientId)),
        favorites,
        history,
        feedback,
        impressions,
        recipes,
        ingredients: new Map(ingredientsList.map((i) => [i.id, i])),
        quickFilter: filter,
        limit: 3,
      });
    },
  });

  const featured = query.data?.[0];
  const rest = query.data?.slice(1) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching}
            onRefresh={() => query.refetch()}
            tintColor={COLORS.emerald700}
          />
        }
      >
        {/* Greeting + hero question */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.greeting}>{t(greetingKey as never)}</Text>
            <Pressable
              onPress={() => router.push(profile?.email ? '/settings' : '/auth/sign-in')}
              accessibilityRole="button"
              accessibilityLabel={t(
                profile?.email ? 'today.accountAndSettings' : 'today.signInOrGuest',
              )}
              hitSlop={12}
              style={({ pressed }) => [styles.profileBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="person-circle-outline" size={30} color={COLORS.emerald700} />
            </Pressable>
          </View>
          <Text style={styles.hero}>{t('today.question')}</Text>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter((cur) => (cur === f.key ? undefined : f.key))}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === f.key }}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {t(`today.filter.${f.labelKey}` as never)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {query.isLoading && <SkeletonList />}

        {query.data?.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="close-circle-outline" size={30} color={COLORS.emerald700} />
            <Text style={styles.emptyTitle}>{t('today.emptyState.title')}</Text>
            <Text style={styles.emptySubtitle}>{t('today.emptyState.subtitle')}</Text>
          </View>
        )}

        {/* Featured hero card */}
        {featured && (
          <View>
            <Pressable
              style={styles.heroCard}
              onPress={() =>
                router.push({ pathname: '/recipe/[slug]', params: { slug: featured.recipe.slug } })
              }
              onLongPress={() => showFeedbackMenu(featured.recipe.id)}
            >
              <CuisineArt
                seed={featured.recipe.cuisineIds[0] ?? featured.recipe.slug}
                height={240}
                radius={RADIUS.card}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.65)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroCardOverlay}>
                <Text style={styles.heroCardLabel}>{t('today.pick')}</Text>
                <Text style={styles.heroCardTitle}>{featured.recipe.title.en}</Text>
                <View style={styles.heroCardMetaRow}>
                  <View style={styles.heroBadge}>
                    <Ionicons name="time-outline" size={14} color="#fff" />
                    <Text style={styles.heroBadgeText}>
                      {t('today.timeMin', { count: featured.recipe.totalMinutes })}
                    </Text>
                  </View>
                  <View style={styles.heroBadge}>
                    <Ionicons name="leaf-outline" size={14} color="#fff" />
                    <Text style={styles.heroBadgeText}>
                      {t('today.percentMatch', {
                        percent: Math.round(featured.breakdown.pantryMatch * 100),
                      })}
                    </Text>
                  </View>
                </View>
                <Text style={styles.heroReason}>"{featured.reason}"</Text>
              </View>

              {/* Feedback overflow */}
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  showFeedbackMenu(featured.recipe.id);
                }}
                style={styles.overflowBtn}
                hitSlop={8}
                accessibilityLabel={t('today.recipeFeedback')}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color="#fff" />
              </Pressable>
            </Pressable>
            {ackId === featured.recipe.id && (
              <Text style={styles.ackText}>{t('today.feedback.thanks')}</Text>
            )}
          </View>
        )}

        {/* Remaining picks */}
        {rest.map((rec) => (
          <View key={rec.recipe.id}>
            <Pressable
              style={styles.card}
              onPress={() =>
                router.push({ pathname: '/recipe/[slug]', params: { slug: rec.recipe.slug } })
              }
              onLongPress={() => showFeedbackMenu(rec.recipe.id)}
            >
              <CuisineArt
                seed={rec.recipe.cuisineIds[0] ?? rec.recipe.slug}
                height={110}
                radius={RADIUS.md}
                style={{ width: 110 }}
              />
              <View style={styles.cardBody}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.cardMeta}>
                    {rec.recipe.mealTypes[0] ?? t('today.mealFallback')}
                  </Text>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      showFeedbackMenu(rec.recipe.id);
                    }}
                    hitSlop={8}
                    accessibilityLabel={t('today.recipeFeedback')}
                  >
                    <Ionicons name="ellipsis-horizontal" size={16} color={COLORS.ink300} />
                  </Pressable>
                </View>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {rec.recipe.title.en}
                </Text>
                <View style={styles.badgeRow}>
                  <Badge icon="time-outline">
                    {t('today.timeMin', { count: rec.recipe.totalMinutes })}
                  </Badge>
                  <Badge icon="leaf-outline">
                    {`${Math.round(rec.breakdown.pantryMatch * 100)}%`}
                  </Badge>
                  {rec.missingIngredientIds.length > 0 && (
                    <Badge tone="warn">
                      {t('today.missShort', { count: rec.missingIngredientIds.length })}
                    </Badge>
                  )}
                </View>
              </View>
            </Pressable>
            {ackId === rec.recipe.id && (
              <Text style={styles.ackText}>{t('today.feedback.thanks')}</Text>
            )}
          </View>
        ))}

        <Text style={styles.demoBanner}>{t('demo.banner')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Badge({
  children,
  icon,
  tone,
}: {
  children: React.ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'warn';
}) {
  return (
    <View style={[styles.badge, tone === 'warn' && styles.badgeWarn]}>
      {icon && (
        <Ionicons
          name={icon}
          size={12}
          color={tone === 'warn' ? COLORS.saffron700 : COLORS.ink500}
        />
      )}
      <Text style={[styles.badgeText, tone === 'warn' && styles.badgeTextWarn]}>{children}</Text>
    </View>
  );
}

function SkeletonList() {
  return (
    <>
      <View style={[styles.heroCard, styles.skeleton, { height: 240 }]} />
      {[0, 1].map((i) => (
        <View key={i} style={[styles.card, styles.skeleton, { height: 130 }]} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  container: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  header: { marginBottom: SPACING.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { color: COLORS.ink500, fontFamily: FONTS.body, fontSize: FONT_SIZES.md },
  profileBtn: { padding: 2 },
  hero: {
    color: COLORS.ink900,
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.display,
    lineHeight: 48,
    marginTop: 4,
  },
  heroEm: { color: COLORS.emerald700, fontStyle: 'italic' },

  filterRow: { gap: SPACING.xs, marginBottom: SPACING.lg, paddingRight: SPACING.lg },
  filterChip: {
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.ink100,
    backgroundColor: COLORS.white,
    minHeight: 36,
    justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: COLORS.emerald700, borderColor: COLORS.emerald700 },
  filterText: { color: COLORS.ink700, fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm },
  filterTextActive: { color: COLORS.cream },

  heroCard: {
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOW.card,
    backgroundColor: COLORS.white,
  },
  heroCardOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: SPACING.lg,
  },
  heroCardLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroCardTitle: {
    color: '#fff',
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.xxl,
    lineHeight: 32,
    marginTop: 4,
  },
  heroCardMetaRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.sm },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
  },
  heroBadgeText: { color: '#fff', fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.xs },
  heroReason: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
    marginTop: SPACING.sm,
  },

  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
    padding: SPACING.sm,
    gap: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.soft,
  },
  cardBody: { flex: 1, paddingVertical: SPACING.xs },
  cardMeta: {
    color: COLORS.ink400,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  cardTitle: {
    color: COLORS.ink900,
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.lg,
    marginTop: 2,
    lineHeight: 22,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.xs },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 3,
    backgroundColor: COLORS.ink50,
    borderWidth: 1,
    borderColor: COLORS.ink100,
  },
  badgeWarn: { backgroundColor: 'rgba(234,144,66,0.10)', borderColor: 'rgba(234,144,66,0.20)' },
  badgeText: { color: COLORS.ink700, fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.xs },
  badgeTextWarn: { color: COLORS.saffron700 },

  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    ...SHADOW.soft,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.xl,
    color: COLORS.ink900,
    marginTop: SPACING.sm,
  },
  emptySubtitle: {
    color: COLORS.ink500,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.xs,
  },

  overflowBtn: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ackText: {
    color: COLORS.emerald700,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xxs,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  skeleton: { backgroundColor: COLORS.ink50 },
  demoBanner: {
    color: COLORS.ink400,
    fontFamily: FONTS.body,
    textAlign: 'center',
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.xs,
  },
});
