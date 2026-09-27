export type AutomaticNotificationPeriod = "morning" | "evening";

export interface AutomaticNotificationTemplate {
  position: number;
  day: number;
  period: AutomaticNotificationPeriod;
  category: string;
  title: string;
  body: string;
}

export const AUTOMATIC_NOTIFICATION_CAMPAIGN_VERSION = 1;
export const AUTOMATIC_NOTIFICATION_TIMEZONE = "Asia/Baghdad";
export const DEFAULT_MORNING_TIME = "09:00";
export const DEFAULT_EVENING_TIME = "19:30";
export const AUTOMATIC_NOTIFICATION_LATE_GRACE_MS = 2 * 60 * 60 * 1000;

export const AUTOMATIC_NOTIFICATION_TEMPLATES: AutomaticNotificationTemplate[] = [
  { position: 0, day: 1, period: "morning", category: "ماء", title: "صباح العافية", body: "ابدأ يومك بكوب ماء، فالخطوات الصغيرة تصنع فرقًا كبيرًا." },
  { position: 1, day: 1, period: "evening", category: "طبخ", title: "عشاء بسيط ولذيذ", body: "اختر وصفة خفيفة من ألف عافيات وأنهِ يومك بطعم جميل." },
  { position: 2, day: 2, period: "morning", category: "دواء", title: "تذكير لطيف", body: "إن كان لديك دواء صباحي، راجع موعده الآن وابدأ يومك مطمئنًا." },
  { position: 3, day: 2, period: "evening", category: "تخطيط", title: "حضّر غدك من الآن", body: "رتّب وجبات الغد في دقائق لتوفّر وقتك وتخفف الحيرة." },
  { position: 4, day: 3, period: "morning", category: "صحة", title: "فطورك يصنع يومك", body: "اختر فطورًا متوازنًا يمنحك طاقة من دون ثقل." },
  { position: 5, day: 3, period: "evening", category: "ماء", title: "هل شربت ماءً كافيًا؟", body: "راجع كمية الماء اليوم وخذ كوبًا منعشًا قبل أن تنشغل." },
  { position: 6, day: 4, period: "morning", category: "طبخ", title: "وصفة جديدة تنتظرك", body: "افتح مكتبة الوصفات واكتشف طبقًا يناسب مزاجك اليوم." },
  { position: 7, day: 4, period: "evening", category: "تقليل الهدر", title: "لا تهدر طعام اليوم", body: "حوّل البقايا إلى طبق جديد واحفظ النعمة بطريقة لذيذة." },
  { position: 8, day: 5, period: "morning", category: "تخطيط", title: "أسبوع مرتب يبدأ اليوم", body: "جدولة الوجبات تساعدك على تنظيم الوقت والمشتريات بسهولة." },
  { position: 9, day: 5, period: "evening", category: "دواء", title: "موعد المساء", body: "إن كان لديك دواء مسائي، افتح تذكير الدواء وتأكد من موعده." },
  { position: 10, day: 6, period: "morning", category: "ماء", title: "كوبك الأول مهم", body: "اشرب قليلًا من الماء الآن، ولا تنتظر الشعور بالعطش." },
  { position: 11, day: 6, period: "evening", category: "اشتراك", title: "كل المميزات في مكان واحد", body: "اشترك وافتح جميع أدوات التنظيم والوصفات والمزايا الإضافية." },
  { position: 12, day: 7, period: "morning", category: "تسوق", title: "قائمة أوضح، يوم أسهل", body: "دوّن احتياجات مطبخك قبل التسوق حتى لا تنسى شيئًا." },
  { position: 13, day: 7, period: "evening", category: "صحة", title: "عشاء أخف لراحة أفضل", body: "اجعل طبقك متوازنًا وقلّل الإضافات الثقيلة قبل النوم." },
  { position: 14, day: 8, period: "morning", category: "تحفيز", title: "بداية جديدة", body: "لا تحتاج إلى تغيير كل شيء؛ ابدأ اليوم بعادة صحية واحدة." },
  { position: 15, day: 8, period: "evening", category: "طبخ", title: "ماذا نطبخ غدًا؟", body: "تصفّح الوصفات الآن واختر وجبة الغد من دون حيرة." },
  { position: 16, day: 9, period: "morning", category: "دواء", title: "صحتك في المواعيد", body: "فعّل تذكير الدواء كي تبقى مواعيدك أمامك طوال اليوم." },
  { position: 17, day: 9, period: "evening", category: "ثلاجة", title: "راجع مكونات ثلاجتك", body: "استخدم الموجود لديك واختر وصفة مناسبة قبل شراء المزيد." },
  { position: 18, day: 10, period: "morning", category: "صحة", title: "اختيارك اليومي مهم", body: "راجع التحذيرات الصحية في الوصفة واختر البدائل الأنسب لك." },
  { position: 19, day: 10, period: "evening", category: "ماء", title: "استراحة ماء", body: "دقيقة واحدة وكوب ماء قد يكونان كل ما تحتاجه الآن." },
  { position: 20, day: 11, period: "morning", category: "طبخ", title: "نكهة جديدة ليومك", body: "جرّب وصفة عربية أو عالمية وأضف تنوعًا إلى مائدتك." },
  { position: 21, day: 11, period: "evening", category: "اشتراك", title: "افتح التجربة الكاملة", body: "مع الاشتراك تصبح جميع المميزات متاحة لك وقتما تحتاجها." },
  { position: 22, day: 12, period: "morning", category: "تخطيط", title: "لا تترك الوجبات للصدفة", body: "خطط وجباتك مبكرًا لتأكل أفضل وتشتري بقدر حاجتك." },
  { position: 23, day: 12, period: "evening", category: "تقليل الهدر", title: "البقايا فرصة جديدة", body: "افتح تجديد النعمة وابحث عن فكرة شهية لمكونات اليوم." },
  { position: 24, day: 13, period: "morning", category: "ماء", title: "صباحك يحتاج ماء", body: "ضع الماء بالقرب منك وتذكّر أن تشرب على فترات خلال اليوم." },
  { position: 25, day: 13, period: "evening", category: "دواء", title: "قبل أن ينتهي اليوم", body: "إن كان لديك علاج يومي، تأكد من موعده حسب تعليماتك الطبية." },
  { position: 26, day: 14, period: "morning", category: "تحفيز", title: "أسبوع من العادات الجميلة", body: "استمر بخطوات بسيطة؛ ماء أكثر ووجبات مرتبة واختيارات أفضل." },
  { position: 27, day: 14, period: "evening", category: "وصفات", title: "ليلة وصفة مميزة", body: "اختر طبقًا تحبه واحفظ وصفته لتعود إليها وقتما تشاء." },
  { position: 28, day: 15, period: "morning", category: "صحة", title: "منتصف الشهر بنشاط", body: "اجعل وجبتك اليوم متنوعة بالألوان والخضروات قدر الإمكان." },
  { position: 29, day: 15, period: "evening", category: "اشتراك", title: "مطبخك يستحق المزيد", body: "اشترك لفتح جميع المميزات والاستفادة الكاملة من ألف عافيات." },
  { position: 30, day: 16, period: "morning", category: "دواء", title: "اضبط تذكيرك الآن", body: "خصص موعد دوائك داخل التطبيق واترك مهمة التذكير علينا." },
  { position: 31, day: 16, period: "evening", category: "تسوق", title: "جهّز قائمة الغد", body: "راجع ما ينقص مطبخك وأضفه إلى قائمة التسوق قبل أن تنسى." },
  { position: 32, day: 17, period: "morning", category: "ماء", title: "رشفة تنعش صباحك", body: "خذ كوب ماء الآن وابدأ أعمالك بطاقة أفضل." },
  { position: 33, day: 17, period: "evening", category: "تخطيط", title: "وفر وقت صباح الغد", body: "حضّر فكرة الفطور أو الغداء الليلة لتبدأ يومك بهدوء." },
  { position: 34, day: 18, period: "morning", category: "وصفات", title: "وصفة تناسب وقتك", body: "سواء كان وقتك قصيرًا أو طويلًا، ستجد وصفة مناسبة اليوم." },
  { position: 35, day: 18, period: "evening", category: "صحة", title: "راجع طبقك", body: "القليل من التوازن اليومي يساعدك على بناء عادة تستمر." },
  { position: 36, day: 19, period: "morning", category: "ثلاجة", title: "ابدأ بما لديك", body: "أدخل مكونات الثلاجة واكتشف أفكارًا تقلل الشراء والهدر." },
  { position: 37, day: 19, period: "evening", category: "دواء", title: "تذكير صحي مسائي", body: "إن كان لديك دواء في هذا الوقت، راجع جدولك ولا تؤجله." },
  { position: 38, day: 20, period: "morning", category: "اشتراك", title: "مزايا أكثر ليوم أسهل", body: "افتح جميع أدوات التطبيق بالاشتراك واستفد منها كل يوم." },
  { position: 39, day: 20, period: "evening", category: "ماء", title: "اختم يومك بترطيب جيد", body: "اشرب ماءً بقدر مناسب قبل النوم وحافظ على روتينك." },
  { position: 40, day: 21, period: "morning", category: "طبخ", title: "طبخة البيت أجمل", body: "اختر وصفة اليوم واستمتع بتحضير وجبة منزلية محببة." },
  { position: 41, day: 21, period: "evening", category: "تقليل الهدر", title: "احفظ النعمة", body: "لا تتخلص من المكونات المتبقية؛ قد تصبح وجبة الغد." },
  { position: 42, day: 22, period: "morning", category: "تخطيط", title: "دقائق توفر عليك ساعات", body: "رتّب جدول وجبات الأسبوع لتقلل الحيرة والتسوق العشوائي." },
  { position: 43, day: 22, period: "evening", category: "اشتراك", title: "افتح كل ما تحتاجه", body: "اشترك الآن واستمتع بجميع المميزات من دون قيود." },
  { position: 44, day: 23, period: "morning", category: "صحة", title: "اقرأ تنبيه الوصفة", body: "راجع التحذيرات والبدائل قبل الطبخ لتختار ما يناسب صحتك." },
  { position: 45, day: 23, period: "evening", category: "وصفات", title: "احفظ وصفتك المفضلة", body: "وجدت وصفة أعجبتك؟ احفظها لتصل إليها بسهولة لاحقًا." },
  { position: 46, day: 24, period: "morning", category: "ماء", title: "لا تنسَ الماء", body: "اجعل أول استراحة لك اليوم فرصة لشرب كوب ماء." },
  { position: 47, day: 24, period: "evening", category: "دواء", title: "هل راجعت موعد دوائك؟", body: "افتح التذكيرات وتأكد من أن جدولك مضبوط كما تريد." },
  { position: 48, day: 25, period: "morning", category: "تسوق", title: "تسوق بترتيب", body: "قائمة صغيرة قبل الخروج تحميك من النسيان والشراء الزائد." },
  { position: 49, day: 25, period: "evening", category: "طبخ", title: "طبق جديد من مكونات بسيطة", body: "لا تحتاج إلى الكثير؛ ابحث عن وصفة بما هو متوفر لديك." },
  { position: 50, day: 26, period: "morning", category: "اشتراك", title: "استفد من ألف عافيات بالكامل", body: "الاشتراك يفتح لك جميع المميزات لتجربة أكثر اكتمالًا." },
  { position: 51, day: 26, period: "evening", category: "صحة", title: "عشاء متوازن", body: "اختر كمية مناسبة وامنح جسمك وجبة مريحة في نهاية اليوم." },
  { position: 52, day: 27, period: "morning", category: "دواء", title: "موعدك يستحق الاهتمام", body: "إن كنت تتناول دواءً، راجع تذكيرك الصباحي وفق وصف طبيبك." },
  { position: 53, day: 27, period: "evening", category: "تخطيط", title: "خطتك جاهزة للغد؟", body: "اختر وجبات الغد وأضف مكوناتها إلى قائمة التسوق بسهولة." },
  { position: 54, day: 28, period: "morning", category: "تحفيز", title: "أنت تبني عادة جميلة", body: "كل اختيار صحي صغير اليوم يقربك من هدفك." },
  { position: 55, day: 28, period: "evening", category: "اشتراك", title: "جميع الأدوات بانتظارك", body: "اشترك وافتح كامل المميزات التي تساعدك في مطبخك ويومك." },
  { position: 56, day: 29, period: "morning", category: "ماء", title: "تذكير منعش", body: "خذ رشفة الآن واحتفظ بزجاجة الماء قريبة منك." },
  { position: 57, day: 29, period: "evening", category: "تقليل الهدر", title: "راجع الثلاجة قبل الغد", body: "استخدم المكونات الأقرب للانتهاء وحوّلها إلى وجبة لذيذة." },
  { position: 58, day: 30, period: "morning", category: "وصفات", title: "صباح بطعم جديد", body: "اختر وصفة مختلفة واصنع لحظتك الجميلة في المطبخ." },
  { position: 59, day: 30, period: "evening", category: "تحفيز", title: "شهر من الخطوات الجميلة", body: "أحسنت الاستمرار؛ واصل تنظيم وجباتك ومائك وصحتك مع ألف عافيات." },
];

export function isValidNotificationTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function parseTime(value: string): { hour: number; minute: number } {
  if (!isValidNotificationTime(value)) throw new Error("Invalid notification time");
  const [hour, minute] = value.split(":").map(Number);
  return { hour, minute };
}

const BAGHDAD_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

export function getNextBaghdadNotificationAt(
  period: AutomaticNotificationPeriod,
  morningTime: string,
  eveningTime: string,
  now = new Date(),
): Date {
  const selectedTime = period === "morning" ? morningTime : eveningTime;
  const { hour, minute } = parseTime(selectedTime);
  const baghdadNow = new Date(now.getTime() + BAGHDAD_UTC_OFFSET_MS);
  let candidate = new Date(Date.UTC(
    baghdadNow.getUTCFullYear(),
    baghdadNow.getUTCMonth(),
    baghdadNow.getUTCDate(),
    hour,
    minute,
    0,
    0,
  ) - BAGHDAD_UTC_OFFSET_MS);
  if (candidate.getTime() <= now.getTime()) {
    candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
  }
  return candidate;
}

export function getAutomaticNotificationTemplate(position: number): AutomaticNotificationTemplate | undefined {
  return AUTOMATIC_NOTIFICATION_TEMPLATES.find((item) => item.position === position);
}
