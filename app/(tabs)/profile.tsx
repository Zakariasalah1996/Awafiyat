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
  getExpoPushToken,
  registerPushToken,
  getSavedPushToken,
} from "@/lib/notifications";
import { useAlarm, ALARM_TONE_LABELS, type AlarmTone } from "@/lib/alarm-context";

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
  const [saveMessage, setSaveMessage] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pushTokenStatus, setPushTokenStatus] = useState<"checking" | "registered" | "not_registered" | "error">("checking");
  const [isRegisteringToken, setIsRegisteringToken] = useState(false);
  const { settings: alarmSettings, updateSettings: updateAlarmSettings, previewTone } = useAlarm();

  // Request notification permissions on mount
  useEffect(() => {
    requestNotificationPermissions().then(setPermissionGranted);
    // Check if push token is registered
    checkPushTokenStatus();
  }, []);

  const checkPushTokenStatus = async () => {
    try {
      setPushTokenStatus("checking");
      const savedToken = await getSavedPushToken();
      if (savedToken) {
        setPushTokenStatus("registered");
      } else {
        setPushTokenStatus("not_registered");
      }
    } catch {
      setPushTokenStatus("error");
    }
  };

  const handleReRegisterToken = async () => {
    setIsRegisteringToken(true);
    try {
      const token = await getExpoPushToken();
      if (token) {
        await registerPushToken(token);
        setPushTokenStatus("registered");
        Alert.alert("تم بنجاح", "تم تسجيل الجهاز للإشعارات بنجاح");
      } else {
        setPushTokenStatus("error");
        Alert.alert("خطأ", "تعذر الحصول على رمز الإشعارات. تأكد من اتصال الإنترنت وحاول مجدداً.");
      }
    } catch (e) {
      setPushTokenStatus("error");
      Alert.alert("خطأ", "حدث خطأ أثناء التسجيل. حاول مجدداً.");
    } finally {
      setIsRegisteringToken(false);
    }
  };

  const startEdit = (field: string, currentValue: string) => {
    // Save the previous field's value before switching to a new field
    if (editingField && tempValue) {
      updateProfile({ [editingField]: tempValue }).then(() => {
        setHasUnsavedChanges(true);
      });
    }
    setEditingField(field);
    setTempValue(currentValue);
  };

  const saveEdit = async (field: string) => {
    if (tempValue) {
      await updateProfile({ [field]: tempValue });
      setHasUnsavedChanges(true);
    }
    setEditingField(null);
  };

  const handleSaveAll = async () => {
    // إعادة حفظ جميع البيانات الحالية في AsyncStorage
    await updateProfile({
      name: profile.name,
      phone: profile.phone,
      age: profile.age,
      gender: profile.gender,
      country: profile.country,
      healthCondition: profile.healthCondition,
    });
    setHasUnsavedChanges(false);
    setSaveMessage("تم حفظ جميع المعلومات بنجاح");
    setTimeout(() => setSaveMessage(""), 3000);
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
    if (key === "promotions") {
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
    // إلغاء إشعارات الوجبات المجدولة إن وجدت
    await cancelMealReminder("breakfast");
    await cancelMealReminder("lunch");
    await cancelMealReminder("dinner");
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
          <View className="flex-row items-center justify-between py-3">
            <Text className="text-base font-bold text-foreground">المعلومات الشخصية</Text>
          </View>
          {renderEditableField("الاسم", "name", profile.name, "أدخل اسمك")}
          {renderEditableField("رقم الهاتف", "phone", profile.phone, "أدخل رقمك", "phone-pad")}
          {renderEditableField("العمر", "age", profile.age, "أدخل عمرك", "numeric")}
          <View className="flex-row items-center py-4">
            <Text className="text-base text-foreground flex-1 font-medium">الجنس</Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => { updateProfile({ gender: "male" }); setHasUnsavedChanges(true); }}
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
                onPress={() => { updateProfile({ gender: "female" }); setHasUnsavedChanges(true); }}
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
                onPress={() => { updateProfile({ country: c.key as any }); setHasUnsavedChanges(true); }}
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

        {/* زر حفظ المعلومات الشخصية */}
        <TouchableOpacity
          onPress={handleSaveAll}
          style={{
            marginHorizontal: 20,
            marginBottom: 16,
            paddingVertical: 16,
            borderRadius: 16,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
          activeOpacity={0.8}
        >
          <MaterialIcons name="save" size={22} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
            حفظ المعلومات
          </Text>
        </TouchableOpacity>

        {/* رسالة تأكيد الحفظ */}
        {saveMessage !== "" && (
          <View
            style={{
              marginHorizontal: 20,
              marginBottom: 16,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              backgroundColor: `${colors.success}20`,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <MaterialIcons name="check-circle" size={20} color={colors.success} />
            <Text style={{ color: colors.success, fontSize: 15, fontWeight: "600" }}>
              {saveMessage}
            </Text>
          </View>
        )}

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

          {/* Push Token Status */}
          <View
            className="mb-3 p-3 rounded-xl flex-row items-center justify-between"
            style={{
              backgroundColor:
                pushTokenStatus === "registered" ? `${colors.success}15` :
                pushTokenStatus === "checking" ? `${colors.border}40` :
                `${colors.warning}15`,
            }}
          >
            <View className="flex-row items-center flex-1">
              <MaterialIcons
                name={
                  pushTokenStatus === "registered" ? "notifications-active" :
                  pushTokenStatus === "checking" ? "hourglass-empty" :
                  "notifications-off"
                }
                size={18}
                color={
                  pushTokenStatus === "registered" ? colors.success :
                  pushTokenStatus === "checking" ? colors.muted :
                  colors.warning
                }
              />
              <Text
                className="text-sm mr-2 flex-1"
                style={{
                  color:
                    pushTokenStatus === "registered" ? colors.success :
                    pushTokenStatus === "checking" ? colors.muted :
                    colors.warning,
                }}
              >
                {pushTokenStatus === "registered" ? "الجهاز مسجل لاستقبال الإشعارات" :
                 pushTokenStatus === "checking" ? "جاري التحقق..." :
                 "الجهاز غير مسجل للإشعارات"}
              </Text>
            </View>
            {pushTokenStatus !== "registered" && pushTokenStatus !== "checking" && (
              <TouchableOpacity
                onPress={handleReRegisterToken}
                disabled={isRegisteringToken}
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
                  {isRegisteringToken ? "جاري..." : "تسجيل"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {!permissionGranted && (
            <View className="mb-3 p-3 rounded-lg" style={{ backgroundColor: `${colors.warning}15` }}>
              <Text className="text-sm" style={{ color: colors.warning }}>
                الإشعارات غير مفعّلة. فعّل أي إشعار لطلب الإذن.
              </Text>
            </View>
          )}
          {[
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

        {/* Alarm Settings */}
        <View className="mx-5 bg-surface rounded-2xl px-5 py-4 mb-4 border" style={{ borderColor: colors.border }}>
          <View className="flex-row items-center mb-3">
            <Text className="text-lg ml-2">⏰</Text>
            <Text className="text-base font-bold text-foreground">إعدادات المنبه</Text>
          </View>

          {/* تفعيل/إيقاف الصوت */}
          <View className="flex-row items-center justify-between py-3 border-b" style={{ borderBottomColor: colors.border }}>
            <View className="flex-1 mr-3">
              <Text className="text-base text-foreground">صوت المنبه</Text>
              <Text className="text-xs text-muted mt-0.5">تفعيل أو إيقاف صوت المنبه</Text>
            </View>
            <Switch
              value={alarmSettings.enabled}
              onValueChange={(v) => updateAlarmSettings({ enabled: v })}
              trackColor={{ false: colors.border, true: `${colors.primary}60` }}
              thumbColor={alarmSettings.enabled ? colors.primary : "#f4f3f4"}
            />
          </View>

          {/* تفعيل/إيقاف الاهتزاز */}
          <View className="flex-row items-center justify-between py-3 border-b" style={{ borderBottomColor: colors.border }}>
            <View className="flex-1 mr-3">
              <Text className="text-base text-foreground">الاهتزاز</Text>
              <Text className="text-xs text-muted mt-0.5">اهتزاز مع صوت المنبه</Text>
            </View>
            <Switch
              value={alarmSettings.vibration}
              onValueChange={(v) => updateAlarmSettings({ vibration: v })}
              trackColor={{ false: colors.border, true: `${colors.primary}60` }}
              thumbColor={alarmSettings.vibration ? colors.primary : "#f4f3f4"}
            />
          </View>

          {/* مستوى الصوت */}
          {alarmSettings.enabled && (
            <View className="py-3 border-b" style={{ borderBottomColor: colors.border }}>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-base text-foreground">مستوى الصوت</Text>
                <Text className="text-sm text-muted">{Math.round(alarmSettings.volume * 100)}%</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Text className="text-sm text-muted">🔈</Text>
                <View className="flex-1 h-8 justify-center">
                  <View className="h-2 rounded-full" style={{ backgroundColor: colors.border }}>
                    <View
                      className="h-2 rounded-full"
                      style={{
                        backgroundColor: colors.primary,
                        width: `${alarmSettings.volume * 100}%`,
                      }}
                    />
                  </View>
                  <View className="flex-row justify-between mt-2">
                    {[0.25, 0.5, 0.75, 1.0].map((v) => (
                      <TouchableOpacity
                        key={v}
                        onPress={() => updateAlarmSettings({ volume: v })}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 12,
                          backgroundColor: alarmSettings.volume === v ? colors.primary : `${colors.border}50`,
                        }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{ color: alarmSettings.volume === v ? "#fff" : colors.muted }}
                        >
                          {Math.round(v * 100)}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <Text className="text-sm text-muted">🔊</Text>
              </View>
            </View>
          )}

          {/* اختيار النغمة */}
          {alarmSettings.enabled && (
            <View className="py-3">
              <Text className="text-base text-foreground mb-2">نغمات التذكير</Text>
              <Text className="text-xs text-muted mb-3">كل وجبة لها نغمتها الخاصة تلقائياً • اضغطي للمعاينة</Text>
              {(Object.keys(ALARM_TONE_LABELS) as AlarmTone[]).map((tone) => (
                <TouchableOpacity
                  key={tone}
                  onPress={() => {
                    updateAlarmSettings({ tone });
                    previewTone(tone);
                  }}
                  className="flex-row items-center justify-between py-3 px-3 rounded-xl mb-1"
                  style={{
                    backgroundColor: alarmSettings.tone === tone ? `${colors.primary}15` : "transparent",
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    className="text-base"
                    style={{
                      color: alarmSettings.tone === tone ? colors.primary : colors.foreground,
                      fontWeight: alarmSettings.tone === tone ? "700" : "400",
                    }}
                  >
                    {ALARM_TONE_LABELS[tone]}
                  </Text>
                  {alarmSettings.tone === tone && (
                    <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
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

        {/* Admin Stats - only shown for admins (phone number check as simple gate) */}
        <TouchableOpacity
          onPress={() => router.push("/sections/admin-stats" as any)}
          className="mx-5 bg-surface rounded-2xl px-5 py-4 mb-4 border flex-row items-center justify-between"
          style={{ borderColor: colors.border }}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center">
            <Text className="text-lg ml-2">📊</Text>
            <Text className="text-base font-bold text-foreground">لوحة الإحصائيات</Text>
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
