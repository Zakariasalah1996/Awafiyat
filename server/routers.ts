import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // AI-powered fridge recipe suggestions
  fridge: router({
    suggest: publicProcedure
      .input(
        z.object({
          ingredients: z.string().min(1),
          healthCondition: z.string().default("none"),
          mealType: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const healthNote =
          input.healthCondition !== "none"
            ? `المستخدم يعاني من ${
                input.healthCondition === "diabetes"
                  ? "السكري (قلل السكريات والكربوهيدرات)"
                  : input.healthCondition === "hypertension"
                    ? "ضغط الدم (قلل الأملاح)"
                    : input.healthCondition === "obesity"
                      ? "السمنة (قلل الدهون والسعرات)"
                      : "الكوليسترول (قلل الدهون المشبعة)"
              }. يجب أن تكون الوصفة مناسبة لحالته الصحية.`
            : "";

        const mealNote = input.mealType
          ? `نوع الوجبة المطلوبة: ${input.mealType}.`
          : "";

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `أنت طباخ عراقي محترف ومتخصص بالمطبخ العراقي والعربي. مهمتك اقتراح وصفات عراقية أصيلة وواقعية بناءً على المكونات المتوفرة.

القواعد:
1. اقترح وصفة واحدة فقط بناءً على المكونات المتوفرة
2. الوصفة يجب أن تكون عراقية أو عربية أصيلة وواقعية
3. استخدم اللهجة العراقية الودودة في الشرح
4. كن مختصراً وسريعاً - لا تكتب مقدمات طويلة
5. إذا سألك المستخدم عن شيء غير الطبخ، قل: "عيني، أنا هنا بس حتى أساعدج بالطبخ والوصفات الصحية من اللي موجود بثلاجتج، تدللين بأي سؤال عن الأكل!"
6. ${healthNote}
7. ${mealNote}

أجب بالتنسيق التالي:
🍽️ **اسم الأكلة**

⏱️ الوقت: (المدة التقريبية)

📝 **المكونات:**
- (قائمة المكونات مع الكميات التقريبية)

👩‍🍳 **الطريقة:**
1. (خطوات مختصرة وواضحة)

💡 **نصيحة صحية:** (نصيحة قصيرة مرتبطة بالوصفة)

ألف عافية على قلبكم! 😊`,
            },
            {
              role: "user",
              content: `المكونات الموجودة عندي: ${input.ingredients}`,
            },
          ],
        });

        return {
          suggestion:
            response.choices[0]?.message?.content ||
            "عذراً، لم أستطع اقتراح وصفة. حاول مرة أخرى!",
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
