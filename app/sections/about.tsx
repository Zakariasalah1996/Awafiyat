import { ScrollView, Text, View, TouchableOpacity, Linking, I18nManager } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

if (!I18nManager.isRTL) {
  I18nManager.forceRTL(true);
}

const SECTIONS = [
  {
    title: "عن التطبيق",
    emoji: "📱",
    content: `تطبيق "ألف عافيات" هو رفيقك اليومي في المطبخ والصحة. صُمم خصيصاً للعائلة العربية ليساعدك في تنظيم وجباتك، اكتشاف وصفات جديدة، والاهتمام بصحتك وصحة عائلتك.

يجمع التطبيق بين الذكاء الاصطناعي المتطور وخبرة المختصين لتقديم نصائح غذائية موثوقة ووصفات صحية تناسب حالتك الصحية.

النسخة: 1.0.0`,
  },
  {
    title: "المميزات",
    emoji: "✨",
    content: `• ذكاء الثلاجة - اكتب المكونات المتوفرة لديك والذكاء الاصطناعي يقترح عليك وصفات
• جدول الطبخ اليومي - نظّم وجباتك مع تنبيهات في الوقت المناسب
• مكتبة وصفات عربية شاملة - أكثر من 200 وصفة مجربة
• حساب السعرات الحرارية - تابع صحتك بسهولة
• نصائح صحية مخصصة - حسب حالتك الصحية
• قائمة التسوق الذكية - لا تنسَ شيئاً من السوق`,
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

• المحتوى الطبي: النصائح الغذائية والصحية في التطبيق هي للتوعية العامة فقط ولا تُغني عن استشارة الطبيب المختص.
• الوصفات: تم إعدادها بعناية لكن النتائج قد تختلف حسب جودة المكونات وطريقة التحضير.
• الاشتراكات: يمكن إلغاء الاشتراك في أي وقت. لا يتم استرداد المبالغ للفترة الحالية.
• المحتوى: جميع الوصفات والمحتوى محمي بحقوق الملكية الفكرية.`,
  },
];

export default function AboutScreen() {
  const router = useRouter();
  const colors = useColors();

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
        </View>

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
            جميع الحقوق محفوظة 2026
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
