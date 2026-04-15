import { useState, useEffect } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useUser, type HealthCondition } from "@/lib/user-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useThemeContext } from "@/lib/theme-provider";
import {
  requestNotificationPermissions,
  scheduleMealReminder,
  cancelMealReminder,
  scheduleDailyMotivation,
  cancelAllNotifications,
} from "@/lib/notifications";

const HEALTH_LABELS: Record<HealthCondition, string> = {
  diabetes: "السكري",
  hypertension: "ضغط الدم",
  obesity: "السمنة",
  cholesterol: "الكوليسترول",
  none: "لا أعاني من شيء",
};

const COUNTRY_OPTIONS: { key: string; label: string; flag: string }[] = [
  { key: "iraq", label: "العراق", flag: "🇮🇶" },
  { key: "saudi", label: "السعودية", flag: "🇸🇦" },
  { key: "uae", label: "الإمارات", flag: "🇦🇪" },
  { key: "egypt", label: "مصر", flag: "🇪🇬" },
];

// Default meal times
const MEAL_TIMES = {
  breakfast: { hour: 7, minute: 30 },
  lunch: { hour: 12, minute: 30 },
  dinner: { hour: 19, minute: 0 },
};

export default function ProfileScreen() {
  const colors = useColors();
  const { profile, updateProfile, resetProfile } = useUser();
  const { colorScheme, setColorScheme } = useThemeContext();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Request notification permissions on mount
  useEffect(() => {
    requestNotificationPermissions().then(setPermissionGranted);
  }, []);

  const startEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setTempValue(currentValue);
  };

  const saveEdit = async (field: string) => {
    await updateProfile({ [field]: tempValue });
    setEditingField(null);
  };

  const handleLogout = () => {
    Alert.alert(
      "تسجيل الخروج",
      "هل أنت متأكد من تسجيل الخروج؟ ستفقد جميع بياناتك المحفوظة.",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تسجيل الخروج",
          style: "destructive",
          onPress: async () => {
            await cancelAllNotifications();
            await resetProfile();
            router.replace("/onboarding" as any);
          },
        },
      ]
    );
  };

  const toggleNotification = async (key: string, value: boolean) => {
    // Request permissions first if not granted
    if (value && !permissionGranted) {
      const granted = await requestNotificationPermissions();
      setPermissionGranted(granted);
      if (!granted) {
        Alert.alert(
          "الإشعارات معطلة",
          "يرجى تفعيل الإشعارات من إعدادات الجهاز للاستفادة من هذه الميزة."
        );
        return;
      }
    }

    // Update profile
    await updateProfile({
      notifications: { ...profile.notifications, [key]: value },
    });

    // Schedule or cancel the actual notification
    if (key === "breakfast" || key === "lunch" || key === "dinner") {
      if (value) {
        const time = MEAL_TIMES[key as keyof typeof MEAL_TIMES];
        await scheduleMealReminder(key as "breakfast" | "lunch" | "dinner", time.hour, time.minute);
      } else {
        await cancelMealReminder(key);
      }
    } else if (key === "promotions") {
      if (value) {
        await scheduleDailyMotivation();
      } else {
        // Cancel motivation notifications
        const Notifications = require("expo-notifications");
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const n of scheduled) {
          if (n.content.data?.type === "motivation") {
            await Notifications.cancelScheduledNotificationAsync(n.identifier);
          }
        }
      }
    }
  };

  const disableAllNotifications = async () => {
    await cancelAllNotifications();
    await updateProfile({
      notifications: {
        breakfast: false,
        lunch: false,
        dinner: false,
        fridge: false,
        shopping: false,
        promotions: false,
      },
    });
  };

  const renderEditableField = (
    label: string,
    field: string,
    value: string,
    placeholder: string,
    keyboardType: "default" | "phone-pad" | "numeric" = "default"
  ) => (
    <View className="flex-row items-center py-4 border-b" style={{ borderBottomColor: colors.border }}>
      <Text className="text-base text-foreground flex-1 font-medium">{label}</Text>
      {editingField === field ? (
        <View className="flex-row items-center gap-2">
          <TextInput
            value={tempValue}
            onChangeText={setTempValue}
            className="text-base px-3 py-1 rounded-lg min-w-[120px] text-left"
            style={{ backgroundColor: colors.background, color: colors.foreground, borderWidth: 1, borderColor: colors.primary }}
            keyboardType={keyboardType}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => saveEdit(field)}
          />
          <TouchableOpacity onPress={() => saveEdit(field)}>
            <MaterialIcons name="check" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => startEdit(field, value)}
          className="flex-row items-center gap-1"
        >
          <Text className="text-base text-muted">{value || placeholder}</Text>
          <MaterialIcons name="edit" size={16} color={colors.muted} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header with avatar */}
        <View className="items-center pt-6 pb-4">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-3"
            style={{ backgroundColor: `${colors.primary}20` }}
          >
            <Text className="text-4xl">👨‍🍳</Text>
          </View>
          <Text className="text-xl font-bold text-foreground">
            {profile.name || "مستخدم عافيات"}
          </Text>
          {profile.isSubscribed && (
            <View className="flex-row items-center mt-1 px-3 py-1 rounded-full" style={{ backgroundColor: "#FFD70030" }}>
              <Text className="text-sm font-medium" style={{ color: "#B8860B" }}>عضوية ذهبية ⭐</Text>
            </View>
          )}
        </View>

        {/* Personal Info */}
        <View className="mx-5 bg-surface rounded-2xl px-5 py-2 mb-4 border" style={{ borderColor: colors.border }}>
          <Text className="text-base font-bold text-foreground py-3">المعلومات الشخصية</Text>
          {renderEditableField("الاسم", "name", profile.name, "أدخل اسمك")}
          {renderEditableField("رقم الهاتف", "phone", profile.phone, "أدخل رقمك", "phone-pad")}
          {renderEditableField("العمر", "age", profile.age, "أدخل عمرك", "numeric")}
          <View className="flex-row items-center py-4">
            <Text className="text-base text-foreground flex-1 font-medium">الجنس</Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => updateProfile({ gender: "male" })}
                className="px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: profile.gender === "male" ? `${colors.primary}20` : colors.background,
                  borderWidth: 1,
                  borderColor: profile.gender === "male" ? colors.primary : colors.border,
                }}
              >
                <Text style={{ color: profile.gender === "male" ? colors.primary : colors.muted }}>ذكر</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => updateProfile({ gender: "female" })}
                className="px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: profile.gender === "female" ? `${colors.primary}20` : colors.background,
                  borderWidth: 1,
                  borderColor: profile.gender === "female" ? colors.primary : colors.border,
                }}
              >
                <Text style={{ color: profile.gender === "female" ? colors.primary : colors.muted }}>أنثى</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Country Selection */}
        <View className="mx-5 bg-surface rounded-2xl px-5 py-4 mb-4 border" style={{ borderColor: colors.border }}>
          <View className="flex-row items-center mb-3">
            <Text className="text-lg ml-2">🌍</Text>
            <Text className="text-base font-bold text-foreground">الدولة</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {COUNTRY_OPTIONS.map((c) => (
              <TouchableOpacity
                key={c.key}
                onPress={() => updateProfile({ country: c.key as any })}
                className="px-4 py-2.5 rounded-xl flex-row items-center gap-2"
                style={{
                  backgroundColor: profile.country === c.key ? `${colors.primary}20` : colors.background,
                  borderWidth: 1.5,
                  borderColor: profile.country === c.key ? colors.primary : colors.border,
                }}
              >
                <Text style={{ fontSize: 18 }}>{c.flag}</Text>
                <Text
                  className="text-sm font-medium"
                  style={{ color: profile.country === c.key ? colors.primary : colors.foreground }}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Health Condition */}
        <View className="mx-5 bg-surface rounded-2xl px-5 py-4 mb-4 border" style={{ borderColor: colors.border }}>
          <View className="flex-row items-center mb-2">
            <Text className="text-lg ml-2">🩺</Text>
            <Text className="text-base font-bold text-foreground">الحالة الصحية</Text>
          </View>
          <Text className="text-base text-muted mb-3">
            الحالة الحالية: {HEALTH_LABELS[profile.healthCondition]}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/onboarding" as any)}
            className="py-2"
          >
            <Text className="text-sm font-medium" style={{ color: colors.primary }}>تعديل الحالة الصحية</Text>
          </TouchableOpacity>
        </View>

        {/* Family Members */}
        <TouchableOpacity
          onPress={() => router.push("/sections/family-members" as any)}
          className="mx-5 bg-surface rounded-2xl px-5 py-4 mb-4 border flex-row items-center justify-between"
          style={{ borderColor: colors.border }}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center">
            <Text className="text-lg ml-2">👨‍👩‍👧‍👦</Text>
            <View>
              <Text className="text-base font-bold text-foreground">أفراد العائلة</Text>
              <Text className="text-sm text-muted">
                {profile.familyMembers.length + 1} فرد (أنت + {profile.familyMembers.length})
              </Text>
            </View>
          </View>
          <View className="flex-row items-center">
            <Text className="text-sm font-medium" style={{ color: colors.primary }}>إدارة</Text>
            <MaterialIcons name="chevron-left" size={20} color={colors.muted} />
          </View>
        </TouchableOpacity>

        {/* Notification Settings */}
        <View className="mx-5 bg-surface rounded-2xl px-5 py-4 mb-4 border" style={{ borderColor: colors.border }}>
          <View className="flex-row items-center mb-3">
            <Text className="text-lg ml-2">🔔</Text>
            <Text className="text-base font-bold text-foreground">إعدادات الإشعارات</Text>
          </View>
          {!permissionGranted && (
            <View className="mb-3 p-3 rounded-lg" style={{ backgroundColor: `${colors.warning}15` }}>
              <Text className="text-sm" style={{ color: colors.warning }}>
                الإشعارات غير مفعّلة. فعّل أي إشعار لطلب الإذن.
              </Text>
            </View>
          )}
          {[
            { key: "breakfast", label: "تذكير الفطور", desc: "يومياً الساعة 7:30 صباحاً" },
            { key: "lunch", label: "تذكير الغداء", desc: "يومياً الساعة 12:30 ظهراً" },
            { key: "dinner", label: "تذكير العشاء", desc: "يومياً الساعة 7:00 مساءً" },
            { key: "fridge", label: "تذكير الثلاجة", desc: "تنبيه بمحتويات الثلاجة" },
            { key: "shopping", label: "تذكير التسوق", desc: "تنبيه بقائمة المشتريات" },
            { key: "promotions", label: "نصائح وتحفيز", desc: "نصائح صحية يومية" },
          ].map((item) => (
            <View
              key={item.key}
              className="flex-row items-center justify-between py-3 border-b"
              style={{ borderBottomColor: colors.border }}
            >
              <View className="flex-1 mr-3">
                <Text className="text-base text-foreground">{item.label}</Text>
                <Text className="text-xs text-muted mt-0.5">{item.desc}</Text>
              </View>
              <Switch
                value={profile.notifications[item.key as keyof typeof profile.notifications]}
                onValueChange={(v) => toggleNotification(item.key, v)}
                trackColor={{ false: colors.border, true: `${colors.primary}60` }}
                thumbColor={
                  profile.notifications[item.key as keyof typeof profile.notifications]
                    ? colors.primary
                    : "#f4f3f4"
                }
              />
            </View>
          ))}
          <TouchableOpacity onPress={disableAllNotifications} className="py-3 items-center">
            <Text className="text-sm" style={{ color: colors.error }}>إيقاف جميع الإشعارات</Text>
          </TouchableOpacity>
        </View>

        {/* Tried Recipes */}
        <TouchableOpacity
          onPress={() => router.push("/sections/tried-recipes" as any)}
          className="mx-5 bg-surface rounded-2xl px-5 py-4 mb-4 border flex-row items-center justify-between"
          style={{ borderColor: colors.border }}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center">
            <Text className="text-lg ml-2">📋</Text>
            <Text className="text-base font-bold text-foreground">الوصفات المجرّبة</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-sm text-muted ml-1">{profile.triedRecipes.length} وصفة</Text>
            <MaterialIcons name="chevron-left" size={20} color={colors.muted} />
          </View>
        </TouchableOpacity>

        {/* Dark Mode */}
        <View className="mx-5 bg-surface rounded-2xl px-5 py-4 mb-4 border" style={{ borderColor: colors.border }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="text-lg ml-2">🌙</Text>
              <Text className="text-base font-bold text-foreground">الوضع الداكن</Text>
            </View>
            <Switch
              value={colorScheme === "dark"}
              onValueChange={(v) => {
                const newScheme = v ? "dark" : "light";
                setColorScheme(newScheme);
                updateProfile({ darkMode: v });
              }}
              trackColor={{ false: colors.border, true: `${colors.primary}60` }}
              thumbColor={colorScheme === "dark" ? colors.primary : "#f4f3f4"}
            />
          </View>
        </View>

        {/* App Info */}
        <TouchableOpacity
          onPress={() => router.push("/sections/about" as any)}
          className="mx-5 bg-surface rounded-2xl px-5 py-4 mb-4 border flex-row items-center justify-between"
          style={{ borderColor: colors.border }}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center">
            <Text className="text-lg ml-2">ℹ️</Text>
            <Text className="text-base font-bold text-foreground">عن التطبيق</Text>
          </View>
          <MaterialIcons name="chevron-left" size={20} color={colors.muted} />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          className="mx-5 py-4 rounded-2xl items-center mb-4"
          style={{ backgroundColor: `${colors.error}15` }}
          activeOpacity={0.7}
        >
          <Text className="text-base font-bold" style={{ color: colors.error }}>
            تسجيل الخروج
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
