import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  I18nManager,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

I18nManager.forceRTL(true);

interface StatCardProps {
  emoji: string;
  label: string;
  value: number | string;
  bgColor: string;
  textColor: string;
}

function StatCard({ emoji, label, value, bgColor, textColor }: StatCardProps) {
  return (
    <View
      className="rounded-2xl p-5 mb-3"
      style={{ backgroundColor: bgColor }}
    >
      <View className="flex-row items-center justify-between" style={{ flexDirection: "row-reverse" }}>
        <View style={{ alignItems: "flex-end" }}>
          <Text className="text-base font-medium" style={{ color: textColor, textAlign: "right" }}>
            {label}
          </Text>
          <Text className="text-3xl font-bold mt-1" style={{ color: textColor }}>
            {value}
          </Text>
        </View>
        <Text style={{ fontSize: 36 }}>{emoji}</Text>
      </View>
    </View>
  );
}

export default function AdminStatsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = trpc.admin.dashboard.useQuery(undefined, {
    retry: false,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const totalSubscribers = data
    ? (data.freeSubscriptions ?? 0) +
      (data.monthlySubscriptions ?? 0) +
      (data.yearlySubscriptions ?? 0) +
      (data.promoSubscriptions ?? 0)
    : 0;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View
          className="px-5 pt-4 pb-2 flex-row items-center justify-between"
          style={{ flexDirection: "row-reverse" }}
        >
          <Text
            className="text-foreground font-bold"
            style={{ fontSize: 22, textAlign: "right" }}
          >
            لوحة الإحصائيات
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconSymbol name="chevron.right" size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="px-5 pt-4">
          {isLoading && !refreshing ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="text-muted mt-4" style={{ textAlign: "center" }}>
                جاري تحميل الإحصائيات...
              </Text>
            </View>
          ) : error ? (
            <View
              className="rounded-2xl p-6 items-center"
              style={{ backgroundColor: `${colors.error}15` }}
            >
              <Text style={{ fontSize: 40 }}>🔒</Text>
              <Text
                className="font-bold mt-3"
                style={{ color: colors.error, fontSize: 18, textAlign: "center" }}
              >
                غير مصرح لك بالوصول
              </Text>
              <Text
                className="text-muted mt-2"
                style={{ fontSize: 14, textAlign: "center", lineHeight: 22 }}
              >
                هذه الصفحة متاحة فقط للمشرفين. إذا كنت مشرفاً، تأكد من تسجيل الدخول بالحساب الصحيح.
              </Text>
            </View>
          ) : data ? (
            <>
              {/* Section: المستخدمون */}
              <Text
                className="text-foreground font-bold mb-3"
                style={{ fontSize: 17, textAlign: "right" }}
              >
                👥 المستخدمون
              </Text>

              <StatCard
                emoji="👤"
                label="إجمالي المستخدمين المسجلين"
                value={data.totalUsers ?? 0}
                bgColor={`${colors.primary}15`}
                textColor={colors.primary}
              />

              {/* Section: الاشتراكات */}
              <Text
                className="text-foreground font-bold mb-3 mt-2"
                style={{ fontSize: 17, textAlign: "right" }}
              >
                📊 الاشتراكات
              </Text>

              <StatCard
                emoji="🎯"
                label="إجمالي المشتركين"
                value={totalSubscribers}
                bgColor={`${colors.success}15`}
                textColor={colors.success}
              />

              <View className="flex-row gap-3 mb-3" style={{ flexDirection: "row-reverse" }}>
                <View
                  className="flex-1 rounded-2xl p-4"
                  style={{ backgroundColor: "#E8F5E9" }}
                >
                  <Text style={{ fontSize: 24, textAlign: "center" }}>🆓</Text>
                  <Text
                    className="font-bold mt-1"
                    style={{ color: "#2E7D32", fontSize: 22, textAlign: "center" }}
                  >
                    {data.freeSubscriptions ?? 0}
                  </Text>
                  <Text
                    style={{ color: "#2E7D32", fontSize: 13, textAlign: "center", marginTop: 2 }}
                  >
                    مجاني
                  </Text>
                </View>

                <View
                  className="flex-1 rounded-2xl p-4"
                  style={{ backgroundColor: "#E3F2FD" }}
                >
                  <Text style={{ fontSize: 24, textAlign: "center" }}>📅</Text>
                  <Text
                    className="font-bold mt-1"
                    style={{ color: "#1565C0", fontSize: 22, textAlign: "center" }}
                  >
                    {data.monthlySubscriptions ?? 0}
                  </Text>
                  <Text
                    style={{ color: "#1565C0", fontSize: 13, textAlign: "center", marginTop: 2 }}
                  >
                    شهري
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3 mb-3" style={{ flexDirection: "row-reverse" }}>
                <View
                  className="flex-1 rounded-2xl p-4"
                  style={{ backgroundColor: "#FFF8E1" }}
                >
                  <Text style={{ fontSize: 24, textAlign: "center" }}>🏆</Text>
                  <Text
                    className="font-bold mt-1"
                    style={{ color: "#F57F17", fontSize: 22, textAlign: "center" }}
                  >
                    {data.yearlySubscriptions ?? 0}
                  </Text>
                  <Text
                    style={{ color: "#F57F17", fontSize: 13, textAlign: "center", marginTop: 2 }}
                  >
                    سنوي
                  </Text>
                </View>

                <View
                  className="flex-1 rounded-2xl p-4"
                  style={{ backgroundColor: "#FCE4EC" }}
                >
                  <Text style={{ fontSize: 24, textAlign: "center" }}>🎁</Text>
                  <Text
                    className="font-bold mt-1"
                    style={{ color: "#880E4F", fontSize: 22, textAlign: "center" }}
                  >
                    {data.promoSubscriptions ?? 0}
                  </Text>
                  <Text
                    style={{ color: "#880E4F", fontSize: 13, textAlign: "center", marginTop: 2 }}
                  >
                    ترويجي
                  </Text>
                </View>
              </View>

              {/* Section: أخرى */}
              <Text
                className="text-foreground font-bold mb-3 mt-2"
                style={{ fontSize: 17, textAlign: "right" }}
              >
                📋 أخرى
              </Text>

              <StatCard
                emoji="💬"
                label="ملاحظات جديدة من المستخدمين"
                value={data.newFeedback ?? 0}
                bgColor={`${colors.warning}15`}
                textColor={colors.warning}
              />

              <StatCard
                emoji="🔔"
                label="إجمالي الإشعارات المرسلة"
                value={data.totalNotifications ?? 0}
                bgColor={`${colors.border}`}
                textColor={colors.foreground}
              />

              {/* Country Stats */}
              {data.countryStats && data.countryStats.length > 0 && (
                <>
                  <Text
                    className="text-foreground font-bold mb-3 mt-2"
                    style={{ fontSize: 17, textAlign: "right" }}
                  >
                    🌍 المستخدمون حسب الدولة
                  </Text>
                  <View
                    className="rounded-2xl p-4 mb-3"
                    style={{ backgroundColor: colors.surface }}
                  >
                    {data.countryStats.map((item: { country: string | null; count: number }, idx: number) => {
                      const countryFlags: Record<string, string> = {
                        iraq: "🇮🇶 العراق",
                        saudi: "🇸🇦 السعودية",
                        uae: "🇦🇪 الإمارات",
                        egypt: "🇪🇬 مصر",
                        other: "🌍 أخرى",
                      };
                      const label = (item.country ? countryFlags[item.country] : null) ?? item.country ?? "غير محدد";
                      const total = data.totalUsers || 1;
                      const pct = Math.round((item.count / total) * 100);
                      return (
                        <View
                          key={idx}
                          className="mb-3"
                          style={{ flexDirection: "column" }}
                        >
                          <View
                            className="flex-row items-center justify-between mb-1"
                            style={{ flexDirection: "row-reverse" }}
                          >
                            <Text
                              className="text-foreground font-medium"
                              style={{ fontSize: 14, textAlign: "right" }}
                            >
                              {label}
                            </Text>
                            <Text className="text-muted" style={{ fontSize: 13 }}>
                              {item.count} ({pct}%)
                            </Text>
                          </View>
                          <View
                            className="rounded-full overflow-hidden"
                            style={{ height: 8, backgroundColor: colors.border }}
                          >
                            <View
                              className="rounded-full"
                              style={{
                                height: 8,
                                width: `${pct}%`,
                                backgroundColor: colors.primary,
                              }}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Refresh hint */}
              <Text
                className="text-muted text-center mt-2"
                style={{ fontSize: 12 }}
              >
                اسحب للأسفل لتحديث الإحصائيات
              </Text>
            </>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
