import { ScrollView, Text, View, TouchableOpacity, Linking, I18nManager } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

I18nManager.forceRTL(true);

const SECTIONS = [
  {
    title: "عن التطبيق",
    emoji: "📱",
    content: `تطبيق "عافيات" هو رفيقج اليومي بالمطبخ والصحة. صُمم خصيصاً للعائلة العراقية والعربية ليساعدج بتنظيم وجباتج، اكتشاف وصفات جديدة، والاهتمام بصحتج وصحة عائلتج.

يجمع التطبيق بين الذكاء الاصطناعي المتطور وخبرة الصيادلة والمختصين لتقديم نصائح غذائية موثوقة ووصفات صحية تناسب حالتج الصحية.

النسخة: 1.0.0`,
  },
  {
    title: "المميزات",
    emoji: "✨",
    content: `• شنو في ثلاجتي؟ - اكتبي المكونات والذكاء الاصطناعي يقترح عليج وصفات
• جدول الطبخ اليومي - نظّمي وجباتج مع تنبيهات بالوقت المناسب
• مكتبة وصفات عراقية وعربية - أكثر من 200 وصفة مجربة
• حسبة السعرات الحرارية - تابعي صحتج بسهولة
• نصائح صحية مخصصة - حسب حالتج الصحية
• قائمة التسوق الذكية - ما تنسين شي من السوق`,
  },
  {
    title: "سياسة الخصوصية",
    emoji: "🔒",
    content: `نحن نأخذ خصوصيتج على محمل الجد:

• البيانات الصحية: تُخزن محلياً على جهازج فقط ومشفرة بالكامل. لا نشاركها مع أي طرف ثالث.
• بيانات الحساب: الاسم ورقم الهاتف تُستخدم فقط لتحسين تجربتج داخل التطبيق.
• الذكاء الاصطناعي: الأسئلة التي تطرحينها لا تُربط بهويتج الشخصية.
• لا نبيع بياناتج: نلتزم بعدم بيع أو مشاركة أي معلومات شخصية مع أطراف خارجية.
• حق الحذف: يمكنج حذف جميع بياناتج في أي وقت من إعدادات الحساب.

آخر تحديث: أبريل 2026`,
  },
  {
    title: "الشروط والأحكام",
    emoji: "📋",
    content: `باستخدامج لتطبيق "عافيات"، فإنج توافقين على:

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
            عافيات
          </Text>
          <Text className="text-muted mt-1" style={{ fontSize: 14 }}>
            رفيقج بالمطبخ والصحة
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
              اتصل بنا
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
            نسعد بتواصلج معنا لأي استفسار أو اقتراح أو ملاحظة. رأيج يهمنا!
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL("mailto:support@awafiyat.app")}
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
            صُنع بحب للعائلة العراقية 🇮🇶
          </Text>
          <Text className="text-muted mt-1" style={{ fontSize: 11 }}>
            جميع الحقوق محفوظة 2026
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
