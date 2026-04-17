import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  I18nManager,
  FlatList,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useUser } from "@/lib/user-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

I18nManager.forceRTL(true);

interface Beverage {
  id: string;
  name: string;
  description: string;
  type: "hot" | "cold";
  subtype: "healthy" | "regular";
  calories: number;
  healthTags: string[];
  ingredients: { name: string; amount: string }[];
  steps: string[];
  tips: string;
}

const BEVERAGES: Beverage[] = [
  // ============ مشروبات ساخنة صحية ============
  {
    id: "bev_1",
    name: "شاي الزنجبيل بالعسل",
    description: "مشروب دافئ من الزنجبيل الطازج والعسل الطبيعي، يُعزّز المناعة ويُهدّئ الحلق",
    type: "hot",
    subtype: "healthy",
    calories: 40,
    healthTags: ["all", "diabetes", "obesity", "cholesterol"],
    ingredients: [
      { name: "زنجبيل طازج مبشور", amount: "ملعقة كبيرة" },
      { name: "عسل طبيعي", amount: "ملعقة كبيرة" },
      { name: "ماء مغلي", amount: "كوب" },
      { name: "ليمون", amount: "شريحة" },
    ],
    steps: [
      "يُبشر الزنجبيل ويُوضع في كوب",
      "يُسكب الماء المغلي ويُغطّى 5 دقائق",
      "يُصفّى ويُضاف العسل والليمون",
    ],
    tips: "يُشرب دافئاً صباحاً لتعزيز المناعة",
  },
  {
    id: "bev_2",
    name: "شاي أخضر بالنعناع",
    description: "شاي أخضر منعش بالنعناع الطازج، غني بمضادات الأكسدة",
    type: "hot",
    subtype: "healthy",
    calories: 5,
    healthTags: ["all", "diabetes", "obesity", "cholesterol"],
    ingredients: [
      { name: "شاي أخضر", amount: "ملعقة صغيرة" },
      { name: "نعناع طازج", amount: "أوراق عدة" },
      { name: "ماء مغلي", amount: "كوب" },
    ],
    steps: [
      "يُوضع الشاي والنعناع في إبريق",
      "يُسكب الماء المغلي ويُنقع 3 دقائق",
      "يُصفّى ويُقدّم",
    ],
    tips: "لا تُنقعه أكثر من 3 دقائق حتى لا يصبح مرّاً",
  },
  {
    id: "bev_3",
    name: "حليب الكركم الذهبي",
    description: "مشروب دافئ بالكركم والقرفة، مضاد للالتهابات ومُعزّز للمناعة",
    type: "hot",
    subtype: "healthy",
    calories: 120,
    healthTags: ["all", "cholesterol", "hypertension"],
    ingredients: [
      { name: "حليب قليل الدسم", amount: "كوب" },
      { name: "كركم مطحون", amount: "نصف ملعقة صغيرة" },
      { name: "قرفة", amount: "ربع ملعقة صغيرة" },
      { name: "عسل", amount: "ملعقة صغيرة" },
      { name: "فلفل أسود", amount: "رشّة" },
    ],
    steps: [
      "يُسخّن الحليب على نار هادئة",
      "يُضاف الكركم والقرفة والفلفل الأسود",
      "يُحرّك جيداً ويُرفع قبل الغليان",
      "يُضاف العسل ويُقدّم دافئاً",
    ],
    tips: "الفلفل الأسود يُساعد على امتصاص الكركم بشكل أفضل",
  },
  {
    id: "bev_4",
    name: "شاي البابونج",
    description: "مشروب مُهدّئ يُساعد على الاسترخاء والنوم العميق",
    type: "hot",
    subtype: "healthy",
    calories: 5,
    healthTags: ["all", "hypertension"],
    ingredients: [
      { name: "بابونج مجفّف", amount: "ملعقة كبيرة" },
      { name: "ماء مغلي", amount: "كوب" },
      { name: "عسل", amount: "ملعقة صغيرة (اختياري)" },
    ],
    steps: [
      "يُوضع البابونج في كوب",
      "يُسكب الماء المغلي ويُغطّى 5 دقائق",
      "يُصفّى ويُضاف العسل",
    ],
    tips: "يُفضّل شربه قبل النوم بنصف ساعة",
  },
  {
    id: "bev_5",
    name: "شاي القرفة بالهيل",
    description: "مشروب عطري دافئ بالقرفة والهيل، يُنظّم مستوى السكر في الدم",
    type: "hot",
    subtype: "healthy",
    calories: 10,
    healthTags: ["all", "diabetes", "cholesterol"],
    ingredients: [
      { name: "عود قرفة", amount: "عود واحد" },
      { name: "هيل", amount: "3 حبّات" },
      { name: "ماء", amount: "كوب ونصف" },
      { name: "عسل", amount: "ملعقة صغيرة" },
    ],
    steps: [
      "يُغلى الماء مع القرفة والهيل 5 دقائق",
      "يُصفّى ويُضاف العسل",
      "يُقدّم ساخناً",
    ],
    tips: "القرفة تُساعد في تنظيم مستوى السكر في الدم",
  },
  {
    id: "bev_6",
    name: "مشروب الكاكاو الصحي",
    description: "كاكاو دافئ بحليب اللوز بدون سكر مُضاف، غني بمضادات الأكسدة",
    type: "hot",
    subtype: "healthy",
    calories: 90,
    healthTags: ["all", "obesity"],
    ingredients: [
      { name: "كاكاو خام", amount: "ملعقة كبيرة" },
      { name: "حليب لوز", amount: "كوب" },
      { name: "عسل أو ستيفيا", amount: "حسب الرغبة" },
    ],
    steps: [
      "يُسخّن حليب اللوز",
      "يُضاف الكاكاو ويُحرّك جيداً",
      "يُحلّى بالعسل أو الستيفيا",
    ],
    tips: "استخدم الكاكاو الخام وليس المُحلّى للحصول على الفوائد الكاملة",
  },
  {
    id: "bev_7",
    name: "شاي الميرمية",
    description: "مشروب عشبي تقليدي يُساعد في تخفيف آلام المعدة وتحسين الهضم",
    type: "hot",
    subtype: "healthy",
    calories: 5,
    healthTags: ["all", "diabetes"],
    ingredients: [
      { name: "ميرمية مجفّفة", amount: "ملعقة كبيرة" },
      { name: "ماء مغلي", amount: "كوب" },
    ],
    steps: [
      "تُوضع الميرمية في كوب",
      "يُسكب الماء المغلي وتُغطّى 7 دقائق",
      "تُصفّى وتُقدّم",
    ],
    tips: "لا يُنصح بالإكثار منها للحوامل",
  },
  {
    id: "bev_8",
    name: "مشروب الحلبة بالعسل",
    description: "مشروب تقليدي دافئ بالحلبة والعسل، مُفيد للجهاز الهضمي",
    type: "hot",
    subtype: "healthy",
    calories: 50,
    healthTags: ["all", "diabetes"],
    ingredients: [
      { name: "حلبة مطحونة", amount: "ملعقة صغيرة" },
      { name: "ماء مغلي", amount: "كوب" },
      { name: "عسل", amount: "ملعقة كبيرة" },
    ],
    steps: [
      "تُغلى الحلبة في الماء 5 دقائق",
      "تُصفّى ويُضاف العسل",
      "تُقدّم دافئة",
    ],
    tips: "الحلبة تُساعد في تنظيم مستوى السكر في الدم",
  },
  // ============ مشروبات ساخنة عادية ============
  {
    id: "bev_9",
    name: "القهوة العربية بالهيل",
    description: "قهوة عربية أصيلة بالهيل والزعفران، رمز الضيافة العربية",
    type: "hot",
    subtype: "regular",
    calories: 5,
    healthTags: ["all"],
    ingredients: [
      { name: "بُن عربي مطحون", amount: "3 ملاعق كبيرة" },
      { name: "هيل مطحون", amount: "ملعقة صغيرة" },
      { name: "زعفران", amount: "رشّة" },
      { name: "ماء", amount: "3 أكواب" },
    ],
    steps: [
      "يُغلى الماء في الدلّة",
      "يُضاف البُن ويُترك يغلي 5 دقائق",
      "يُضاف الهيل والزعفران",
      "يُترك على نار هادئة 10 دقائق",
      "يُصبّ في الفناجين",
    ],
    tips: "تُقدّم مع التمر كعادة عربية أصيلة",
  },
  {
    id: "bev_10",
    name: "الشاي الأسود بالنعناع",
    description: "شاي أسود تقليدي بالنعناع الطازج، المشروب اليومي الأشهر",
    type: "hot",
    subtype: "regular",
    calories: 30,
    healthTags: ["all"],
    ingredients: [
      { name: "شاي أسود", amount: "ملعقتان صغيرتان" },
      { name: "نعناع طازج", amount: "عدّة أوراق" },
      { name: "سكر", amount: "حسب الرغبة" },
      { name: "ماء مغلي", amount: "كوب" },
    ],
    steps: [
      "يُوضع الشاي في الإبريق",
      "يُسكب الماء المغلي",
      "يُضاف النعناع ويُنقع 3 دقائق",
      "يُصبّ ويُحلّى حسب الرغبة",
    ],
    tips: "أضف النعناع في النهاية للحفاظ على نكهته",
  },
  {
    id: "bev_11",
    name: "السحلب",
    description: "مشروب شتوي كريمي بالقرفة والمكسّرات، دافئ ولذيذ",
    type: "hot",
    subtype: "regular",
    calories: 200,
    healthTags: ["all"],
    ingredients: [
      { name: "مسحوق سحلب", amount: "ملعقتان كبيرتان" },
      { name: "حليب", amount: "كوبان" },
      { name: "سكر", amount: "ملعقتان كبيرتان" },
      { name: "قرفة مطحونة", amount: "للتزيين" },
      { name: "فستق مفروم", amount: "للتزيين" },
    ],
    steps: [
      "يُذاب السحلب في قليل من الحليب البارد",
      "يُسخّن باقي الحليب مع السكر",
      "يُضاف خليط السحلب مع التحريك المستمر",
      "يُطبخ حتى يثخن",
      "يُزيّن بالقرفة والفستق",
    ],
    tips: "حرّكه باستمرار لتجنّب التكتّل",
  },
  {
    id: "bev_12",
    name: "شاي الزعفران بالحليب",
    description: "مشروب فاخر بالزعفران والحليب والهيل، من أجمل المشروبات الخليجية",
    type: "hot",
    subtype: "regular",
    calories: 150,
    healthTags: ["all"],
    ingredients: [
      { name: "زعفران", amount: "رشّة" },
      { name: "حليب", amount: "كوب" },
      { name: "هيل", amount: "حبّتان" },
      { name: "سكر", amount: "ملعقة كبيرة" },
    ],
    steps: [
      "يُنقع الزعفران في ملعقة ماء ساخن",
      "يُسخّن الحليب مع الهيل",
      "يُضاف الزعفران والسكر",
      "يُقدّم ساخناً",
    ],
    tips: "استخدم زعفراناً أصلياً للحصول على أفضل نكهة ولون",
  },
  {
    id: "bev_13",
    name: "القهوة التركية",
    description: "قهوة مركّزة تُطبخ على نار هادئة مع رغوة كثيفة",
    type: "hot",
    subtype: "regular",
    calories: 10,
    healthTags: ["all"],
    ingredients: [
      { name: "بُن تركي ناعم", amount: "ملعقتان صغيرتان" },
      { name: "ماء بارد", amount: "فنجان" },
      { name: "سكر", amount: "حسب الرغبة" },
    ],
    steps: [
      "يُوضع الماء والسكر والبُن في الركوة",
      "يُحرّك ويُوضع على نار هادئة",
      "عند ارتفاع الرغوة يُرفع عن النار",
      "يُكرّر مرّتين ثم يُصبّ",
    ],
    tips: "لا تُحرّك القهوة بعد بدء الغليان للحفاظ على الرغوة",
  },
  {
    id: "bev_14",
    name: "شراب الورد الساخن",
    description: "مشروب عطري بماء الورد والسكر، تقليدي ومُميّز",
    type: "hot",
    subtype: "regular",
    calories: 80,
    healthTags: ["all"],
    ingredients: [
      { name: "ماء ورد", amount: "ملعقتان كبيرتان" },
      { name: "ماء ساخن", amount: "كوب" },
      { name: "سكر", amount: "ملعقة كبيرة" },
    ],
    steps: [
      "يُسخّن الماء",
      "يُضاف السكر ويُذاب",
      "يُضاف ماء الورد",
      "يُقدّم ساخناً",
    ],
    tips: "يُمكن إضافة رشّة من القرفة لنكهة إضافية",
  },
  {
    id: "bev_15",
    name: "الكرك",
    description: "شاي بالحليب والهيل على الطريقة الخليجية، المشروب الأشهر في الخليج",
    type: "hot",
    subtype: "regular",
    calories: 160,
    healthTags: ["all"],
    ingredients: [
      { name: "شاي أسود قوي", amount: "ملعقتان كبيرتان" },
      { name: "حليب مُبخّر", amount: "نصف كوب" },
      { name: "هيل مطحون", amount: "نصف ملعقة صغيرة" },
      { name: "زعفران", amount: "رشّة" },
      { name: "سكر", amount: "ملعقتان كبيرتان" },
      { name: "ماء", amount: "كوب" },
    ],
    steps: [
      "يُغلى الماء مع الشاي والهيل 5 دقائق",
      "يُضاف الحليب المُبخّر والسكر",
      "يُترك يغلي 3 دقائق أخرى",
      "يُصفّى ويُقدّم ساخناً",
    ],
    tips: "كلّما طال غليان الشاي مع الحليب، أصبح الطعم أغنى",
  },
  // ============ مشروبات باردة صحية ============
  {
    id: "bev_16",
    name: "عصير الليمون بالنعناع",
    description: "عصير منعش بالليمون والنعناع الطازج، مُنخفض السعرات الحرارية",
    type: "cold",
    subtype: "healthy",
    calories: 25,
    healthTags: ["all", "diabetes", "obesity"],
    ingredients: [
      { name: "ليمون", amount: "حبّتان" },
      { name: "نعناع طازج", amount: "حفنة" },
      { name: "ماء بارد", amount: "لتر" },
      { name: "عسل أو ستيفيا", amount: "حسب الرغبة" },
      { name: "ثلج", amount: "حسب الرغبة" },
    ],
    steps: [
      "يُعصر الليمون",
      "يُخلط مع الماء البارد والنعناع",
      "يُحلّى بالعسل أو الستيفيا",
      "يُضاف الثلج ويُقدّم",
    ],
    tips: "أضف شرائح الخيار لمزيد من الانتعاش",
  },
  {
    id: "bev_17",
    name: "سموذي الأفوكادو والسبانخ",
    description: "مشروب أخضر غني بالألياف والدهون الصحية والفيتامينات",
    type: "cold",
    subtype: "healthy",
    calories: 180,
    healthTags: ["all", "cholesterol", "obesity"],
    ingredients: [
      { name: "أفوكادو", amount: "نصف حبّة" },
      { name: "سبانخ طازج", amount: "كوب" },
      { name: "موز", amount: "حبّة" },
      { name: "حليب لوز", amount: "كوب" },
      { name: "ثلج", amount: "نصف كوب" },
    ],
    steps: [
      "تُوضع جميع المكونات في الخلّاط",
      "تُخلط حتى تصبح ناعمة",
      "تُقدّم فوراً",
    ],
    tips: "أضف ملعقة من بذور الشيا لمزيد من الألياف",
  },
  {
    id: "bev_18",
    name: "ماء الخيار والليمون",
    description: "ماء مُنكّه طبيعي بالخيار والليمون، مُرطّب ومُنعش",
    type: "cold",
    subtype: "healthy",
    calories: 10,
    healthTags: ["all", "diabetes", "obesity", "hypertension"],
    ingredients: [
      { name: "خيار", amount: "نصف حبّة مُقطّعة" },
      { name: "ليمون", amount: "شرائح" },
      { name: "نعناع", amount: "أوراق عدّة" },
      { name: "ماء بارد", amount: "لتر" },
    ],
    steps: [
      "يُقطّع الخيار والليمون شرائح",
      "تُوضع في إبريق مع النعناع",
      "يُضاف الماء البارد",
      "يُترك في الثلّاجة ساعة على الأقل",
    ],
    tips: "كلّما طالت مدّة النقع، أصبح الطعم أقوى",
  },
  {
    id: "bev_19",
    name: "عصير الجزر والبرتقال",
    description: "عصير طبيعي غني بفيتامين A وC، مُفيد للبشرة والنظر",
    type: "cold",
    subtype: "healthy",
    calories: 80,
    healthTags: ["all", "diabetes"],
    ingredients: [
      { name: "جزر", amount: "3 حبّات" },
      { name: "برتقال", amount: "حبّتان" },
      { name: "زنجبيل طازج", amount: "قطعة صغيرة" },
    ],
    steps: [
      "يُقشّر الجزر ويُقطّع",
      "يُعصر البرتقال",
      "تُخلط جميع المكونات في العصّارة",
      "يُقدّم طازجاً",
    ],
    tips: "أضف تفّاحة لتحلية طبيعية بدون سكر",
  },
  {
    id: "bev_20",
    name: "سموذي التوت المُشكّل",
    description: "مشروب غني بمضادات الأكسدة من التوت الطازج والزبادي",
    type: "cold",
    subtype: "healthy",
    calories: 130,
    healthTags: ["all", "cholesterol", "obesity"],
    ingredients: [
      { name: "توت مُشكّل مُجمّد", amount: "كوب" },
      { name: "زبادي يوناني", amount: "نصف كوب" },
      { name: "عسل", amount: "ملعقة صغيرة" },
      { name: "حليب لوز", amount: "نصف كوب" },
    ],
    steps: [
      "تُوضع جميع المكونات في الخلّاط",
      "تُخلط حتى تصبح ناعمة",
      "تُقدّم فوراً",
    ],
    tips: "التوت المُجمّد يُعطي قواماً أثخن وأبرد",
  },
  {
    id: "bev_21",
    name: "عصير الرمّان الطبيعي",
    description: "عصير الرمّان الطازج، غني بمضادات الأكسدة ومُفيد للقلب",
    type: "cold",
    subtype: "healthy",
    calories: 65,
    healthTags: ["all", "cholesterol", "hypertension"],
    ingredients: [
      { name: "رمّان طازج", amount: "3 حبّات" },
      { name: "ماء بارد", amount: "نصف كوب" },
    ],
    steps: [
      "تُستخرج حبّات الرمّان",
      "تُخلط في الخلّاط مع الماء",
      "تُصفّى وتُقدّم باردة",
    ],
    tips: "لا تُضف سكراً، فالرمّان حلو بطبيعته",
  },
  {
    id: "bev_22",
    name: "مشروب الشمندر والتفّاح",
    description: "عصير صحي بالشمندر والتفّاح، يُعزّز صحة الدم والقلب",
    type: "cold",
    subtype: "healthy",
    calories: 90,
    healthTags: ["all", "hypertension", "cholesterol"],
    ingredients: [
      { name: "شمندر", amount: "حبّة متوسطة" },
      { name: "تفّاح أخضر", amount: "حبّة" },
      { name: "جزر", amount: "حبّة" },
      { name: "ليمون", amount: "نصف حبّة" },
    ],
    steps: [
      "تُقشّر المكونات وتُقطّع",
      "تُعصر في العصّارة",
      "يُضاف عصير الليمون",
      "يُقدّم طازجاً",
    ],
    tips: "الشمندر يُخفّض ضغط الدم بشكل طبيعي",
  },
  {
    id: "bev_23",
    name: "سموذي الموز واللوز",
    description: "مشروب كريمي بالموز وزبدة اللوز، غني بالبروتين والطاقة",
    type: "cold",
    subtype: "healthy",
    calories: 220,
    healthTags: ["all"],
    ingredients: [
      { name: "موز مُجمّد", amount: "حبّة" },
      { name: "زبدة لوز", amount: "ملعقة كبيرة" },
      { name: "حليب لوز", amount: "كوب" },
      { name: "عسل", amount: "ملعقة صغيرة" },
      { name: "ثلج", amount: "نصف كوب" },
    ],
    steps: [
      "تُوضع جميع المكونات في الخلّاط",
      "تُخلط حتى تصبح كريمية",
      "تُقدّم فوراً",
    ],
    tips: "استخدم موزاً مُجمّداً للحصول على قوام أثخن",
  },
  // ============ مشروبات باردة عادية ============
  {
    id: "bev_24",
    name: "شراب التمر الهندي",
    description: "مشروب عربي تقليدي مُنعش بالتمر الهندي، مثالي في الصيف",
    type: "cold",
    subtype: "regular",
    calories: 120,
    healthTags: ["all"],
    ingredients: [
      { name: "تمر هندي", amount: "نصف كوب" },
      { name: "ماء", amount: "4 أكواب" },
      { name: "سكر", amount: "نصف كوب" },
      { name: "ماء ورد", amount: "ملعقة كبيرة" },
      { name: "ثلج", amount: "حسب الرغبة" },
    ],
    steps: [
      "يُنقع التمر الهندي في الماء الدافئ ساعتين",
      "يُصفّى ويُعصر جيداً",
      "يُضاف السكر وماء الورد",
      "يُبرّد ويُقدّم مع الثلج",
    ],
    tips: "يُمكن تحضيره مُسبقاً وحفظه في الثلّاجة 3 أيام",
  },
  {
    id: "bev_25",
    name: "عصير المانجو بالحليب",
    description: "مشروب كريمي بالمانجو الطازجة والحليب البارد",
    type: "cold",
    subtype: "regular",
    calories: 200,
    healthTags: ["all"],
    ingredients: [
      { name: "مانجو ناضجة", amount: "حبّة كبيرة" },
      { name: "حليب بارد", amount: "كوب" },
      { name: "سكر", amount: "ملعقتان كبيرتان" },
      { name: "ثلج", amount: "نصف كوب" },
    ],
    steps: [
      "تُقشّر المانجو وتُقطّع",
      "تُخلط مع الحليب والسكر والثلج",
      "تُقدّم فوراً",
    ],
    tips: "استخدم مانجو ناضجة جداً لأفضل حلاوة",
  },
  {
    id: "bev_26",
    name: "شراب الورد البارد",
    description: "مشروب عطري مُنعش بماء الورد والسكر، تقليدي ومحبوب",
    type: "cold",
    subtype: "regular",
    calories: 80,
    healthTags: ["all"],
    ingredients: [
      { name: "شراب الورد المُركّز", amount: "3 ملاعق كبيرة" },
      { name: "ماء بارد", amount: "كوب" },
      { name: "ثلج", amount: "حسب الرغبة" },
    ],
    steps: [
      "يُوضع شراب الورد في كوب",
      "يُضاف الماء البارد والثلج",
      "يُحرّك ويُقدّم",
    ],
    tips: "يُمكن إضافة قطرات من عصير الليمون لتوازن الطعم",
  },
  {
    id: "bev_27",
    name: "عصير قمر الدين",
    description: "مشروب رمضاني تقليدي من المشمش المُجفّف، حلو ومُنعش",
    type: "cold",
    subtype: "regular",
    calories: 150,
    healthTags: ["all"],
    ingredients: [
      { name: "قمر الدين", amount: "لوحان" },
      { name: "ماء دافئ", amount: "3 أكواب" },
      { name: "سكر", amount: "ملعقتان كبيرتان" },
      { name: "ماء ورد", amount: "ملعقة صغيرة" },
    ],
    steps: [
      "يُقطّع قمر الدين ويُنقع في الماء الدافئ 4 ساعات",
      "يُخلط في الخلّاط حتى يصبح ناعماً",
      "يُضاف السكر وماء الورد",
      "يُبرّد ويُقدّم",
    ],
    tips: "يُنقع من الصباح ليكون جاهزاً عند الإفطار",
  },
  {
    id: "bev_28",
    name: "اللبن العيران",
    description: "مشروب اللبن المخفوق بالملح والنعناع، مُنعش ومُفيد للهضم",
    type: "cold",
    subtype: "regular",
    calories: 60,
    healthTags: ["all"],
    ingredients: [
      { name: "لبن زبادي", amount: "كوب" },
      { name: "ماء بارد", amount: "كوب" },
      { name: "ملح", amount: "رشّة" },
      { name: "نعناع مُجفّف", amount: "رشّة" },
    ],
    steps: [
      "يُخلط اللبن مع الماء البارد",
      "يُضاف الملح والنعناع",
      "يُخفق جيداً ويُقدّم بارداً",
    ],
    tips: "يُقدّم مع الأكلات الدسمة لتسهيل الهضم",
  },
  {
    id: "bev_29",
    name: "عصير الفراولة بالحليب",
    description: "مشروب وردي لذيذ بالفراولة الطازجة والحليب البارد",
    type: "cold",
    subtype: "regular",
    calories: 180,
    healthTags: ["all"],
    ingredients: [
      { name: "فراولة طازجة", amount: "كوب" },
      { name: "حليب بارد", amount: "كوب" },
      { name: "سكر", amount: "ملعقتان كبيرتان" },
      { name: "ثلج", amount: "نصف كوب" },
    ],
    steps: [
      "تُغسل الفراولة وتُقطّع",
      "تُخلط مع الحليب والسكر والثلج",
      "تُقدّم فوراً",
    ],
    tips: "أضف ملعقة من الآيس كريم لقوام أغنى",
  },
  {
    id: "bev_30",
    name: "شراب الجلّاب",
    description: "مشروب شامي تقليدي بدبس العنب وماء الورد والصنوبر",
    type: "cold",
    subtype: "regular",
    calories: 140,
    healthTags: ["all"],
    ingredients: [
      { name: "شراب الجلّاب المُركّز", amount: "3 ملاعق كبيرة" },
      { name: "ماء بارد", amount: "كوب" },
      { name: "صنوبر", amount: "ملعقة كبيرة" },
      { name: "زبيب", amount: "ملعقة كبيرة" },
      { name: "ثلج مجروش", amount: "نصف كوب" },
    ],
    steps: [
      "يُوضع شراب الجلّاب في كوب طويل",
      "يُضاف الماء البارد والثلج المجروش",
      "يُزيّن بالصنوبر والزبيب",
    ],
    tips: "يُقدّم تقليدياً في شهر رمضان المبارك",
  },
  {
    id: "bev_31",
    name: "عصير التوت الأزرق",
    description: "عصير طبيعي من التوت الأزرق الغني بمضادات الأكسدة",
    type: "cold",
    subtype: "healthy",
    calories: 70,
    healthTags: ["all", "cholesterol", "hypertension"],
    ingredients: [
      { name: "توت أزرق", amount: "كوب" },
      { name: "ماء بارد", amount: "نصف كوب" },
      { name: "عسل", amount: "ملعقة صغيرة" },
    ],
    steps: [
      "يُخلط التوت مع الماء في الخلّاط",
      "يُصفّى ويُضاف العسل",
      "يُقدّم بارداً",
    ],
    tips: "التوت الأزرق من أغنى الفواكه بمضادات الأكسدة",
  },
  {
    id: "bev_32",
    name: "مشروب الكركديه البارد",
    description: "مشروب مُنعش بالكركديه، يُساعد في خفض ضغط الدم",
    type: "cold",
    subtype: "healthy",
    calories: 30,
    healthTags: ["all", "hypertension", "cholesterol"],
    ingredients: [
      { name: "كركديه مُجفّف", amount: "3 ملاعق كبيرة" },
      { name: "ماء بارد", amount: "لتر" },
      { name: "عسل", amount: "ملعقتان كبيرتان" },
    ],
    steps: [
      "يُنقع الكركديه في الماء البارد 6 ساعات",
      "يُصفّى ويُضاف العسل",
      "يُقدّم بارداً مع الثلج",
    ],
    tips: "النقع البارد يحافظ على فوائده أكثر من الغلي",
  },
  {
    id: "bev_33",
    name: "سموذي الأناناس والزنجبيل",
    description: "مشروب استوائي مُنعش بالأناناس والزنجبيل، مُضاد للالتهابات",
    type: "cold",
    subtype: "healthy",
    calories: 110,
    healthTags: ["all", "obesity"],
    ingredients: [
      { name: "أناناس طازج", amount: "كوب مُقطّع" },
      { name: "زنجبيل طازج", amount: "قطعة صغيرة" },
      { name: "ماء جوز الهند", amount: "كوب" },
      { name: "ثلج", amount: "نصف كوب" },
    ],
    steps: [
      "تُوضع جميع المكونات في الخلّاط",
      "تُخلط حتى تصبح ناعمة",
      "تُقدّم فوراً",
    ],
    tips: "الأناناس يحتوي على إنزيم البروميلين المُفيد للهضم",
  },
  {
    id: "bev_34",
    name: "مشروب بذور الشيا بالليمون",
    description: "مشروب مُرطّب ببذور الشيا والليمون، غني بالأوميغا 3 والألياف",
    type: "cold",
    subtype: "healthy",
    calories: 60,
    healthTags: ["all", "diabetes", "cholesterol", "obesity"],
    ingredients: [
      { name: "بذور شيا", amount: "ملعقتان كبيرتان" },
      { name: "ماء بارد", amount: "كوب ونصف" },
      { name: "ليمون", amount: "نصف حبّة" },
      { name: "عسل", amount: "ملعقة صغيرة" },
    ],
    steps: [
      "تُنقع بذور الشيا في الماء 15 دقيقة",
      "يُعصر الليمون ويُضاف مع العسل",
      "يُحرّك ويُقدّم بارداً",
    ],
    tips: "بذور الشيا تمتصّ 12 ضعف حجمها من الماء",
  },
  {
    id: "bev_35",
    name: "عصير البطيخ المُنعش",
    description: "عصير بطيخ طبيعي بدون سكر، مُرطّب ومُنعش في الصيف",
    type: "cold",
    subtype: "healthy",
    calories: 45,
    healthTags: ["all", "diabetes", "obesity", "hypertension"],
    ingredients: [
      { name: "بطيخ", amount: "3 أكواب مُقطّع" },
      { name: "نعناع", amount: "أوراق عدّة" },
      { name: "ليمون", amount: "عصير نصف حبّة" },
      { name: "ثلج", amount: "كوب" },
    ],
    steps: [
      "يُقطّع البطيخ ويُزال البذر",
      "يُخلط مع النعناع والليمون والثلج",
      "يُقدّم فوراً",
    ],
    tips: "البطيخ يحتوي على 92% ماء، مثالي للترطيب",
  },
  {
    id: "bev_36",
    name: "مشروب خلّ التفّاح بالعسل",
    description: "مشروب صباحي بخلّ التفّاح والعسل، يُساعد في الهضم وإنقاص الوزن",
    type: "cold",
    subtype: "healthy",
    calories: 20,
    healthTags: ["all", "diabetes", "obesity"],
    ingredients: [
      { name: "خلّ تفّاح عضوي", amount: "ملعقة كبيرة" },
      { name: "عسل", amount: "ملعقة صغيرة" },
      { name: "ماء دافئ", amount: "كوب" },
    ],
    steps: [
      "يُخلط خلّ التفّاح مع الماء",
      "يُضاف العسل ويُحرّك",
      "يُشرب صباحاً على معدة فارغة",
    ],
    tips: "لا تتجاوز ملعقة واحدة من الخلّ يومياً",
  },
  {
    id: "bev_37",
    name: "عصير الكيوي والتفّاح",
    description: "عصير أخضر مُنعش بالكيوي والتفّاح الأخضر، غني بفيتامين C",
    type: "cold",
    subtype: "healthy",
    calories: 75,
    healthTags: ["all", "obesity"],
    ingredients: [
      { name: "كيوي", amount: "حبّتان" },
      { name: "تفّاح أخضر", amount: "حبّة" },
      { name: "ماء بارد", amount: "نصف كوب" },
      { name: "عسل", amount: "ملعقة صغيرة (اختياري)" },
    ],
    steps: [
      "يُقشّر الكيوي ويُقطّع",
      "يُقطّع التفّاح",
      "تُخلط المكونات في الخلّاط",
      "تُقدّم طازجة",
    ],
    tips: "الكيوي يحتوي على فيتامين C أكثر من البرتقال",
  },
  {
    id: "bev_38",
    name: "شراب اللوز",
    description: "مشروب تقليدي باللوز المطحون والسكر وماء الورد",
    type: "cold",
    subtype: "regular",
    calories: 180,
    healthTags: ["all"],
    ingredients: [
      { name: "لوز مطحون", amount: "نصف كوب" },
      { name: "سكر", amount: "ربع كوب" },
      { name: "ماء", amount: "3 أكواب" },
      { name: "ماء ورد", amount: "ملعقة كبيرة" },
    ],
    steps: [
      "يُنقع اللوز في الماء ساعتين",
      "يُخلط ويُصفّى",
      "يُضاف السكر وماء الورد",
      "يُبرّد ويُقدّم",
    ],
    tips: "يُمكن تزيينه بشرائح اللوز المحمّصة",
  },
  {
    id: "bev_39",
    name: "عصير الجوافة بالحليب",
    description: "مشروب كريمي بالجوافة الطازجة والحليب، حلو ومُغذّي",
    type: "cold",
    subtype: "regular",
    calories: 170,
    healthTags: ["all"],
    ingredients: [
      { name: "جوافة ناضجة", amount: "3 حبّات" },
      { name: "حليب بارد", amount: "كوب" },
      { name: "سكر", amount: "ملعقتان كبيرتان" },
      { name: "ثلج", amount: "نصف كوب" },
    ],
    steps: [
      "تُقطّع الجوافة وتُزال البذور",
      "تُخلط مع الحليب والسكر والثلج",
      "تُصفّى وتُقدّم",
    ],
    tips: "صفّه جيداً لإزالة البذور الصغيرة",
  },
  {
    id: "bev_40",
    name: "شراب السوبيا",
    description: "مشروب حجازي تقليدي بالشعير والحليب، مُنعش ومُغذّي",
    type: "cold",
    subtype: "regular",
    calories: 160,
    healthTags: ["all"],
    ingredients: [
      { name: "خبز أبيض يابس", amount: "4 شرائح" },
      { name: "سكر", amount: "كوب" },
      { name: "حليب", amount: "كوب" },
      { name: "ماء", amount: "4 أكواب" },
      { name: "فانيليا", amount: "ملعقة صغيرة" },
    ],
    steps: [
      "يُنقع الخبز في الماء يوماً كاملاً",
      "يُخلط ويُصفّى جيداً",
      "يُضاف السكر والحليب والفانيليا",
      "يُبرّد ويُقدّم",
    ],
    tips: "مشروب رمضاني تقليدي في الحجاز",
  },
  {
    id: "bev_41",
    name: "شاي الروزماري (إكليل الجبل)",
    description: "مشروب عشبي دافئ بإكليل الجبل، يُعزّز الذاكرة والتركيز",
    type: "hot",
    subtype: "healthy",
    calories: 5,
    healthTags: ["all", "hypertension"],
    ingredients: [
      { name: "إكليل الجبل الطازج", amount: "غصنان" },
      { name: "ماء مغلي", amount: "كوب" },
      { name: "عسل", amount: "ملعقة صغيرة (اختياري)" },
    ],
    steps: [
      "تُوضع أغصان إكليل الجبل في كوب",
      "يُسكب الماء المغلي ويُغطّى 5 دقائق",
      "يُصفّى ويُضاف العسل",
    ],
    tips: "يُساعد في تحسين الذاكرة والتركيز",
  },
  {
    id: "bev_42",
    name: "مشروب الزنجبيل والليمون البارد",
    description: "مشروب مُنعش بالزنجبيل والليمون البارد، مُعزّز للمناعة",
    type: "cold",
    subtype: "healthy",
    calories: 35,
    healthTags: ["all", "obesity", "diabetes"],
    ingredients: [
      { name: "زنجبيل طازج مبشور", amount: "ملعقة كبيرة" },
      { name: "ليمون", amount: "حبّة" },
      { name: "ماء بارد", amount: "لتر" },
      { name: "عسل", amount: "ملعقتان كبيرتان" },
      { name: "نعناع", amount: "أوراق عدّة" },
    ],
    steps: [
      "يُبشر الزنجبيل ويُعصر الليمون",
      "يُخلط مع الماء البارد والعسل",
      "يُضاف النعناع والثلج",
      "يُقدّم بارداً",
    ],
    tips: "يُمكن تحضيره مُسبقاً وحفظه في الثلّاجة",
  },
  {
    id: "bev_43",
    name: "شاي اليانسون",
    description: "مشروب دافئ باليانسون، يُهدّئ المعدة ويُساعد على النوم",
    type: "hot",
    subtype: "healthy",
    calories: 10,
    healthTags: ["all"],
    ingredients: [
      { name: "يانسون", amount: "ملعقة كبيرة" },
      { name: "ماء مغلي", amount: "كوب" },
      { name: "عسل", amount: "ملعقة صغيرة" },
    ],
    steps: [
      "يُوضع اليانسون في كوب",
      "يُسكب الماء المغلي ويُغطّى 5 دقائق",
      "يُصفّى ويُضاف العسل",
    ],
    tips: "مُفيد جداً لتهدئة المغص عند الأطفال",
  },
  {
    id: "bev_44",
    name: "قهوة بالتمر",
    description: "قهوة عربية مُحلّاة بالتمر بدلاً من السكر، صحية ولذيذة",
    type: "hot",
    subtype: "regular",
    calories: 80,
    healthTags: ["all"],
    ingredients: [
      { name: "قهوة مطحونة", amount: "ملعقتان كبيرتان" },
      { name: "تمر منزوع النوى", amount: "3 حبّات" },
      { name: "حليب", amount: "كوب" },
      { name: "هيل", amount: "رشّة" },
    ],
    steps: [
      "تُخلط القهوة مع التمر والحليب في الخلّاط",
      "تُسخّن على النار",
      "يُضاف الهيل",
      "تُقدّم ساخنة",
    ],
    tips: "التمر يُعطي حلاوة طبيعية بدون سكر مُضاف",
  },
  {
    id: "bev_45",
    name: "مشروب الكمّون",
    description: "مشروب دافئ بالكمّون، يُساعد في الهضم وتخفيف الانتفاخ",
    type: "hot",
    subtype: "healthy",
    calories: 10,
    healthTags: ["all", "obesity"],
    ingredients: [
      { name: "كمّون", amount: "ملعقة صغيرة" },
      { name: "ماء مغلي", amount: "كوب" },
      { name: "ليمون", amount: "شريحة" },
    ],
    steps: [
      "يُغلى الكمّون في الماء 3 دقائق",
      "يُصفّى ويُضاف الليمون",
      "يُقدّم دافئاً",
    ],
    tips: "يُشرب بعد الوجبات الدسمة لتسهيل الهضم",
  },
  {
    id: "bev_46",
    name: "عصير الخوخ والمشمش",
    description: "عصير صيفي مُنعش بالخوخ والمشمش الطازج",
    type: "cold",
    subtype: "regular",
    calories: 100,
    healthTags: ["all"],
    ingredients: [
      { name: "خوخ ناضج", amount: "حبّتان" },
      { name: "مشمش", amount: "4 حبّات" },
      { name: "ماء بارد", amount: "نصف كوب" },
      { name: "سكر", amount: "ملعقة كبيرة" },
      { name: "ثلج", amount: "نصف كوب" },
    ],
    steps: [
      "تُغسل الفواكه وتُزال النوى",
      "تُخلط في الخلّاط مع الماء والسكر",
      "يُضاف الثلج ويُقدّم",
    ],
    tips: "استخدم فواكه ناضجة جداً لأفضل نكهة",
  },
  {
    id: "bev_47",
    name: "شاي الكركم والزنجبيل",
    description: "مشروب قوي مُضاد للالتهابات بالكركم والزنجبيل الطازج",
    type: "hot",
    subtype: "healthy",
    calories: 15,
    healthTags: ["all", "cholesterol", "hypertension"],
    ingredients: [
      { name: "كركم طازج أو مطحون", amount: "نصف ملعقة صغيرة" },
      { name: "زنجبيل طازج", amount: "قطعة صغيرة" },
      { name: "ماء مغلي", amount: "كوب" },
      { name: "عسل", amount: "ملعقة صغيرة" },
      { name: "ليمون", amount: "شريحة" },
    ],
    steps: [
      "يُبشر الزنجبيل ويُضاف مع الكركم في كوب",
      "يُسكب الماء المغلي ويُغطّى 5 دقائق",
      "يُصفّى ويُضاف العسل والليمون",
    ],
    tips: "مشروب مثالي في موسم البرد لتعزيز المناعة",
  },
  {
    id: "bev_48",
    name: "عصير التفّاح بالقرفة",
    description: "عصير تفّاح طبيعي بنكهة القرفة الدافئة",
    type: "cold",
    subtype: "regular",
    calories: 95,
    healthTags: ["all"],
    ingredients: [
      { name: "تفّاح أحمر", amount: "3 حبّات" },
      { name: "قرفة مطحونة", amount: "ربع ملعقة صغيرة" },
      { name: "عسل", amount: "ملعقة كبيرة" },
      { name: "ماء بارد", amount: "نصف كوب" },
    ],
    steps: [
      "يُقطّع التفّاح ويُعصر",
      "يُضاف الماء والقرفة والعسل",
      "يُحرّك ويُقدّم بارداً",
    ],
    tips: "القرفة تُضيف نكهة دافئة حتى للمشروبات الباردة",
  },
  {
    id: "bev_49",
    name: "مشروب النعناع المُثلّج",
    description: "مشروب نعناع بارد ومُنعش، مثالي في أيام الصيف الحارّة",
    type: "cold",
    subtype: "healthy",
    calories: 15,
    healthTags: ["all", "obesity"],
    ingredients: [
      { name: "نعناع طازج", amount: "حفنة كبيرة" },
      { name: "ماء", amount: "لتر" },
      { name: "عسل", amount: "ملعقتان كبيرتان" },
      { name: "ليمون", amount: "حبّة" },
      { name: "ثلج مجروش", amount: "كوب" },
    ],
    steps: [
      "يُغلى النعناع في الماء 3 دقائق",
      "يُصفّى ويُترك ليبرد",
      "يُضاف عصير الليمون والعسل",
      "يُضاف الثلج المجروش ويُقدّم",
    ],
    tips: "يُمكن تجميده في قوالب الثلج لمكعّبات نعناع مُنكّهة",
  },
  {
    id: "bev_50",
    name: "لاتيه التمر",
    description: "مشروب قهوة كريمي مُحلّى بمعجون التمر بدلاً من السكر",
    type: "hot",
    subtype: "regular",
    calories: 180,
    healthTags: ["all"],
    ingredients: [
      { name: "إسبريسو أو قهوة مركّزة", amount: "شوت واحد" },
      { name: "حليب", amount: "كوب" },
      { name: "معجون تمر", amount: "ملعقة كبيرة" },
      { name: "قرفة", amount: "رشّة" },
    ],
    steps: [
      "يُسخّن الحليب ويُخفق حتى يصبح رغوياً",
      "يُذاب معجون التمر في القهوة",
      "يُسكب الحليب المخفوق فوق القهوة",
      "يُزيّن بالقرفة",
    ],
    tips: "معجون التمر يُعطي حلاوة طبيعية وقيمة غذائية عالية",
  },
  // ============ مشروبات إضافية ============
  {
    id: "bev_51",
    name: "عصير الرمان الطازج",
    description: "عصير رمان طبيعي غني بمضادات الأكسدة ومفيد للقلب",
    type: "cold",
    subtype: "healthy",
    calories: 80,
    healthTags: ["all", "cholesterol", "hypertension"],
    ingredients: [
      { name: "رمان طازج", amount: "حبتان كبيرتان" },
      { name: "ماء بارد", amount: "نصف كوب" },
    ],
    steps: [
      "يُفصل حب الرمان",
      "يُخلط في الخلاط مع الماء",
      "يُصفّى ويُقدّم بارداً",
    ],
    tips: "لا تُضف سكر - الرمان حلو طبيعياً",
  },
  {
    id: "bev_52",
    name: "عصير الجزر بالبرتقال",
    description: "عصير طبيعي غني بفيتامين A وC للمناعة والبشرة",
    type: "cold",
    subtype: "healthy",
    calories: 90,
    healthTags: ["all", "obesity"],
    ingredients: [
      { name: "جزر", amount: "حبتان" },
      { name: "برتقال", amount: "حبة" },
      { name: "زنجبيل طازج", amount: "شريحة صغيرة" },
    ],
    steps: [
      "يُقشر الجزر ويُقطع",
      "يُعصر البرتقال",
      "يُخلط الكل في الخلاط ويُصفّى",
    ],
    tips: "يُشرب طازجاً للحصول على أقصى فائدة",
  },
  {
    id: "bev_53",
    name: "عصير الشمندر (البنجر)",
    description: "عصير شمندر طبيعي يُخفض ضغط الدم ويُحسن الدورة الدموية",
    type: "cold",
    subtype: "healthy",
    calories: 70,
    healthTags: ["all", "hypertension", "cholesterol"],
    ingredients: [
      { name: "شمندر مسلوق", amount: "حبة" },
      { name: "تفاح", amount: "حبة" },
      { name: "ليمون", amount: "نصف حبة" },
      { name: "ماء", amount: "كوب" },
    ],
    steps: [
      "يُقطع الشمندر والتفاح",
      "يُخلط الكل في الخلاط",
      "يُضاف عصير الليمون ويُقدّم",
    ],
    tips: "يُفضّل شربه صباحاً على معدة فارغة",
  },
  {
    id: "bev_54",
    name: "سموذي الموز بالشوفان",
    description: "سموذي مغذٍّ بالموز والشوفان والحليب، مثالي للفطور",
    type: "cold",
    subtype: "healthy",
    calories: 200,
    healthTags: ["all", "cholesterol"],
    ingredients: [
      { name: "موز", amount: "حبة" },
      { name: "شوفان", amount: "3 ملاعق كبيرة" },
      { name: "حليب قليل الدسم", amount: "كوب" },
      { name: "عسل", amount: "ملعقة صغيرة" },
    ],
    steps: [
      "يُخلط الكل في الخلاط حتى يصبح ناعماً",
      "يُسكب في كوب ويُقدّم",
    ],
    tips: "استخدم موزاً مجمّداً لقوام أكثف",
  },
  {
    id: "bev_55",
    name: "مشروب الكركديه",
    description: "مشروب الكركديه المنعش يُخفض ضغط الدم وغني بفيتامين C",
    type: "cold",
    subtype: "healthy",
    calories: 30,
    healthTags: ["all", "hypertension", "obesity"],
    ingredients: [
      { name: "كركديه مجفّف", amount: "ملعقتان كبيرتان" },
      { name: "ماء بارد", amount: "كوبان" },
      { name: "عسل", amount: "ملعقة صغيرة" },
    ],
    steps: [
      "يُنقع الكركديه في الماء البارد 4 ساعات",
      "يُصفّى ويُحلّى بالعسل",
      "يُقدّم بارداً مع ثلج",
    ],
    tips: "النقع البارد أفضل من الغلي للحفاظ على الفوائد",
  },
  {
    id: "bev_56",
    name: "عصير الأناناس بالنعناع",
    description: "عصير استوائي منعش يُساعد على الهضم",
    type: "cold",
    subtype: "regular",
    calories: 110,
    healthTags: ["all"],
    ingredients: [
      { name: "أناناس طازج", amount: "كوبان مقطّع" },
      { name: "نعناع طازج", amount: "أوراق عدة" },
      { name: "ثلج", amount: "كوب" },
    ],
    steps: [
      "يُخلط الأناناس مع النعناع والثلج",
      "يُسكب ويُزيّن بالنعناع",
    ],
    tips: "يُمكن إضافة عصير ليمون لنكهة أقوى",
  },
  {
    id: "bev_57",
    name: "عصير المانجو بالحليب",
    description: "عصير مانجو كريمي مع الحليب، من أشهر العصائر في الخليج",
    type: "cold",
    subtype: "regular",
    calories: 180,
    healthTags: ["all"],
    ingredients: [
      { name: "مانجو طازج", amount: "حبة كبيرة" },
      { name: "حليب", amount: "كوب" },
      { name: "سكر", amount: "ملعقة كبيرة" },
      { name: "ثلج", amount: "كوب" },
    ],
    steps: [
      "يُقشر المانجو ويُقطع",
      "يُخلط مع الحليب والسكر والثلج",
      "يُسكب في كوب ويُقدّم",
    ],
    tips: "استخدم مانجو ناضج جداً لحلاوة طبيعية",
  },
  {
    id: "bev_58",
    name: "عصير الفراولة بالليمون",
    description: "عصير فراولة منعش مع لمسة ليمون",
    type: "cold",
    subtype: "regular",
    calories: 100,
    healthTags: ["all"],
    ingredients: [
      { name: "فراولة", amount: "كوب" },
      { name: "عصير ليمون", amount: "ملعقتان" },
      { name: "سكر", amount: "ملعقة كبيرة" },
      { name: "ماء بارد", amount: "كوب" },
    ],
    steps: [
      "تُغسل الفراولة وتُقطع",
      "تُخلط مع الماء والسكر والليمون",
      "تُصفّى وتُقدّم باردة",
    ],
    tips: "أضف أوراق نعناع للتزيين",
  },
  {
    id: "bev_59",
    name: "عصير البطيخ",
    description: "عصير بطيخ منعش ومرطّب للصيف",
    type: "cold",
    subtype: "healthy",
    calories: 60,
    healthTags: ["all", "obesity", "hypertension"],
    ingredients: [
      { name: "بطيخ أحمر", amount: "3 أكواب مقطّع" },
      { name: "ليمون", amount: "نصف حبة" },
      { name: "نعناع", amount: "أوراق عدة" },
    ],
    steps: [
      "يُخلط البطيخ في الخلاط",
      "يُضاف عصير الليمون",
      "يُسكب مع ثلج ونعناع",
    ],
    tips: "استخدم بطيخاً مثلّجاً لقوام أفضل",
  },
  {
    id: "bev_60",
    name: "مشروب التمر بالحليب",
    description: "مشروب عراقي تقليدي بالتمر والحليب، مغذٍّ ولذيذ",
    type: "cold",
    subtype: "regular",
    calories: 220,
    healthTags: ["all"],
    ingredients: [
      { name: "تمر منزوع النواة", amount: "5 حبات" },
      { name: "حليب", amount: "كوب" },
      { name: "ثلج", amount: "كوب" },
    ],
    steps: [
      "يُنقع التمر في الحليب نصف ساعة",
      "يُخلط الكل في الخلاط",
      "يُضاف الثلج ويُقدّم",
    ],
    tips: "لا يحتاج سكر - التمر يُعطي حلاوة كافية",
  },
  {
    id: "bev_61",
    name: "شاي اليانسون",
    description: "مشروب دافئ يُهدّئ المعدة ويُساعد على الهضم",
    type: "hot",
    subtype: "healthy",
    calories: 10,
    healthTags: ["all", "obesity"],
    ingredients: [
      { name: "يانسون", amount: "ملعقة كبيرة" },
      { name: "ماء مغلي", amount: "كوب" },
    ],
    steps: [
      "يُوضع اليانسون في كوب",
      "يُسكب الماء المغلي ويُغطّى 5 دقائق",
      "يُصفّى ويُقدّم",
    ],
    tips: "مفيد جداً للانتفاخ والغازات",
  },
  {
    id: "bev_62",
    name: "عصير الخيار بالليمون",
    description: "مشروب منعش ومرطّب قليل السعرات",
    type: "cold",
    subtype: "healthy",
    calories: 20,
    healthTags: ["all", "obesity", "hypertension"],
    ingredients: [
      { name: "خيار", amount: "حبة كبيرة" },
      { name: "ليمون", amount: "نصف حبة" },
      { name: "نعناع", amount: "أوراق عدة" },
      { name: "ماء بارد", amount: "كوب" },
    ],
    steps: [
      "يُقشر الخيار ويُقطع",
      "يُخلط مع الماء والليمون والنعناع",
      "يُصفّى ويُقدّم بارداً",
    ],
    tips: "مثالي للترطيب في الصيف",
  },
  {
    id: "bev_63",
    name: "مشروب الزنجبيل البارد",
    description: "زنجبيل منعش بارد مع الليمون والعسل",
    type: "cold",
    subtype: "healthy",
    calories: 35,
    healthTags: ["all", "obesity", "cholesterol"],
    ingredients: [
      { name: "زنجبيل طازج مبشور", amount: "ملعقة كبيرة" },
      { name: "ليمون", amount: "حبة" },
      { name: "عسل", amount: "ملعقة كبيرة" },
      { name: "ماء بارد", amount: "كوبان" },
    ],
    steps: [
      "يُغلى الزنجبيل في كوب ماء 5 دقائق",
      "يُبرّد ويُضاف عصير الليمون والعسل",
      "يُضاف الماء البارد والثلج",
    ],
    tips: "يُساعد على حرق الدهون وتنشيط الأيض",
  },
  {
    id: "bev_64",
    name: "مشروب العرقسوس",
    description: "مشروب رمضاني تقليدي منعش ومفيد للهضم",
    type: "cold",
    subtype: "regular",
    calories: 100,
    healthTags: ["all"],
    ingredients: [
      { name: "عرقسوس مطحون", amount: "ملعقتان كبيرتان" },
      { name: "ماء", amount: "4 أكواب" },
    ],
    steps: [
      "يُنقع العرقسوس في الماء 8 ساعات",
      "يُصفّى جيداً",
      "يُقدّم بارداً مع ثلج",
    ],
    tips: "غير مناسب لمرضى الضغط العالي",
  },
  {
    id: "bev_65",
    name: "شاي الروزماري (إكليل الجبل)",
    description: "مشروب عشبي يُحسن الذاكرة والتركيز",
    type: "hot",
    subtype: "healthy",
    calories: 5,
    healthTags: ["all", "cholesterol"],
    ingredients: [
      { name: "روزماري طازج", amount: "غصن واحد" },
      { name: "ماء مغلي", amount: "كوب" },
      { name: "عسل", amount: "ملعقة صغيرة" },
    ],
    steps: [
      "يُوضع الروزماري في كوب",
      "يُسكب الماء المغلي ويُغطّى 7 دقائق",
      "يُصفّى ويُحلّى بالعسل",
    ],
    tips: "يُشرب صباحاً لتحسين التركيز",
  },
  {
    id: "bev_66",
    name: "عصير الأفوكادو",
    description: "سموذي أفوكادو كريمي غني بالدهون الصحية",
    type: "cold",
    subtype: "healthy",
    calories: 250,
    healthTags: ["all", "cholesterol"],
    ingredients: [
      { name: "أفوكادو", amount: "نصف حبة" },
      { name: "حليب", amount: "كوب" },
      { name: "عسل", amount: "ملعقة كبيرة" },
      { name: "ثلج", amount: "كوب" },
    ],
    steps: [
      "يُخلط الأفوكادو مع الحليب والعسل",
      "يُضاف الثلج ويُخلط حتى يصبح ناعماً",
      "يُسكب ويُقدّم",
    ],
    tips: "استخدم أفوكادو ناضج لقوام كريمي",
  },
  {
    id: "bev_67",
    name: "شاي الزعتر",
    description: "مشروب عشبي تقليدي يُقوي المناعة ويُهدّئ السعال",
    type: "hot",
    subtype: "healthy",
    calories: 5,
    healthTags: ["all"],
    ingredients: [
      { name: "زعتر طازج أو مجفّف", amount: "ملعقة كبيرة" },
      { name: "ماء مغلي", amount: "كوب" },
      { name: "عسل", amount: "ملعقة صغيرة" },
    ],
    steps: [
      "يُوضع الزعتر في كوب",
      "يُسكب الماء المغلي ويُغطّى 5 دقائق",
      "يُصفّى ويُحلّى بالعسل",
    ],
    tips: "مفيد جداً في فصل الشتاء",
  },
  {
    id: "bev_68",
    name: "عصير التوت المشكّل",
    description: "عصير توت مشكّل غني بمضادات الأكسدة",
    type: "cold",
    subtype: "healthy",
    calories: 85,
    healthTags: ["all", "cholesterol", "obesity"],
    ingredients: [
      { name: "توت مشكّل (فراولة، توت، عنب)", amount: "كوب" },
      { name: "لبن زبادي", amount: "نصف كوب" },
      { name: "عسل", amount: "ملعقة صغيرة" },
    ],
    steps: [
      "يُخلط التوت مع اللبن والعسل",
      "يُسكب في كوب ويُقدّم",
    ],
    tips: "يُمكن استخدام توت مجمّد",
  },
  {
    id: "bev_69",
    name: "قهوة الهيل الباردة",
    description: "قهوة عربية باردة بالهيل والحليب",
    type: "cold",
    subtype: "regular",
    calories: 120,
    healthTags: ["all"],
    ingredients: [
      { name: "قهوة مركّزة مبرّدة", amount: "كوب" },
      { name: "حليب", amount: "نصف كوب" },
      { name: "هيل مطحون", amount: "رشّة" },
      { name: "ثلج", amount: "كوب" },
    ],
    steps: [
      "يُخلط الكل في الخلاط",
      "يُسكب في كوب مع ثلج",
    ],
    tips: "حضّر القهوة مسبقاً وبرّدها في الثلاجة",
  },
  {
    id: "bev_70",
    name: "ليمونادة بالنعناع",
    description: "ليمونادة منعشة بالنعناع الطازج",
    type: "cold",
    subtype: "regular",
    calories: 80,
    healthTags: ["all"],
    ingredients: [
      { name: "ليمون", amount: "3 حبات" },
      { name: "سكر", amount: "3 ملاعق كبيرة" },
      { name: "نعناع طازج", amount: "حزمة صغيرة" },
      { name: "ماء بارد", amount: "4 أكواب" },
    ],
    steps: [
      "يُعصر الليمون",
      "يُذاب السكر في قليل من الماء الدافئ",
      "يُخلط الكل مع النعناع والثلج",
    ],
    tips: "أضف شرائح ليمون للتزيين",
  },
  {
    id: "bev_71",
    name: "مشروب التمر هندي",
    description: "مشروب رمضاني تقليدي بالتمر الهندي",
    type: "cold",
    subtype: "regular",
    calories: 130,
    healthTags: ["all"],
    ingredients: [
      { name: "تمر هندي", amount: "ملعقتان كبيرتان" },
      { name: "ماء", amount: "3 أكواب" },
      { name: "سكر", amount: "3 ملاعق كبيرة" },
      { name: "ماء ورد", amount: "ملعقة كبيرة" },
    ],
    steps: [
      "يُنقع التمر الهندي في ماء دافئ ساعة",
      "يُصفّى ويُضاف السكر وماء الورد",
      "يُبرّد ويُقدّم مع ثلج",
    ],
    tips: "مشروب مثالي للإفطار في رمضان",
  },
  {
    id: "bev_72",
    name: "سموذي السبانخ الأخضر",
    description: "سموذي صحي بالسبانخ والموز والتفاح",
    type: "cold",
    subtype: "healthy",
    calories: 120,
    healthTags: ["all", "obesity", "cholesterol", "hypertension"],
    ingredients: [
      { name: "سبانخ طازجة", amount: "كوب" },
      { name: "موز", amount: "حبة" },
      { name: "تفاح أخضر", amount: "نصف حبة" },
      { name: "ماء", amount: "كوب" },
    ],
    steps: [
      "يُخلط الكل في الخلاط حتى يصبح ناعماً",
      "يُسكب ويُقدّم فوراً",
    ],
    tips: "الموز يُخفي طعم السبانخ تماماً",
  },
  {
    id: "bev_73",
    name: "مشروب الحليب بالزعفران",
    description: "مشروب خليجي فاخر بالحليب والزعفران والفستق",
    type: "hot",
    subtype: "regular",
    calories: 160,
    healthTags: ["all"],
    ingredients: [
      { name: "حليب", amount: "كوب" },
      { name: "زعفران", amount: "رشّة" },
      { name: "هيل", amount: "حبتان" },
      { name: "فستق مفروم", amount: "للتزيين" },
      { name: "سكر", amount: "ملعقة كبيرة" },
    ],
    steps: [
      "يُنقع الزعفران في ملعقة ماء دافئ",
      "يُسخّن الحليب مع الهيل والسكر",
      "يُضاف الزعفران ويُزيّن بالفستق",
    ],
    tips: "يُقدّم في المناسبات والأعياد",
  },
  {
    id: "bev_74",
    name: "عصير الجوافة",
    description: "عصير جوافة طبيعي غني بفيتامين C",
    type: "cold",
    subtype: "regular",
    calories: 110,
    healthTags: ["all"],
    ingredients: [
      { name: "جوافة طازجة", amount: "3 حبات" },
      { name: "سكر", amount: "ملعقتان" },
      { name: "ماء بارد", amount: "كوب" },
    ],
    steps: [
      "تُغسل الجوافة وتُقطع",
      "تُخلط مع الماء والسكر",
      "تُصفّى وتُقدّم باردة",
    ],
    tips: "الجوافة من أغنى الفواكه بفيتامين C",
  },
  {
    id: "bev_75",
    name: "شاي الكركديه الساخن",
    description: "كركديه ساخن مع القرفة والزنجبيل",
    type: "hot",
    subtype: "healthy",
    calories: 25,
    healthTags: ["all", "hypertension"],
    ingredients: [
      { name: "كركديه", amount: "ملعقتان" },
      { name: "قرفة", amount: "عود صغير" },
      { name: "زنجبيل", amount: "شريحة" },
      { name: "ماء مغلي", amount: "كوب" },
    ],
    steps: [
      "يُغلى الكل معاً 5 دقائق",
      "يُصفّى ويُقدّم ساخناً",
    ],
    tips: "يُمكن تحليته بالعسل بدل السكر",
  },
];

const CATEGORIES = [
  { key: "hot", label: "ساخنة", icon: "local-fire-department" as const },
  { key: "cold", label: "باردة", icon: "ac-unit" as const },
];

const SUBTYPES = [
  { key: "all", label: "الكل" },
  { key: "healthy", label: "صحي" },
  { key: "regular", label: "عادي" },
];

export default function BeveragesScreen() {
  const router = useRouter();
  const colors = useColors();
  const { profile } = useUser();
  const [selectedCategory, setSelectedCategory] = useState<string>("hot");
  const [selectedType, setSelectedType] = useState<"all" | "healthy" | "regular">("all");
  const [selectedBeverage, setSelectedBeverage] = useState<Beverage | null>(null);

  const filteredBeverages = useMemo(() => {
    return BEVERAGES.filter((bev) => {
      const categoryMatch = bev.type === selectedCategory;
      const typeMatch = selectedType === "all" || bev.subtype === selectedType;
      const healthMatch =
        profile.healthCondition === "none" ||
        bev.healthTags.includes(profile.healthCondition) ||
        bev.healthTags.includes("all");
      return categoryMatch && typeMatch && healthMatch;
    });
  }, [selectedCategory, selectedType, profile.healthCondition]);

  const renderBeverageCard = useCallback(({ item }: { item: Beverage }) => (
    <TouchableOpacity
      className="bg-surface rounded-2xl p-4 mb-3 border"
      style={{ borderColor: colors.border }}
      onPress={() => setSelectedBeverage(item)}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground mb-1" style={{ textAlign: "right" }}>
            {item.name}
          </Text>
          <Text className="text-sm text-muted mb-2" style={{ textAlign: "right" }} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
        <View
          className="px-2 py-1 rounded-lg mr-2"
          style={{
            backgroundColor: item.subtype === "healthy" ? "#4CAF5020" : "#FF980020",
          }}
        >
          <Text
            className="text-xs font-medium"
            style={{
              color: item.subtype === "healthy" ? "#4CAF50" : "#FF9800",
            }}
          >
            {item.subtype === "healthy" ? "صحي" : "عادي"}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-4" style={{ flexDirection: "row-reverse" }}>
        <View className="flex-row items-center gap-1">
          <Text className="text-sm text-muted">{item.calories} سعرة</Text>
          <MaterialIcons name="local-fire-department" size={16} color={colors.muted} />
        </View>
        <View className="flex-row items-center gap-1">
          <Text className="text-sm text-muted">{item.ingredients.length} مكوّنات</Text>
          <MaterialIcons name="restaurant" size={16} color={colors.muted} />
        </View>
      </View>
    </TouchableOpacity>
  ), [colors]);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2 flex-row items-center justify-between" style={{ flexDirection: "row-reverse" }}>
          <Text
            className="text-foreground font-bold"
            style={{ fontSize: 22, textAlign: "right" }}
          >
            المشروبات والعصائر
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
            <MaterialIcons name="chevron-right" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View className="px-5 pb-4">
          <Text className="text-base text-muted" style={{ textAlign: "right" }}>
            {filteredBeverages.length} مشروب متاح
          </Text>
        </View>

        {/* Category Filter */}
        <View className="px-5 mb-4 flex-row gap-3" style={{ flexDirection: "row-reverse" }}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              onPress={() => setSelectedCategory(cat.key)}
              className="flex-1 py-3 rounded-xl flex-row items-center justify-center gap-2"
              style={{
                backgroundColor:
                  selectedCategory === cat.key ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor:
                  selectedCategory === cat.key ? colors.primary : colors.border,
                flexDirection: "row-reverse",
              }}
            >
              <MaterialIcons
                name={cat.icon}
                size={20}
                color={selectedCategory === cat.key ? colors.background : colors.foreground}
              />
              <Text
                className="text-base font-semibold"
                style={{
                  color: selectedCategory === cat.key ? colors.background : colors.foreground,
                }}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Type Filter */}
        <View className="px-5 mb-4 flex-row gap-2" style={{ flexDirection: "row-reverse" }}>
          {SUBTYPES.map((type) => (
            <TouchableOpacity
              key={type.key}
              onPress={() => setSelectedType(type.key as any)}
              className="flex-1 py-2 rounded-lg items-center"
              style={{
                backgroundColor:
                  selectedType === type.key ? colors.primary : colors.background,
                borderWidth: 1,
                borderColor:
                  selectedType === type.key ? colors.primary : colors.border,
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{
                  color: selectedType === type.key ? colors.background : colors.foreground,
                }}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Beverages List */}
        <View className="px-5">
          {filteredBeverages.length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-lg text-muted">لا توجد مشروبات متاحة</Text>
            </View>
          ) : (
            <FlatList
              data={filteredBeverages}
              renderItem={renderBeverageCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Beverage Detail Modal */}
      <Modal
        visible={!!selectedBeverage}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedBeverage(null)}
      >
        {selectedBeverage && (
          <View className="flex-1 bg-background">
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Modal Header */}
              <View className="px-5 pt-6 pb-4 flex-row items-center justify-between" style={{ flexDirection: "row-reverse" }}>
                <Text className="text-xl font-bold text-foreground flex-1" style={{ textAlign: "right" }}>
                  {selectedBeverage.name}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedBeverage(null)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.surface,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons name="close" size={20} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              {/* Description */}
              <View className="px-5 mb-4">
                <Text className="text-base text-muted leading-relaxed" style={{ textAlign: "right" }}>
                  {selectedBeverage.description}
                </Text>
              </View>

              {/* Info Row */}
              <View className="px-5 mb-4 flex-row gap-3" style={{ flexDirection: "row-reverse" }}>
                <View className="flex-1 bg-surface rounded-xl p-3 items-center">
                  <MaterialIcons name="local-fire-department" size={24} color={colors.primary} />
                  <Text className="text-lg font-bold text-foreground mt-1">{selectedBeverage.calories}</Text>
                  <Text className="text-xs text-muted">سعرة حرارية</Text>
                </View>
                <View className="flex-1 bg-surface rounded-xl p-3 items-center">
                  <MaterialIcons name="restaurant" size={24} color={colors.primary} />
                  <Text className="text-lg font-bold text-foreground mt-1">{selectedBeverage.ingredients.length}</Text>
                  <Text className="text-xs text-muted">مكوّنات</Text>
                </View>
                <View className="flex-1 bg-surface rounded-xl p-3 items-center">
                  <MaterialIcons name={selectedBeverage.type === "hot" ? "local-fire-department" : "ac-unit"} size={24} color={colors.primary} />
                  <Text className="text-lg font-bold text-foreground mt-1">
                    {selectedBeverage.type === "hot" ? "ساخن" : "بارد"}
                  </Text>
                  <Text className="text-xs text-muted">النوع</Text>
                </View>
              </View>

              {/* Ingredients */}
              <View className="px-5 mb-4">
                <Text className="text-lg font-bold text-foreground mb-3" style={{ textAlign: "right" }}>
                  المكوّنات
                </Text>
                {selectedBeverage.ingredients.map((ing, idx) => (
                  <View
                    key={idx}
                    className="flex-row items-center py-2 border-b"
                    style={{ borderColor: colors.border, flexDirection: "row-reverse" }}
                  >
                    <View
                      className="w-6 h-6 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: colors.primary + "20" }}
                    >
                      <Text className="text-xs font-bold" style={{ color: colors.primary }}>
                        {idx + 1}
                      </Text>
                    </View>
                    <Text className="flex-1 text-base text-foreground mr-2" style={{ textAlign: "right" }}>
                      {ing.name}
                    </Text>
                    <Text className="text-sm text-muted">{ing.amount}</Text>
                  </View>
                ))}
              </View>

              {/* Steps */}
              <View className="px-5 mb-4">
                <Text className="text-lg font-bold text-foreground mb-3" style={{ textAlign: "right" }}>
                  طريقة التحضير
                </Text>
                {selectedBeverage.steps.map((step, idx) => (
                  <View
                    key={idx}
                    className="flex-row items-start py-2 mb-1"
                    style={{ flexDirection: "row-reverse" }}
                  >
                    <View
                      className="w-7 h-7 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <Text className="text-xs font-bold" style={{ color: colors.background }}>
                        {idx + 1}
                      </Text>
                    </View>
                    <Text className="flex-1 text-base text-foreground mr-3 leading-relaxed" style={{ textAlign: "right" }}>
                      {step}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Tips */}
              {selectedBeverage.tips && (
                <View className="px-5 mb-4">
                  <View className="bg-surface rounded-xl p-4 border" style={{ borderColor: colors.border }}>
                    <View className="flex-row items-center gap-2 mb-2" style={{ flexDirection: "row-reverse" }}>
                      <MaterialIcons name="lightbulb" size={20} color={colors.warning} />
                      <Text className="text-base font-bold text-foreground">نصيحة</Text>
                    </View>
                    <Text className="text-sm text-muted leading-relaxed" style={{ textAlign: "right" }}>
                      {selectedBeverage.tips}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </ScreenContainer>
  );
}
