import { useState } from "react";
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

const HEALTH_LABELS: Record<HealthCondition, string> = {
  diabetes: "السكري",
  hypertension: "ضغط الدم",
  obesity: "السمنة",
  cholesterol: "الكوليسترول",
  none: "لا أعاني من شيء",
};

export default function ProfileScreen() {
  const colors = useColors();
  const { profile, updateProfile, resetProfile } = useUser();
  const { colorScheme, setColorScheme } = useThemeContext();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");

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
            await resetProfile();
            router.replace("/onboarding" as any);
          },
        },
      ]
    );
  };

  const toggleNotification = async (key: string, value: boolean) => {
    await updateProfile({
      notifications: { ...profile.notifications, [key]: value },
    });
  };

  const disableAllNotifications = async () => {
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
          <Text className="text-base font-bold text-foreground py-3">معلوماتي الأساسية</Text>
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

        {/* Health Condition */}
        <View className="mx-5 bg-surface rounded-2xl px-5 py-4 mb-4 border" style={{ borderColor: colors.border }}>
          <View className="flex-row items-center mb-2">
            <Text className="text-lg ml-2">🩺</Text>
            <Text className="text-base font-bold text-foreground">حالتي الصحية</Text>
          </View>
          <Text className="text-base text-muted mb-3">
            أعاني من: {HEALTH_LABELS[profile.healthCondition]}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/onboarding" as any)}
            className="py-2"
          >
            <Text className="text-sm font-medium" style={{ color: colors.primary }}>تعديل الحالة الصحية</Text>
          </TouchableOpacity>
        </View>

        {/* Family Members */}
        <View className="mx-5 bg-surface rounded-2xl px-5 py-4 mb-4 border" style={{ borderColor: colors.border }}>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Text className="text-lg ml-2">👨‍👩‍👧‍👦</Text>
              <Text className="text-base font-bold text-foreground">أفراد العائلة</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                const newMember = { id: Date.now().toString(), name: `فرد ${profile.familyMembers.length + 1}` };
                updateProfile({ familyMembers: [...profile.familyMembers, newMember] });
              }}
              className="px-3 py-1 rounded-lg"
              style={{ backgroundColor: `${colors.primary}15` }}
            >
              <Text className="text-sm font-medium" style={{ color: colors.primary }}>+ إضافة فرد</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-sm text-muted">
            عدد أفراد العائلة: {profile.familyMembers.length + 1} (أنت + {profile.familyMembers.length})
          </Text>
        </View>

        {/* Notification Settings */}
        <View className="mx-5 bg-surface rounded-2xl px-5 py-4 mb-4 border" style={{ borderColor: colors.border }}>
          <View className="flex-row items-center mb-3">
            <Text className="text-lg ml-2">🔔</Text>
            <Text className="text-base font-bold text-foreground">إعدادات الإشعارات</Text>
          </View>
          {[
            { key: "breakfast", label: "تذكير الفطور" },
            { key: "lunch", label: "تذكير الغداء" },
            { key: "dinner", label: "تذكير العشاء" },
            { key: "fridge", label: "تذكير الثلاجة" },
            { key: "shopping", label: "تذكير التسوق" },
            { key: "promotions", label: "عروض واشتراك" },
          ].map((item) => (
            <View
              key={item.key}
              className="flex-row items-center justify-between py-3 border-b"
              style={{ borderBottomColor: colors.border }}
            >
              <Text className="text-base text-foreground">{item.label}</Text>
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
            <Text className="text-sm text-muted">تعطيل الكل</Text>
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
            <Text className="text-base font-bold text-foreground">وصفاتي المجربة</Text>
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
              <Text className="text-base font-bold text-foreground">المظهر الداكن</Text>
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
            <Text className="text-base font-bold text-foreground">معلومات التطبيق</Text>
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
            🚪 تسجيل الخروج
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
