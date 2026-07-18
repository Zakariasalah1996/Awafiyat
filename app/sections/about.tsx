import { ScrollView, Text, View, TouchableOpacity, Linking, I18nManager, Alert, Clipboard } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useState, useCallback } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { getApiBaseUrl } from "@/constants/oauth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getGuestUserId } from "@/lib/guest-auth";

I18nManager.forceRTL(true);

const SECTIONS = [
  {
    title: "عن التطبيق",
    emoji: "📱",
    content: `تطبيق "ألف عافيات" هو رفيقك اليومي في المطبخ والصحة. صُمم خصيصاً للعائلة العربية ليساعدك في تنظيم وجباتك، اكتشاف وصفات جديدة، والاهتمام بصحتك وصحة عائلتك.

يجمع التطبيق بين الذكاء الاصطناعي المتطور وخبرة المختصين لتقديم نصائح غذائية موثوقة ووصفات صحية تناسب حالتك الصحية.

الإصدار: 1.0.77`,
  },
  {
    title: "المميزات",
    emoji: "✨",
    content: `• ذكاء الثلاجة — أدخل المكونات المتوفرة لديك والذكاء الاصطناعي يقترح لك وصفات مناسبة
• جدول الطبخ الأسبوعي — نظّم وجباتك مع تنبيهات في الوقت المناسب
• مكتبة وصفات عربية — أكثر من 250 وصفة صحية ومجربة
• تحذيرات صحية ذكية — تنبيهات مخصصة حسب حالتك الصحية مع بدائل آمنة
• رفيق الدواء — تذكير بمواعيد الأدوية لضمان الالتزام
• رفيق الماء — متابعة شرب الماء يومياً
• قائمة التسوق الذكية — لا تنسَ شيئاً من السوق`,
  },
  {
    title: "سياسة الخصوصية",
    emoji: "🔒",
    content: `نحن نأخذ خصوصيتك على محمل الجد:

• البيانات الصحية: تُخزن محلياً على جهازك فقط ومشفرة بالكامل. لا نشاركها مع أي طرف ثالث.
• بيانات الحساب: الاسم ورقم الهاتف تُستخدم فقط لتحسين تجربتك داخل التطبيق.
• الذكاء الاصطناعي: الأسئلة التي تطرحها لا تُربط بهويتك الشخصية.
• لا نبيع بياناتك: نلتزم بعدم بيع أو مشاركة أي معلومات شخصية مع أطراف خارجية.
• حق الحذف: يمكنك حذف جميع بياناتك في أي وقت من إعدادات الحساب.

آخر تحديث: يوليو 2026`,
  },
  {
    title: "الشروط والأحكام",
    emoji: "📋",
    content: `باستخدامك لتطبيق "ألف عافيات"، فإنك توافق على:

• المحتوى الصحي: النصائح الغذائية والصحية في التطبيق هي للتوعية العامة فقط ولا تُغني عن استشارة الطبيب المختص.
• الوصفات: تم إعدادها بعناية لكن النتائج قد تختلف حسب جودة المكونات وطريقة التحضير.
• الاشتراكات: يمكن إلغاء الاشتراك في أي وقت. لا يتم استرداد المبالغ للفترة الحالية.
• المحتوى: جميع الوصفات والمحتوى محمي بحقوق الملكية الفكرية.`,
  },
];

// ===== شاشة تشخيص الإشعارات (مخفية - تظهر بالضغط 5 مرات على الإصدار) =====
function PushDiagnosticPanel({ colors }: { colors: any }) {
  const [status, setStatus] = useState<string>("اضغط للبدء");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState<string>("");

  const runDiagnostic = useCallback(async () => {
    if (Platform.OS === "web") {
      setStatus("الإشعارات غير مدعومة على الويب");
      return;
    }
    setLoading(true);
    setStatus("جاري الفحص...");
    const logs: string[] = [];

    try {
      // 1. فحص الصلاحيات
      const { status: permStatus } = await Notifications.getPermissionsAsync();
      logs.push(`صلاحية الإشعارات: ${permStatus}`);

      if (permStatus !== "granted") {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        logs.push(`طلب الصلاحية: ${newStatus}`);
        if (newStatus !== "granted") {
          setStatus(logs.join("\n") + "\n\n❌ الصلاحية مرفوضة");
          setLoading(false);
          return;
        }
      }

      // 2. فحص API URL
      const url = getApiBaseUrl();
      setApiUrl(url);
      logs.push(`API URL: ${url}`);

      // 3. محاولة الحصول على Expo Push Token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      logs.push(`EAS Project ID: ${projectId || "غير موجود"}`);

      let foundToken: string | null = null;

      if (projectId) {
        try {
          const expoToken = await Notifications.getExpoPushTokenAsync({ projectId });
          if (expoToken.data) {
            foundToken = expoToken.data;
            logs.push(`✅ Expo Token: ${expoToken.data.substring(0, 40)}...`);
          }
        } catch (e: any) {
          logs.push(`⚠️ Expo Token فشل: ${e?.message}`);
        }
      }

      // 4. محاولة FCM Native Token
      if (!foundToken) {
        try {
          const deviceToken = await Notifications.getDevicePushTokenAsync();
          if (deviceToken.data) {
            foundToken = `fcm:${deviceToken.data}`;
            logs.push(`✅ FCM Token: ${(deviceToken.data as string).substring(0, 40)}...`);
          }
        } catch (e: any) {
          logs.push(`⚠️ FCM Token فشل: ${e?.message}`);
        }
      }

      if (!foundToken) {
        setToken(null);
        setStatus(logs.join("\n") + "\n\n❌ فشل الحصول على token");
        setLoading(false);
        return;
      }

      setToken(foundToken);

      // 5. تسجيل الـ token في السيرفر
      logs.push(`\nجاري التسجيل في السيرفر...`);
      const guestId = await getGuestUserId();
      const platform = Platform.OS === "android" ? "android" : "ios";

      const response = await fetch(`${url}/api/user/push-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: foundToken,
          userId: guestId?.toString() || null,
          platform,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        logs.push(`✅ تسجيل ناجح: ${JSON.stringify(data)}`);
        // حفظ في AsyncStorage
        await AsyncStorage.setItem("expo_push_token", foundToken);
        setStatus(logs.join("\n") + "\n\n✅ تم التسجيل بنجاح!");
      } else {
        const errText = await response.text();
        logs.push(`❌ فشل التسجيل (${response.status}): ${errText}`);
        setStatus(logs.join("\n"));
      }
    } catch (e: any) {
      logs.push(`❌ خطأ: ${e?.message}`);
      setStatus(logs.join("\n"));
    }

    setLoading(false);
  }, []);

  const copyToken = useCallback(() => {
    if (token) {
      Clipboard.setString(token);
      Alert.alert("تم النسخ", "تم نسخ الـ token إلى الحافظة");
    }
  }, [token]);

  return (
    <View
      className="mx-5 mb-4 rounded-2xl p-5"
      style={{ backgroundColor: "#1a1a2e", borderWidth: 1, borderColor: "#e74c3c" }}
    >
      <Text style={{ color: "#e74c3c", fontWeight: "bold", fontSize: 16, textAlign: "right", marginBottom: 8 }}>
        🔧 تشخيص الإشعارات (للمطور)
      </Text>
      <Text style={{ color: "#aaa", fontSize: 11, textAlign: "right", marginBottom: 12 }}>
        API: {apiUrl || getApiBaseUrl() || "غير محدد"}
      </Text>

      <TouchableOpacity
        onPress={runDiagnostic}
        disabled={loading}
        style={{
          backgroundColor: loading ? "#555" : "#e74c3c",
          borderRadius: 10,
          padding: 12,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>
          {loading ? "جاري الفحص..." : "🔍 فحص وتسجيل Push Token"}
        </Text>
      </TouchableOpacity>

      {token && (
        <TouchableOpacity
          onPress={copyToken}
          style={{
            backgroundColor: "#27ae60",
            borderRadius: 10,
            padding: 10,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "white", fontSize: 12 }}>📋 نسخ الـ Token</Text>
        </TouchableOpacity>
      )}

      <ScrollView style={{ maxHeight: 200 }}>
        <Text style={{ color: "#0f0", fontFamily: "monospace", fontSize: 11, textAlign: "left", lineHeight: 18 }}>
          {status}
        </Text>
      </ScrollView>
    </View>
  );
}

export default function AboutScreen() {
  const router = useRouter();
  const colors = useColors();
  const [versionTaps, setVersionTaps] = useState(0);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  const handleVersionTap = useCallback(() => {
    const newCount = versionTaps + 1;
    setVersionTaps(newCount);
    if (newCount >= 5) {
      setShowDiagnostic(true);
      setVersionTaps(0);
    }
  }, [versionTaps]);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
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
            عن التطبيق
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

        {/* App Logo & Name */}
        <View className="items-center py-6">
          <Text style={{ fontSize: 56 }}>🍽️</Text>
          <Text
            className="text-foreground font-bold mt-3"
            style={{ fontSize: 24 }}
          >
            ألف عافيات
          </Text>
          <Text className="text-muted mt-1" style={{ fontSize: 14 }}>
            رفيقك في المطبخ والصحة
          </Text>
          {/* الإصدار - اضغط 5 مرات لفتح التشخيص */}
          <TouchableOpacity onPress={handleVersionTap} activeOpacity={1}>
            <Text className="text-muted mt-2" style={{ fontSize: 12 }}>
              الإصدار 1.0.77 {versionTaps > 0 && versionTaps < 5 ? `(${5 - versionTaps})` : ""}
            </Text>
          </TouchableOpacity>
        </View>

        {/* لوحة التشخيص - تظهر فقط بعد 5 ضغطات */}
        {showDiagnostic && <PushDiagnosticPanel colors={colors} />}

        {/* Sections */}
        {SECTIONS.map((section) => (
          <View
            key={section.title}
            className="mx-5 mb-4 rounded-2xl p-5"
            style={{ backgroundColor: colors.surface }}
          >
            <View
              className="flex-row items-center gap-2 mb-3"
              style={{ flexDirection: "row-reverse" }}
            >
              <Text style={{ fontSize: 20 }}>{section.emoji}</Text>
              <Text
                className="text-foreground font-bold"
                style={{ fontSize: 17, textAlign: "right" }}
              >
                {section.title}
              </Text>
            </View>
            <Text
              className="text-muted"
              style={{
                fontSize: 14,
                lineHeight: 24,
                textAlign: "right",
                writingDirection: "rtl",
              }}
            >
              {section.content}
            </Text>
          </View>
        ))}

        {/* Contact */}
        <View
          className="mx-5 mb-4 rounded-2xl p-5"
          style={{ backgroundColor: colors.surface }}
        >
          <View
            className="flex-row items-center gap-2 mb-3"
            style={{ flexDirection: "row-reverse" }}
          >
            <Text style={{ fontSize: 20 }}>📧</Text>
            <Text
              className="text-foreground font-bold"
              style={{ fontSize: 17, textAlign: "right" }}
            >
              تواصل معنا
            </Text>
          </View>
          <Text
            className="text-muted mb-4"
            style={{
              fontSize: 14,
              lineHeight: 24,
              textAlign: "right",
              writingDirection: "rtl",
            }}
          >
            نسعد بتواصلك معنا لأي استفسار أو اقتراح أو ملاحظة. رأيك يهمنا!
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL("mailto:info@afiyatltd.co.uk")}
            className="rounded-xl py-3 items-center"
            style={{ backgroundColor: colors.primary }}
            activeOpacity={0.8}
          >
            <Text className="text-white font-bold" style={{ fontSize: 15 }}>
              راسلنا عبر البريد الإلكتروني
            </Text>
          </TouchableOpacity>
        </View>

        {/* Credits */}
        <View className="items-center py-4">
          <Text className="text-muted" style={{ fontSize: 12 }}>
            صُنع بعناية للعائلة العربية
          </Text>
          <Text className="text-muted mt-1" style={{ fontSize: 11 }}>
            جميع الحقوق محفوظة © 2026 Afiyat Ltd
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
