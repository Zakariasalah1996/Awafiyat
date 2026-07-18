#!/usr/bin/env python3
"""Generate gulf recipes (68-100) + 50 beverages as TypeScript, then patch recipes.ts."""
import json, textwrap, re

# ========== Gulf Recipes 68-100 ==========
gulf_extra = [
  {
    "id":"gulf_68","name":"مسخّن خليجي","origin":"saudi",
    "description":"خبز طابون مع الدجاج والبصل المكرمل والسماق",
    "category":"hearty","mealType":["lunch","dinner"],"healthTags":["all"],
    "difficulty":"medium","prepTime":20,"cookTime":30,"servings":4,
    "calories":420,"protein":25,"carbs":35,"fat":20,"fiber":2,
    "ingredients":[
      {"name":"دجاج مسلوق ومفتّت","amount":"500 غرام"},
      {"name":"بصل مقطع","amount":"4 حبات كبيرة"},
      {"name":"سماق","amount":"3 ملاعق كبيرة"},
      {"name":"زيت زيتون","amount":"نصف كوب"},
      {"name":"خبز طابون أو عربي","amount":"4 أرغفة"},
      {"name":"صنوبر محمّص","amount":"ربع كوب"}
    ],
    "steps":["يُقلّب البصل في الزيت حتى يصبح ذهبياً","يُضاف السماق والدجاج ويُقلّب","يُفرش الخبز ويُوزّع الخليط فوقه","يُخبز في الفرن حتى يصبح مقرمشاً","يُزيّن بالصنوبر المحمّص"],
    "tips":"البصل المكرمل هو سر النكهة"
  },
  {
    "id":"gulf_69","name":"فتّة دجاج خليجية","origin":"saudi",
    "description":"خبز محمّص مع الدجاج واللبن والمكسرات، طبق خليجي شهي",
    "category":"hearty","mealType":["lunch"],"healthTags":["all"],
    "difficulty":"easy","prepTime":15,"cookTime":20,"servings":4,
    "calories":380,"protein":26,"carbs":32,"fat":16,"fiber":2,
    "ingredients":[
      {"name":"خبز عربي محمّص","amount":"3 أرغفة"},
      {"name":"دجاج مسلوق ومفتّت","amount":"400 غرام"},
      {"name":"لبن زبادي","amount":"كوبان"},
      {"name":"طحينة","amount":"ملعقتان كبيرتان"},
      {"name":"صنوبر ولوز محمّص","amount":"ربع كوب"}
    ],
    "steps":["يُكسّر الخبز في طبق عميق","يُسكب مرق الدجاج الساخن","يُوزّع الدجاج واللبن والطحينة","يُزيّن بالمكسرات المحمّصة"],
    "tips":"يُقدّم فوراً قبل أن يبرد"
  },
  {
    "id":"gulf_70","name":"محمّر إماراتي (أرز حلو)","origin":"uae",
    "description":"أرز حلو بالسكر والزعفران والهيل، طبق إماراتي تقليدي يُقدّم مع السمك",
    "category":"hearty","mealType":["lunch"],"healthTags":["all"],
    "difficulty":"medium","prepTime":10,"cookTime":30,"servings":5,
    "calories":350,"protein":5,"carbs":60,"fat":10,"fiber":1,
    "ingredients":[
      {"name":"أرز بسمتي","amount":"3 أكواب"},
      {"name":"سكر","amount":"نصف كوب"},
      {"name":"سمن","amount":"3 ملاعق كبيرة"},
      {"name":"زعفران وهيل وماء ورد","amount":"رشة لكل منها"}
    ],
    "steps":["يُنقع الأرز ويُسلق نصف سلقة","يُذاب السكر في السمن حتى يصبح كراميل","يُضاف الأرز ويُقلّب مع الزعفران","يُطهى على نار هادئة حتى ينضج"],
    "tips":"يُقدّم تقليدياً مع السمك المشوي"
  },
  {
    "id":"gulf_71","name":"عصيدة خليجية","origin":"saudi",
    "description":"حلوى من الطحين المطبوخ مع السمن والعسل، طبق تقليدي للمناسبات",
    "category":"dessert","mealType":["snack"],"healthTags":["all"],
    "difficulty":"easy","prepTime":5,"cookTime":20,"servings":6,
    "calories":300,"protein":4,"carbs":40,"fat":14,"fiber":1,
    "ingredients":[
      {"name":"طحين","amount":"كوب"},
      {"name":"ماء","amount":"كوبان"},
      {"name":"سمن بلدي","amount":"نصف كوب"},
      {"name":"عسل أو دبس تمر","amount":"نصف كوب"}
    ],
    "steps":["يُغلى الماء ويُضاف الطحين تدريجياً مع التحريك","يُطهى حتى يتماسك ويترك القدر","يُوضع في طبق ويُعمل حفرة في الوسط","يُسكب السمن والعسل في الحفرة"],
    "tips":"التحريك المستمر يمنع التكتّل"
  },
  {
    "id":"gulf_72","name":"مرق دجاج بالخضروات خليجي","origin":"uae",
    "description":"يخنة دجاج بالخضروات المشكلة والبهارات الخليجية",
    "category":"healthy","mealType":["lunch","dinner"],"healthTags":["all","diabetes","obesity"],
    "difficulty":"easy","prepTime":15,"cookTime":40,"servings":5,
    "calories":280,"protein":22,"carbs":20,"fat":12,"fiber":4,
    "ingredients":[
      {"name":"دجاج مقطع","amount":"نصف كيلو"},
      {"name":"بطاطس وجزر وكوسا","amount":"حبتان من كل نوع"},
      {"name":"طماطم","amount":"حبتان"},
      {"name":"بصل وثوم","amount":"حبة + 3 فصوص"},
      {"name":"بزار ولومي","amount":"حسب الرغبة"}
    ],
    "steps":["يُحمّر البصل ويُضاف الدجاج","تُضاف الطماطم والبهارات والماء","تُضاف الخضروات وتُطهى حتى تنضج","تُقدّم مع الأرز الأبيض"],
    "tips":"يمكن إضافة الليمون عند التقديم"
  },
  {
    "id":"gulf_73","name":"كشري خليجي","origin":"saudi",
    "description":"أرز وعدس ومعكرونة مع صلصة الطماطم الحارة والبصل المقلي",
    "category":"hearty","mealType":["lunch"],"healthTags":["all"],
    "difficulty":"medium","prepTime":15,"cookTime":30,"servings":5,
    "calories":380,"protein":14,"carbs":58,"fat":10,"fiber":6,
    "ingredients":[
      {"name":"أرز","amount":"كوب"},
      {"name":"عدس بني","amount":"كوب"},
      {"name":"معكرونة صغيرة","amount":"كوب"},
      {"name":"بصل مقطع حلقات","amount":"3 حبات"},
      {"name":"صلصة طماطم حارة","amount":"كوب"},
      {"name":"زيت للقلي","amount":"كمية كافية"}
    ],
    "steps":["يُطهى العدس والأرز والمعكرونة كلٌّ على حدة","يُقلى البصل حتى يصبح مقرمشاً","تُحضّر صلصة الطماطم الحارة","تُرتّب الطبقات وتُسكب الصلصة والبصل"],
    "tips":"البصل المقلي المقرمش هو سر الطعم"
  },
  {
    "id":"gulf_74","name":"شوربة الفطر الخليجية","origin":"uae",
    "description":"شوربة فطر كريمية بالثوم والأعشاب",
    "category":"healthy","mealType":["dinner"],"healthTags":["all","diabetes","obesity"],
    "difficulty":"easy","prepTime":10,"cookTime":20,"servings":4,
    "calories":150,"protein":5,"carbs":12,"fat":10,"fiber":2,
    "ingredients":[
      {"name":"فطر طازج مقطع","amount":"400 غرام"},
      {"name":"بصل وثوم","amount":"حبة + 3 فصوص"},
      {"name":"كريمة طبخ","amount":"نصف كوب"},
      {"name":"مرق دجاج","amount":"كوبان"},
      {"name":"زبدة","amount":"ملعقتان كبيرتان"}
    ],
    "steps":["يُقلّب البصل والثوم في الزبدة","يُضاف الفطر ويُقلّب","يُضاف المرق ويُطهى 15 دقيقة","تُضاف الكريمة ويُقدّم"],
    "tips":"يمكن خلط نصف الكمية بالخلاط لقوام كريمي"
  },
  {
    "id":"gulf_75","name":"صيادية سمك خليجية","origin":"saudi",
    "description":"أرز بالسمك والبصل المكرمل، طبق ساحلي خليجي تقليدي",
    "category":"hearty","mealType":["lunch"],"healthTags":["all","cholesterol"],
    "difficulty":"medium","prepTime":20,"cookTime":45,"servings":5,
    "calories":420,"protein":28,"carbs":48,"fat":12,"fiber":2,
    "ingredients":[
      {"name":"سمك فيليه","amount":"500 غرام"},
      {"name":"أرز بسمتي","amount":"كوبان"},
      {"name":"بصل مقطع","amount":"3 حبات كبيرة"},
      {"name":"كمون وكركم","amount":"ملعقة لكل منهما"},
      {"name":"صنوبر محمّص","amount":"ربع كوب"}
    ],
    "steps":["يُحمّر البصل حتى يصبح بنياً غامقاً","يُقلى السمك ويُرفع","يُطهى الأرز في مرق البصل","يُقدّم الأرز مع السمك فوقه والصنوبر"],
    "tips":"البصل المكرمل يعطي اللون والنكهة المميزة"
  },
  {
    "id":"gulf_76","name":"مكرونة بالبشاميل خليجية","origin":"saudi",
    "description":"معكرونة مخبوزة بصلصة البشاميل واللحم المفروم",
    "category":"hearty","mealType":["lunch","dinner"],"healthTags":["all"],
    "difficulty":"medium","prepTime":20,"cookTime":40,"servings":6,
    "calories":420,"protein":20,"carbs":45,"fat":18,"fiber":2,
    "ingredients":[
      {"name":"معكرونة بيني","amount":"500 غرام"},
      {"name":"لحم مفروم","amount":"300 غرام"},
      {"name":"حليب","amount":"3 أكواب"},
      {"name":"طحين وزبدة","amount":"3 ملاعق كبيرة لكل منهما"},
      {"name":"جبن مبشور","amount":"كوب"},
      {"name":"بهارات","amount":"حسب الرغبة"}
    ],
    "steps":["تُسلق المعكرونة وتُصفّى","يُحمّر اللحم مع البهارات","تُحضّر صلصة البشاميل","تُرتّب الطبقات في صينية","تُخبز حتى يصبح الوجه ذهبياً"],
    "tips":"يمكن إضافة الفطر أو الخضروات"
  },
  {
    "id":"gulf_77","name":"دجاج بالكاري خليجي","origin":"uae",
    "description":"دجاج مطبوخ بصلصة الكاري الكريمية على الطريقة الخليجية",
    "category":"hearty","mealType":["lunch"],"healthTags":["all"],
    "difficulty":"medium","prepTime":15,"cookTime":35,"servings":4,
    "calories":380,"protein":28,"carbs":15,"fat":24,"fiber":2,
    "ingredients":[
      {"name":"دجاج مقطع","amount":"كيلو واحد"},
      {"name":"بصل وثوم وزنجبيل","amount":"حبة + 3 فصوص + ملعقة"},
      {"name":"كاري وكركم","amount":"ملعقتان كبيرتان"},
      {"name":"حليب جوز الهند","amount":"علبة واحدة"},
      {"name":"طماطم","amount":"حبتان"}
    ],
    "steps":["يُحمّر البصل والثوم والزنجبيل","يُضاف الدجاج والكاري","تُضاف الطماطم وحليب جوز الهند","يُطهى حتى ينضج الدجاج","يُقدّم مع الأرز البسمتي"],
    "tips":"حليب جوز الهند يعطي القوام الكريمي"
  },
  {
    "id":"gulf_78","name":"سمك مقلي بالبهارات الخليجية","origin":"uae",
    "description":"سمك مقلي مقرمش متبّل بالبهارات الخليجية",
    "category":"quick","mealType":["lunch","dinner"],"healthTags":["all"],
    "difficulty":"easy","prepTime":10,"cookTime":15,"servings":4,
    "calories":320,"protein":30,"carbs":15,"fat":16,"fiber":1,
    "ingredients":[
      {"name":"سمك فيليه","amount":"500 غرام"},
      {"name":"طحين","amount":"نصف كوب"},
      {"name":"بزار سمك","amount":"ملعقة كبيرة"},
      {"name":"كركم وملح","amount":"حسب الرغبة"},
      {"name":"زيت للقلي","amount":"كمية كافية"}
    ],
    "steps":["يُتبّل السمك بالبهارات","يُغطّى بالطحين","يُقلى في زيت ساخن حتى يصبح ذهبياً","يُقدّم مع الليمون والسلطة"],
    "tips":"يُقدّم ساخناً مع الدقوس"
  },
  {
    "id":"gulf_79","name":"محشي فلفل خليجي","origin":"saudi",
    "description":"فلفل حلو محشو بالأرز واللحم والبهارات",
    "category":"hearty","mealType":["lunch"],"healthTags":["all"],
    "difficulty":"medium","prepTime":25,"cookTime":40,"servings":5,
    "calories":300,"protein":16,"carbs":30,"fat":12,"fiber":3,
    "ingredients":[
      {"name":"فلفل حلو كبير","amount":"6 حبات"},
      {"name":"أرز مصري","amount":"كوب"},
      {"name":"لحم مفروم","amount":"250 غرام"},
      {"name":"طماطم مفرومة","amount":"حبتان"},
      {"name":"بقدونس وبهارات","amount":"حسب الرغبة"}
    ],
    "steps":["تُحضّر الحشوة من الأرز واللحم والطماطم","يُحفر الفلفل ويُحشى","يُرتّب في قدر مع صلصة الطماطم","يُطهى على نار هادئة حتى ينضج"],
    "tips":"لا تملأ الفلفل بالكامل لأن الأرز يتمدد"
  },
  {
    "id":"gulf_80","name":"شوربة طماطم خليجية","origin":"saudi",
    "description":"شوربة طماطم كريمية بالريحان والثوم",
    "category":"healthy","mealType":["dinner"],"healthTags":["all","diabetes","obesity"],
    "difficulty":"easy","prepTime":10,"cookTime":25,"servings":4,
    "calories":120,"protein":3,"carbs":15,"fat":6,"fiber":3,
    "ingredients":[
      {"name":"طماطم ناضجة","amount":"6 حبات"},
      {"name":"بصل وثوم","amount":"حبة + 3 فصوص"},
      {"name":"ريحان طازج","amount":"نصف كوب"},
      {"name":"كريمة طبخ","amount":"ربع كوب"},
      {"name":"زيت زيتون","amount":"ملعقتان كبيرتان"}
    ],
    "steps":["يُحمّر البصل والثوم","تُضاف الطماطم وتُطهى","تُخلط بالخلاط حتى تصبح ناعمة","تُضاف الكريمة والريحان"],
    "tips":"تُقدّم مع الخبز المحمّص"
  },
  {
    "id":"gulf_81","name":"رز مبهّر بالدجاج خليجي","origin":"saudi",
    "description":"أرز بسمتي معطّر بالبهارات مع قطع الدجاج المتبّلة",
    "category":"hearty","mealType":["lunch"],"healthTags":["all"],
    "difficulty":"easy","prepTime":15,"cookTime":35,"servings":4,
    "calories":420,"protein":26,"carbs":48,"fat":14,"fiber":1,
    "ingredients":[
      {"name":"أرز بسمتي","amount":"كوبان"},
      {"name":"دجاج مقطع","amount":"500 غرام"},
      {"name":"بهارات مشكلة","amount":"ملعقتان كبيرتان"},
      {"name":"بصل وثوم","amount":"حبة + فصان"},
      {"name":"سمن","amount":"ملعقتان كبيرتان"}
    ],
    "steps":["يُحمّر الدجاج مع البصل","تُضاف البهارات والماء","يُضاف الأرز ويُطهى","يُقدّم ساخناً"],
    "tips":"يُزيّن بالمكسرات والبقدونس"
  },
  {
    "id":"gulf_82","name":"سلطة زبادي بالخيار خليجية","origin":"uae",
    "description":"سلطة لبن زبادي منعشة بالخيار والنعناع والثوم",
    "category":"healthy","mealType":["lunch","dinner"],"healthTags":["all","diabetes","obesity","cholesterol"],
    "difficulty":"easy","prepTime":10,"cookTime":0,"servings":4,
    "calories":80,"protein":4,"carbs":8,"fat":3,"fiber":1,
    "ingredients":[
      {"name":"لبن زبادي","amount":"كوبان"},
      {"name":"خيار مبشور","amount":"حبتان"},
      {"name":"نعناع مفروم","amount":"ملعقتان كبيرتان"},
      {"name":"ثوم مهروس","amount":"فص واحد"},
      {"name":"ملح","amount":"حسب الرغبة"}
    ],
    "steps":["يُبشر الخيار ويُصفّى","يُخلط مع اللبن والنعناع والثوم","يُتبّل بالملح","يُقدّم بارداً"],
    "tips":"تُقدّم كمقبّلة مع الأطباق الرئيسية"
  },
  {
    "id":"gulf_83","name":"كبسة لحم بالزبيب خليجية","origin":"saudi",
    "description":"كبسة لحم فاخرة مع الزبيب والمكسرات المحمّصة",
    "category":"hearty","mealType":["lunch"],"healthTags":["all"],
    "difficulty":"medium","prepTime":25,"cookTime":90,"servings":6,
    "calories":530,"protein":28,"carbs":55,"fat":22,"fiber":3,
    "ingredients":[
      {"name":"لحم غنم","amount":"كيلو واحد"},
      {"name":"أرز بسمتي","amount":"3 أكواب"},
      {"name":"زبيب ولوز وكاجو","amount":"نصف كوب مشكل"},
      {"name":"بهارات كبسة","amount":"ملعقتان كبيرتان"},
      {"name":"زعفران ولومي","amount":"حسب الرغبة"}
    ],
    "steps":["يُطهى اللحم مع البهارات حتى ينضج","يُطهى الأرز في المرق","تُحمّص المكسرات والزبيب","يُقدّم مزيّناً بالمكسرات"],
    "tips":"طبق المناسبات والعزائم"
  },
  {
    "id":"gulf_84","name":"شوربة الشوفان الخليجية","origin":"saudi",
    "description":"شوربة شوفان صحية بالدجاج والخضروات",
    "category":"healthy","mealType":["dinner"],"healthTags":["all","diabetes","obesity","cholesterol"],
    "difficulty":"easy","prepTime":10,"cookTime":20,"servings":4,
    "calories":180,"protein":12,"carbs":22,"fat":5,"fiber":4,
    "ingredients":[
      {"name":"شوفان","amount":"كوب"},
      {"name":"صدر دجاج مفتّت","amount":"كوب"},
      {"name":"جزر وكرفس","amount":"حبة من كل نوع"},
      {"name":"مرق دجاج","amount":"3 أكواب"},
      {"name":"ملح وفلفل","amount":"حسب الرغبة"}
    ],
    "steps":["يُحمّر الخضروات","يُضاف المرق والشوفان","يُطهى 15 دقيقة","يُضاف الدجاج ويُقدّم"],
    "tips":"وجبة مثالية لمرضى السكري والكوليسترول"
  },
  {
    "id":"gulf_85","name":"دجاج محشي بالأرز خليجي","origin":"saudi",
    "description":"دجاجة كاملة محشوة بالأرز المبهّر واللحم المفروم",
    "category":"hearty","mealType":["lunch"],"healthTags":["all"],
    "difficulty":"hard","prepTime":30,"cookTime":90,"servings":6,
    "calories":480,"protein":32,"carbs":40,"fat":20,"fiber":2,
    "ingredients":[
      {"name":"دجاجة كاملة","amount":"واحدة كبيرة"},
      {"name":"أرز بسمتي","amount":"كوب"},
      {"name":"لحم مفروم","amount":"200 غرام"},
      {"name":"مكسرات مشكلة","amount":"ربع كوب"},
      {"name":"بهارات مشكلة","amount":"ملعقتان كبيرتان"}
    ],
    "steps":["تُحضّر حشوة الأرز واللحم والمكسرات","تُحشى الدجاجة وتُخاط","تُتبّل من الخارج وتُخبز في الفرن","تُقدّم كاملة في طبق التقديم"],
    "tips":"يُغطّى الدجاج بالألمنيوم أول ساعة ثم يُكشف للتحمير"
  },
  {
    "id":"gulf_86","name":"سلطة الجرجير بالرمان خليجية","origin":"uae",
    "description":"سلطة جرجير منعشة مع حبوب الرمان وجبن الحلوم",
    "category":"healthy","mealType":["lunch","dinner"],"healthTags":["all","diabetes","obesity","cholesterol"],
    "difficulty":"easy","prepTime":10,"cookTime":5,"servings":4,
    "calories":160,"protein":8,"carbs":12,"fat":10,"fiber":2,
    "ingredients":[
      {"name":"جرجير","amount":"حزمتان"},
      {"name":"رمان","amount":"حبة واحدة"},
      {"name":"جبن حلوم مشوي","amount":"200 غرام"},
      {"name":"جوز","amount":"ربع كوب"},
      {"name":"زيت زيتون وليمون","amount":"حسب الرغبة"}
    ],
    "steps":["يُغسل الجرجير ويُقطّع","يُشوى الحلوم ويُقطّع","تُخلط المكونات مع الرمان والجوز","تُتبّل بالزيت والليمون"],
    "tips":"يمكن إضافة دبس الرمان للصلصة"
  },
  {
    "id":"gulf_87","name":"كنافة بالجبن خليجية","origin":"saudi",
    "description":"كنافة مقرمشة محشوة بالجبن العكاوي مع القطر",
    "category":"dessert","mealType":["snack"],"healthTags":["all"],
    "difficulty":"medium","prepTime":15,"cookTime":30,"servings":8,
    "calories":340,"protein":8,"carbs":45,"fat":14,"fiber":0,
    "ingredients":[
      {"name":"شعيرية كنافة","amount":"500 غرام"},
      {"name":"جبن عكاوي منقوع","amount":"400 غرام"},
      {"name":"سمن","amount":"نصف كوب"},
      {"name":"قطر (شيرة)","amount":"كوب"},
      {"name":"فستق مطحون","amount":"ربع كوب"}
    ],
    "steps":["تُخلط الكنافة مع السمن","تُفرد نصف الكمية في صينية","يُوزّع الجبن","تُغطّى بباقي الكنافة وتُخبز","تُسكب الشيرة وتُزيّن بالفستق"],
    "tips":"يجب نقع الجبن لتقليل الملوحة"
  },
  {
    "id":"gulf_88","name":"فتوش بالحلوم خليجي","origin":"uae",
    "description":"سلطة فتوش منعشة مع جبن الحلوم المشوي",
    "category":"healthy","mealType":["lunch","dinner"],"healthTags":["all","diabetes","obesity"],
    "difficulty":"easy","prepTime":15,"cookTime":5,"servings":4,
    "calories":200,"protein":10,"carbs":20,"fat":10,"fiber":3,
    "ingredients":[
      {"name":"خضروات مشكلة","amount":"3 أكواب"},
      {"name":"خبز محمّص","amount":"رغيف واحد"},
      {"name":"جبن حلوم","amount":"200 غرام"},
      {"name":"دبس رمان وزيت زيتون","amount":"حسب الرغبة"},
      {"name":"سماق ونعناع","amount":"حسب الرغبة"}
    ],
    "steps":["تُقطّع الخضروات وتُخلط","يُشوى الحلوم ويُقطّع","يُحمّص الخبز ويُكسّر","تُخلط المكونات مع الصلصة"],
    "tips":"يُضاف الخبز قبل التقديم مباشرة"
  },
  {
    "id":"gulf_89","name":"رز بالتمر خليجي","origin":"uae",
    "description":"أرز حلو بالتمر والمكسرات، طبق إماراتي للمناسبات",
    "category":"dessert","mealType":["lunch","snack"],"healthTags":["all"],
    "difficulty":"easy","prepTime":10,"cookTime":25,"servings":5,
    "calories":320,"protein":5,"carbs":55,"fat":10,"fiber":3,
    "ingredients":[
      {"name":"أرز بسمتي","amount":"كوبان"},
      {"name":"تمر منزوع النوى","amount":"كوب"},
      {"name":"سمن","amount":"3 ملاعق كبيرة"},
      {"name":"هيل وقرفة","amount":"رشة لكل منهما"},
      {"name":"لوز وجوز","amount":"ربع كوب"}
    ],
    "steps":["يُطهى الأرز مع البهارات","يُقطّع التمر ويُضاف","يُضاف السمن والمكسرات","يُقدّم دافئاً"],
    "tips":"يُقدّم في المناسبات والأعياد"
  },
  {
    "id":"gulf_90","name":"شوربة الدجاج بالذرة خليجية","origin":"saudi",
    "description":"شوربة دجاج خفيفة بالذرة الحلوة",
    "category":"healthy","mealType":["dinner"],"healthTags":["all","diabetes"],
    "difficulty":"easy","prepTime":10,"cookTime":20,"servings":4,
    "calories":170,"protein":14,"carbs":20,"fat":4,"fiber":2,
    "ingredients":[
      {"name":"صدر دجاج مفتّت","amount":"كوب"},
      {"name":"ذرة حلوة","amount":"كوب"},
      {"name":"مرق دجاج","amount":"3 أكواب"},
      {"name":"بصل وثوم","amount":"حبة + فصان"},
      {"name":"ملح وفلفل","amount":"حسب الرغبة"}
    ],
    "steps":["يُحمّر البصل والثوم","يُضاف المرق والذرة","يُضاف الدجاج ويُطهى","يُقدّم ساخناً"],
    "tips":"يمكن إضافة الكريمة لقوام أغنى"
  },
  {
    "id":"gulf_91","name":"كبة مشوية خليجية","origin":"saudi",
    "description":"كبة برغل مشوية محشوة باللحم والمكسرات",
    "category":"appetizer","mealType":["lunch","dinner"],"healthTags":["all"],
    "difficulty":"hard","prepTime":30,"cookTime":20,"servings":15,
    "calories":120,"protein":8,"carbs":12,"fat":5,"fiber":2,
    "ingredients":[
      {"name":"برغل ناعم","amount":"كوبان"},
      {"name":"لحم مفروم ناعم","amount":"300 غرام"},
      {"name":"لحم مفروم للحشوة","amount":"200 غرام"},
      {"name":"بصل مفروم","amount":"حبة واحدة"},
      {"name":"صنوبر","amount":"ربع كوب"},
      {"name":"بهارات كبة","amount":"ملعقة كبيرة"}
    ],
    "steps":["يُنقع البرغل ويُعجن مع اللحم","تُحضّر الحشوة من اللحم والبصل والصنوبر","تُشكّل الكبة وتُحشى","تُشوى في الفرن حتى تصبح ذهبية"],
    "tips":"يمكن قليها بدلاً من شويها"
  },
  {
    "id":"gulf_92","name":"فول مدمس خليجي","origin":"saudi",
    "description":"فول مدمس بالطحينة والليمون وزيت الزيتون",
    "category":"quick","mealType":["breakfast"],"healthTags":["all","cholesterol"],
    "difficulty":"easy","prepTime":5,"cookTime":10,"servings":3,
    "calories":230,"protein":13,"carbs":30,"fat":7,"fiber":7,
    "ingredients":[
      {"name":"فول مدمس","amount":"علبتان"},
      {"name":"طحينة","amount":"ملعقتان كبيرتان"},
      {"name":"ليمون","amount":"حبة واحدة"},
      {"name":"ثوم","amount":"فص واحد"},
      {"name":"زيت زيتون","amount":"ملعقتان كبيرتان"}
    ],
    "steps":["يُسخّن الفول مع قليل من الماء","يُضاف الثوم والكمون","يُقدّم مع الطحينة والليمون وزيت الزيتون"],
    "tips":"يُقدّم مع الخبز الطازج والخضروات"
  },
  {
    "id":"gulf_93","name":"مفطح لحم خليجي","origin":"saudi",
    "description":"لحم غنم كامل مطبوخ ببطء مع الأرز البسمتي، طبق ولائم سعودي",
    "category":"hearty","mealType":["lunch"],"healthTags":["all"],
    "difficulty":"hard","prepTime":30,"cookTime":180,"servings":10,
    "calories":550,"protein":35,"carbs":48,"fat":24,"fiber":1,
    "ingredients":[
      {"name":"لحم غنم كامل","amount":"3 كيلو"},
      {"name":"أرز بسمتي","amount":"5 أكواب"},
      {"name":"بهارات مشكلة","amount":"4 ملاعق كبيرة"},
      {"name":"سمن","amount":"نصف كوب"},
      {"name":"مكسرات","amount":"كوب"}
    ],
    "steps":["يُسلق اللحم ببطء حتى يصبح طرياً جداً","يُطهى الأرز في المرق","يُقدّم اللحم فوق الأرز","يُزيّن بالمكسرات والسمن"],
    "tips":"يحتاج صبراً في الطهي لكن النتيجة تستحق"
  },
  {
    "id":"gulf_94","name":"مهلبية خليجية بالزعفران","origin":"uae",
    "description":"حلوى حليب كريمية بالزعفران وماء الورد",
    "category":"dessert","mealType":["snack"],"healthTags":["all"],
    "difficulty":"easy","prepTime":5,"cookTime":15,"servings":5,
    "calories":180,"protein":4,"carbs":28,"fat":6,"fiber":0,
    "ingredients":[
      {"name":"حليب","amount":"3 أكواب"},
      {"name":"نشا","amount":"3 ملاعق كبيرة"},
      {"name":"سكر","amount":"ربع كوب"},
      {"name":"زعفران وماء ورد","amount":"رشة لكل منهما"},
      {"name":"فستق للتزيين","amount":"ملعقتان كبيرتان"}
    ],
    "steps":["يُذاب النشا في قليل من الحليب البارد","يُسخّن باقي الحليب مع السكر والزعفران","يُضاف النشا ويُحرّك حتى يتكثّف","يُسكب في أكواب ويُبرّد","يُزيّن بالفستق وماء الورد"],
    "tips":"يُقدّم بارداً وهو ألذ"
  },
  {
    "id":"gulf_95","name":"سلطة البطاطس الخليجية","origin":"saudi",
    "description":"سلطة بطاطس بالمايونيز والخضروات",
    "category":"appetizer","mealType":["lunch","dinner"],"healthTags":["all"],
    "difficulty":"easy","prepTime":15,"cookTime":15,"servings":5,
    "calories":200,"protein":4,"carbs":25,"fat":10,"fiber":2,
    "ingredients":[
      {"name":"بطاطس مسلوقة","amount":"4 حبات"},
      {"name":"بيض مسلوق","amount":"3 حبات"},
      {"name":"مايونيز","amount":"نصف كوب"},
      {"name":"خيار ومخلل","amount":"حسب الرغبة"},
      {"name":"ملح وفلفل","amount":"حسب الرغبة"}
    ],
    "steps":["تُقطّع البطاطس والبيض مكعبات","تُضاف الخضروات المفرومة","يُخلط المايونيز مع الملح والفلفل","تُقلّب المكونات وتُقدّم باردة"],
    "tips":"تُقدّم كمقبّلة مع الأطباق الرئيسية"
  },
  {
    "id":"gulf_96","name":"بابا غنوج خليجي","origin":"saudi",
    "description":"باذنجان مشوي مهروس بالطحينة والثوم والليمون",
    "category":"appetizer","mealType":["dinner","snack"],"healthTags":["all","diabetes","cholesterol"],
    "difficulty":"easy","prepTime":10,"cookTime":20,"servings":4,
    "calories":130,"protein":3,"carbs":12,"fat":9,"fiber":4,
    "ingredients":[
      {"name":"باذنجان كبير","amount":"حبتان"},
      {"name":"طحينة","amount":"ملعقتان كبيرتان"},
      {"name":"ليمون","amount":"حبة واحدة"},
      {"name":"ثوم","amount":"فصان"},
      {"name":"رمان للتزيين","amount":"ربع كوب"}
    ],
    "steps":["يُشوى الباذنجان على النار المباشرة","يُقشّر ويُهرس","يُخلط مع الطحينة والليمون والثوم","يُزيّن بالرمان وزيت الزيتون"],
    "tips":"الشوي على النار المباشرة يعطي نكهة مدخّنة"
  },
  {
    "id":"gulf_97","name":"شوربة العدس الأحمر الخليجية","origin":"uae",
    "description":"شوربة عدس أحمر كريمية بالكمون والليمون",
    "category":"healthy","mealType":["dinner"],"healthTags":["all","diabetes","obesity","cholesterol"],
    "difficulty":"easy","prepTime":5,"cookTime":25,"servings":5,
    "calories":160,"protein":10,"carbs":25,"fat":3,"fiber":7,
    "ingredients":[
      {"name":"عدس أحمر","amount":"كوبان"},
      {"name":"جزر وبصل","amount":"حبة من كل نوع"},
      {"name":"كمون وكركم","amount":"ملعقة لكل منهما"},
      {"name":"ليمون","amount":"حبة واحدة"},
      {"name":"زيت زيتون","amount":"ملعقتان كبيرتان"}
    ],
    "steps":["يُحمّر البصل والجزر","يُضاف العدس والماء والبهارات","يُطهى حتى ينضج","يُخلط بالخلاط ويُقدّم مع الليمون"],
    "tips":"مثالية لوجبة عشاء خفيفة وصحية"
  },
  {
    "id":"gulf_98","name":"أم علي خليجية","origin":"saudi",
    "description":"حلوى من الخبز المقرمش مع الحليب والمكسرات والزبيب",
    "category":"dessert","mealType":["snack"],"healthTags":["all"],
    "difficulty":"easy","prepTime":10,"cookTime":20,"servings":6,
    "calories":320,"protein":8,"carbs":42,"fat":14,"fiber":1,
    "ingredients":[
      {"name":"عجينة بف باستري","amount":"عبوة واحدة"},
      {"name":"حليب","amount":"3 أكواب"},
      {"name":"سكر","amount":"ربع كوب"},
      {"name":"مكسرات مشكلة","amount":"نصف كوب"},
      {"name":"زبيب وجوز هند","amount":"ربع كوب لكل منهما"}
    ],
    "steps":["تُخبز العجينة حتى تصبح ذهبية وتُكسّر","تُوزّع في صينية مع المكسرات والزبيب","يُسخّن الحليب مع السكر ويُسكب","تُخبز حتى يصبح الوجه ذهبياً"],
    "tips":"تُقدّم ساخنة وهي ألذ بكثير"
  },
  {
    "id":"gulf_99","name":"تمرية خليجية","origin":"uae",
    "description":"كرات تمر بالمكسرات والسمسم، حلوى صحية وسريعة",
    "category":"dessert","mealType":["snack"],"healthTags":["all","diabetes"],
    "difficulty":"easy","prepTime":15,"cookTime":0,"servings":15,
    "calories":80,"protein":2,"carbs":14,"fat":3,"fiber":2,
    "ingredients":[
      {"name":"تمر منزوع النوى","amount":"كوبان"},
      {"name":"لوز أو جوز","amount":"نصف كوب"},
      {"name":"سمسم","amount":"ربع كوب"},
      {"name":"جوز هند مبشور","amount":"ربع كوب"},
      {"name":"قرفة","amount":"رشة"}
    ],
    "steps":["يُعجن التمر حتى يصبح ناعماً","تُضاف المكسرات المفرومة والقرفة","تُشكّل كرات صغيرة","تُغطّى بالسمسم أو جوز الهند"],
    "tips":"تُحفظ في الثلاجة وتُقدّم كوجبة خفيفة صحية"
  },
  {
    "id":"gulf_100","name":"قهوة عربية سعودية","origin":"saudi",
    "description":"قهوة عربية أصيلة بالهيل والزعفران، رمز الضيافة الخليجية",
    "category":"quick","mealType":["snack"],"healthTags":["all","diabetes"],
    "difficulty":"easy","prepTime":5,"cookTime":15,"servings":6,
    "calories":5,"protein":0,"carbs":1,"fat":0,"fiber":0,
    "ingredients":[
      {"name":"بن عربي مطحون خشن","amount":"3 ملاعق كبيرة"},
      {"name":"ماء","amount":"3 أكواب"},
      {"name":"هيل مطحون","amount":"ملعقة صغيرة"},
      {"name":"زعفران","amount":"رشة"},
      {"name":"قرنفل (اختياري)","amount":"حبتان"}
    ],
    "steps":["يُغلى الماء ويُضاف البن","يُترك يغلي على نار هادئة 15 دقيقة","يُضاف الهيل والزعفران","يُصفّى ويُقدّم في فناجين صغيرة"],
    "tips":"تُقدّم مع التمر كتقليد خليجي أصيل"
  }
]

# ========== 50 Beverages ==========
beverages = [
  # مشروبات حارة صحية (1-12)
  {
    "id":"bev_1","name":"شاي الزنجبيل بالعسل","type":"hot","subtype":"healthy",
    "description":"مشروب دافئ من الزنجبيل الطازج والعسل الطبيعي، يُعزّز المناعة ويُهدّئ الحلق",
    "calories":40,"ingredients":[
      {"name":"زنجبيل طازج مبشور","amount":"ملعقة كبيرة"},
      {"name":"عسل طبيعي","amount":"ملعقة كبيرة"},
      {"name":"ماء مغلي","amount":"كوب"},
      {"name":"ليمون","amount":"شريحة"}
    ],
    "steps":["يُبشر الزنجبيل ويُوضع في كوب","يُسكب الماء المغلي ويُغطّى 5 دقائق","يُصفّى ويُضاف العسل والليمون"],
    "healthTags":["all","diabetes","obesity","cholesterol"],
    "tips":"يُشرب دافئاً صباحاً لتعزيز المناعة"
  },
  {
    "id":"bev_2","name":"شاي أخضر بالنعناع","type":"hot","subtype":"healthy",
    "description":"شاي أخضر منعش بالنعناع الطازج، غني بمضادات الأكسدة",
    "calories":5,"ingredients":[
      {"name":"شاي أخضر","amount":"ملعقة صغيرة"},
      {"name":"نعناع طازج","amount":"أوراق عدة"},
      {"name":"ماء مغلي","amount":"كوب"}
    ],
    "steps":["يُوضع الشاي والنعناع في إبريق","يُسكب الماء المغلي ويُنقع 3 دقائق","يُصفّى ويُقدّم"],
    "healthTags":["all","diabetes","obesity","cholesterol"],
    "tips":"لا تُنقعه أكثر من 3 دقائق حتى لا يصبح مرّاً"
  },
  {
    "id":"bev_3","name":"مشروب الكركم الذهبي","type":"hot","subtype":"healthy",
    "description":"حليب ذهبي بالكركم والقرفة، مضاد للالتهابات ومعزّز للمناعة",
    "calories":80,"ingredients":[
      {"name":"حليب","amount":"كوب"},
      {"name":"كركم مطحون","amount":"ملعقة صغيرة"},
      {"name":"قرفة","amount":"نصف ملعقة صغيرة"},
      {"name":"عسل","amount":"ملعقة صغيرة"},
      {"name":"فلفل أسود","amount":"رشة"}
    ],
    "steps":["يُسخّن الحليب مع الكركم والقرفة","يُضاف الفلفل الأسود (يُعزّز امتصاص الكركم)","يُحلّى بالعسل ويُقدّم دافئاً"],
    "healthTags":["all","cholesterol"],
    "tips":"الفلفل الأسود يزيد امتصاص الكركم بنسبة 2000%"
  },
  {
    "id":"bev_4","name":"شاي البابونج بالعسل","type":"hot","subtype":"healthy",
    "description":"مشروب مهدّئ من زهور البابونج، يُساعد على الاسترخاء والنوم",
    "calories":25,"ingredients":[
      {"name":"بابونج مجفف","amount":"ملعقة كبيرة"},
      {"name":"ماء مغلي","amount":"كوب"},
      {"name":"عسل","amount":"ملعقة صغيرة"}
    ],
    "steps":["يُوضع البابونج في كوب","يُسكب الماء المغلي ويُغطّى 5 دقائق","يُصفّى ويُحلّى بالعسل"],
    "healthTags":["all","diabetes","obesity"],
    "tips":"يُشرب قبل النوم بنصف ساعة"
  },
  {
    "id":"bev_5","name":"قهوة عربية بالهيل","type":"hot","subtype":"regular",
    "description":"قهوة عربية تقليدية بالهيل والزعفران، رمز الضيافة العربية",
    "calories":5,"ingredients":[
      {"name":"بن عربي","amount":"3 ملاعق كبيرة"},
      {"name":"ماء","amount":"3 أكواب"},
      {"name":"هيل","amount":"ملعقة صغيرة"},
      {"name":"زعفران","amount":"رشة"}
    ],
    "steps":["يُغلى الماء ويُضاف البن","يُترك على نار هادئة 15 دقيقة","يُضاف الهيل والزعفران","يُصفّى ويُقدّم"],
    "healthTags":["all","diabetes"],
    "tips":"تُقدّم مع التمر"
  },
  {
    "id":"bev_6","name":"شاي القرفة بالتفاح","type":"hot","subtype":"healthy",
    "description":"مشروب دافئ من القرفة والتفاح، يُنظّم السكر في الدم",
    "calories":45,"ingredients":[
      {"name":"تفاحة مقطعة","amount":"حبة واحدة"},
      {"name":"عود قرفة","amount":"واحد"},
      {"name":"ماء","amount":"كوبان"},
      {"name":"عسل","amount":"ملعقة صغيرة"}
    ],
    "steps":["يُغلى التفاح مع القرفة في الماء","يُترك على نار هادئة 10 دقائق","يُصفّى ويُحلّى بالعسل"],
    "healthTags":["all","diabetes","obesity","cholesterol"],
    "tips":"مثالي لمرضى السكري"
  },
  {
    "id":"bev_7","name":"حليب بالزعفران والهيل","type":"hot","subtype":"regular",
    "description":"حليب ساخن معطّر بالزعفران والهيل، مشروب خليجي كلاسيكي",
    "calories":120,"ingredients":[
      {"name":"حليب كامل الدسم","amount":"كوب"},
      {"name":"زعفران","amount":"رشة"},
      {"name":"هيل مطحون","amount":"رشة"},
      {"name":"سكر","amount":"ملعقة صغيرة"}
    ],
    "steps":["يُسخّن الحليب مع الزعفران والهيل","يُحلّى بالسكر","يُقدّم ساخناً"],
    "healthTags":["all"],
    "tips":"مشروب مثالي قبل النوم"
  },
  {
    "id":"bev_8","name":"شاي الأعشاب المغربي","type":"hot","subtype":"healthy",
    "description":"مزيج من الأعشاب المغربية مع النعناع والشيح",
    "calories":10,"ingredients":[
      {"name":"نعناع طازج","amount":"حزمة صغيرة"},
      {"name":"شيح","amount":"ملعقة صغيرة"},
      {"name":"شاي أخضر","amount":"ملعقة صغيرة"},
      {"name":"ماء مغلي","amount":"كوبان"}
    ],
    "steps":["تُوضع الأعشاب في إبريق","يُسكب الماء المغلي","يُنقع 5 دقائق ويُقدّم"],
    "healthTags":["all","diabetes","obesity"],
    "tips":"يُساعد على الهضم بعد الوجبات"
  },
  {
    "id":"bev_9","name":"سحلب خليجي","type":"hot","subtype":"regular",
    "description":"مشروب حليب كريمي بالسحلب والقرفة والمكسرات، مشروب شتوي دافئ",
    "calories":180,"ingredients":[
      {"name":"حليب","amount":"كوبان"},
      {"name":"سحلب","amount":"ملعقتان كبيرتان"},
      {"name":"سكر","amount":"ملعقتان كبيرتان"},
      {"name":"قرفة ومكسرات","amount":"للتزيين"}
    ],
    "steps":["يُذاب السحلب في قليل من الحليب البارد","يُسخّن باقي الحليب مع السكر","يُضاف السحلب ويُحرّك حتى يتكثّف","يُزيّن بالقرفة والمكسرات"],
    "healthTags":["all"],
    "tips":"يُقدّم ساخناً في الشتاء"
  },
  {
    "id":"bev_10","name":"شاي الميرمية","type":"hot","subtype":"healthy",
    "description":"شاي أعشاب من الميرمية، يُساعد على الهضم وتهدئة الأعصاب",
    "calories":5,"ingredients":[
      {"name":"أوراق ميرمية","amount":"ملعقة كبيرة"},
      {"name":"ماء مغلي","amount":"كوب"},
      {"name":"عسل (اختياري)","amount":"ملعقة صغيرة"}
    ],
    "steps":["تُوضع الميرمية في كوب","يُسكب الماء المغلي ويُغطّى 5 دقائق","يُصفّى ويُقدّم"],
    "healthTags":["all","diabetes","obesity"],
    "tips":"يُشرب بعد الوجبات لتحسين الهضم"
  },
  {
    "id":"bev_11","name":"شاي كرك خليجي","type":"hot","subtype":"regular",
    "description":"شاي حليب مبهّر بالهيل والزعفران والقرفة، مشروب خليجي شعبي",
    "calories":100,"ingredients":[
      {"name":"شاي أسود","amount":"ملعقتان كبيرتان"},
      {"name":"حليب مبخّر","amount":"نصف كوب"},
      {"name":"ماء","amount":"كوب"},
      {"name":"هيل وزعفران وقرفة","amount":"رشة لكل منها"},
      {"name":"سكر","amount":"حسب الرغبة"}
    ],
    "steps":["يُغلى الماء مع الشاي والبهارات","يُضاف الحليب والسكر","يُترك يغلي دقيقتين","يُصفّى ويُقدّم"],
    "healthTags":["all"],
    "tips":"المشروب الأكثر شعبية في الخليج"
  },
  {
    "id":"bev_12","name":"مشروب اليانسون الدافئ","type":"hot","subtype":"healthy",
    "description":"مشروب يانسون مهدّئ للمعدة والأعصاب",
    "calories":15,"ingredients":[
      {"name":"يانسون","amount":"ملعقة كبيرة"},
      {"name":"ماء مغلي","amount":"كوب"},
      {"name":"عسل","amount":"ملعقة صغيرة"}
    ],
    "steps":["يُوضع اليانسون في كوب","يُسكب الماء المغلي ويُنقع 5 دقائق","يُصفّى ويُحلّى بالعسل"],
    "healthTags":["all","diabetes","obesity"],
    "tips":"مفيد لتهدئة المغص والانتفاخ"
  },
  {
    "id":"bev_13","name":"شاي الحبق (الريحان)","type":"hot","subtype":"healthy",
    "description":"شاي أعشاب من الريحان الطازج، منعش ومهدّئ",
    "calories":5,"ingredients":[
      {"name":"أوراق ريحان طازجة","amount":"حفنة"},
      {"name":"ماء مغلي","amount":"كوب"},
      {"name":"عسل","amount":"ملعقة صغيرة"}
    ],
    "steps":["تُوضع أوراق الريحان في كوب","يُسكب الماء المغلي","يُنقع 5 دقائق ويُحلّى"],
    "healthTags":["all","diabetes","obesity"],
    "tips":"يُساعد على تخفيف التوتر"
  },
  # مشروبات باردة صحية (14-25)
  {
    "id":"bev_14","name":"عصير الليمون بالنعناع","type":"cold","subtype":"healthy",
    "description":"عصير ليمون منعش بالنعناع الطازج، مثالي للصيف",
    "calories":30,"ingredients":[
      {"name":"ليمون","amount":"3 حبات"},
      {"name":"نعناع طازج","amount":"حزمة صغيرة"},
      {"name":"ماء بارد","amount":"لتر"},
      {"name":"عسل","amount":"ملعقتان كبيرتان"},
      {"name":"ثلج","amount":"حسب الرغبة"}
    ],
    "steps":["يُعصر الليمون","يُخلط مع الماء والعسل والنعناع","يُضاف الثلج ويُقدّم"],
    "healthTags":["all","diabetes","obesity","cholesterol"],
    "tips":"يمكن إضافة شرائح الخيار للمزيد من الانتعاش"
  },
  {
    "id":"bev_15","name":"سموذي الموز والتوت","type":"cold","subtype":"healthy",
    "description":"عصير سميك من الموز والتوت المشكل واللبن، غني بالفيتامينات",
    "calories":150,"ingredients":[
      {"name":"موز","amount":"حبة واحدة"},
      {"name":"توت مشكل مجمد","amount":"كوب"},
      {"name":"لبن زبادي","amount":"نصف كوب"},
      {"name":"عسل","amount":"ملعقة صغيرة"}
    ],
    "steps":["تُخلط جميع المكونات في الخلاط","يُخلط حتى يصبح ناعماً","يُقدّم بارداً"],
    "healthTags":["all","cholesterol"],
    "tips":"يمكن إضافة بذور الشيا لقيمة غذائية أعلى"
  },
  {
    "id":"bev_16","name":"ماء الديتوكس بالخيار والليمون","type":"cold","subtype":"healthy",
    "description":"ماء منكّه بالخيار والليمون والنعناع، يُنظّف الجسم",
    "calories":10,"ingredients":[
      {"name":"خيار مقطع شرائح","amount":"نصف حبة"},
      {"name":"ليمون مقطع","amount":"نصف حبة"},
      {"name":"نعناع طازج","amount":"أوراق عدة"},
      {"name":"ماء بارد","amount":"لتر"}
    ],
    "steps":["تُوضع الشرائح والنعناع في إبريق","يُضاف الماء البارد","يُترك في الثلاجة ساعتين","يُقدّم بارداً"],
    "healthTags":["all","diabetes","obesity","cholesterol"],
    "tips":"يُشرب طوال اليوم لترطيب الجسم"
  },
  {
    "id":"bev_17","name":"عصير البرتقال والجزر","type":"cold","subtype":"healthy",
    "description":"عصير طازج من البرتقال والجزر، غني بفيتامين C وبيتا كاروتين",
    "calories":90,"ingredients":[
      {"name":"برتقال","amount":"3 حبات"},
      {"name":"جزر","amount":"حبتان"},
      {"name":"زنجبيل طازج","amount":"شريحة صغيرة"}
    ],
    "steps":["يُعصر البرتقال","يُعصر الجزر في العصارة","يُخلط مع الزنجبيل ويُقدّم"],
    "healthTags":["all","diabetes","obesity","cholesterol"],
    "tips":"يُشرب طازجاً للاستفادة القصوى من الفيتامينات"
  },
  {
    "id":"bev_18","name":"سموذي السبانخ الأخضر","type":"cold","subtype":"healthy",
    "description":"عصير أخضر صحي من السبانخ والموز والتفاح",
    "calories":120,"ingredients":[
      {"name":"سبانخ طازجة","amount":"كوبان"},
      {"name":"موز","amount":"حبة واحدة"},
      {"name":"تفاح أخضر","amount":"حبة واحدة"},
      {"name":"ماء أو حليب لوز","amount":"كوب"}
    ],
    "steps":["تُخلط جميع المكونات في الخلاط","يُخلط حتى يصبح ناعماً","يُقدّم بارداً"],
    "healthTags":["all","diabetes","obesity","cholesterol"],
    "tips":"يمكن إضافة بذور الكتان لقيمة غذائية أعلى"
  },
  {
    "id":"bev_19","name":"عصير الرمان الطازج","type":"cold","subtype":"healthy",
    "description":"عصير رمان طبيعي غني بمضادات الأكسدة",
    "calories":70,"ingredients":[
      {"name":"رمان","amount":"3 حبات كبيرة"},
      {"name":"ماء بارد","amount":"نصف كوب"},
      {"name":"عسل (اختياري)","amount":"ملعقة صغيرة"}
    ],
    "steps":["تُستخرج حبوب الرمان","تُخلط في الخلاط مع الماء","تُصفّى وتُقدّم باردة"],
    "healthTags":["all","diabetes","cholesterol"],
    "tips":"من أقوى مضادات الأكسدة الطبيعية"
  },
  {
    "id":"bev_20","name":"لبن عيران خليجي","type":"cold","subtype":"healthy",
    "description":"لبن مخفوق بالملح والنعناع، مشروب منعش ومفيد للهضم",
    "calories":60,"ingredients":[
      {"name":"لبن زبادي","amount":"كوب"},
      {"name":"ماء بارد","amount":"كوب"},
      {"name":"ملح","amount":"رشة"},
      {"name":"نعناع مجفف","amount":"رشة"}
    ],
    "steps":["يُخلط اللبن مع الماء والملح","يُخفق جيداً","يُضاف النعناع ويُقدّم بارداً"],
    "healthTags":["all","diabetes","obesity"],
    "tips":"مشروب مثالي مع الوجبات الدسمة"
  },
  {
    "id":"bev_21","name":"عصير الأناناس والزنجبيل","type":"cold","subtype":"healthy",
    "description":"عصير أناناس منعش مع الزنجبيل، مضاد للالتهابات",
    "calories":80,"ingredients":[
      {"name":"أناناس مقطع","amount":"كوبان"},
      {"name":"زنجبيل طازج","amount":"ملعقة صغيرة مبشورة"},
      {"name":"ماء بارد","amount":"نصف كوب"},
      {"name":"نعناع","amount":"أوراق عدة"}
    ],
    "steps":["تُخلط جميع المكونات في الخلاط","يُصفّى ويُقدّم بارداً مع الثلج"],
    "healthTags":["all","cholesterol"],
    "tips":"يُساعد على الهضم ومضاد للالتهابات"
  },
  {
    "id":"bev_22","name":"سموذي الأفوكادو","type":"cold","subtype":"healthy",
    "description":"عصير أفوكادو كريمي بالحليب والعسل، غني بالدهون الصحية",
    "calories":200,"ingredients":[
      {"name":"أفوكادو ناضج","amount":"حبة واحدة"},
      {"name":"حليب","amount":"كوب"},
      {"name":"عسل","amount":"ملعقة كبيرة"},
      {"name":"ثلج","amount":"حسب الرغبة"}
    ],
    "steps":["يُقطّع الأفوكادو","يُخلط مع الحليب والعسل والثلج","يُقدّم بارداً"],
    "healthTags":["all","cholesterol"],
    "tips":"غني بالدهون الصحية المفيدة للقلب"
  },
  {
    "id":"bev_23","name":"عصير البطيخ المنعش","type":"cold","subtype":"healthy",
    "description":"عصير بطيخ طبيعي بارد، مرطّب ومنعش في الصيف",
    "calories":50,"ingredients":[
      {"name":"بطيخ مقطع","amount":"3 أكواب"},
      {"name":"نعناع","amount":"أوراق عدة"},
      {"name":"ليمون","amount":"نصف حبة"},
      {"name":"ثلج","amount":"حسب الرغبة"}
    ],
    "steps":["يُخلط البطيخ في الخلاط","يُضاف الليمون والنعناع","يُقدّم بارداً مع الثلج"],
    "healthTags":["all","diabetes","obesity"],
    "tips":"مشروب مثالي لترطيب الجسم في الصيف"
  },
  {
    "id":"bev_24","name":"عصير التفاح والكرفس","type":"cold","subtype":"healthy",
    "description":"عصير أخضر من التفاح والكرفس والليمون، يُنظّف الجسم",
    "calories":60,"ingredients":[
      {"name":"تفاح أخضر","amount":"حبتان"},
      {"name":"كرفس","amount":"عودان"},
      {"name":"ليمون","amount":"نصف حبة"},
      {"name":"زنجبيل","amount":"شريحة صغيرة"}
    ],
    "steps":["تُعصر جميع المكونات في العصارة","تُخلط وتُقدّم باردة"],
    "healthTags":["all","diabetes","obesity","cholesterol"],
    "tips":"يُشرب صباحاً على معدة فارغة"
  },
  {
    "id":"bev_25","name":"ماء جوز الهند الطبيعي","type":"cold","subtype":"healthy",
    "description":"ماء جوز هند طبيعي غني بالمعادن والإلكتروليتات",
    "calories":45,"ingredients":[
      {"name":"ماء جوز هند طبيعي","amount":"كوب"},
      {"name":"ليمون","amount":"شريحة"},
      {"name":"ثلج","amount":"حسب الرغبة"}
    ],
    "steps":["يُسكب ماء جوز الهند في كوب","يُضاف الليمون والثلج","يُقدّم بارداً"],
    "healthTags":["all","diabetes","obesity"],
    "tips":"بديل طبيعي ممتاز لمشروبات الطاقة"
  },
  # مشروبات حارة عادية (26-37)
  {
    "id":"bev_26","name":"شاي تركي","type":"hot","subtype":"regular",
    "description":"شاي أسود تركي قوي يُقدّم في أكواب زجاجية صغيرة",
    "calories":5,"ingredients":[
      {"name":"شاي أسود تركي","amount":"ملعقتان كبيرتان"},
      {"name":"ماء مغلي","amount":"كوبان"},
      {"name":"سكر","amount":"حسب الرغبة"}
    ],
    "steps":["يُوضع الشاي في إبريق صغير","يُسكب الماء المغلي","يُترك على نار هادئة 5 دقائق","يُقدّم في أكواب صغيرة"],
    "healthTags":["all"],
    "tips":"يُقدّم مع حلويات تركية"
  },
  {
    "id":"bev_27","name":"قهوة تركية","type":"hot","subtype":"regular",
    "description":"قهوة تركية مطبوخة على النار مع الهيل",
    "calories":10,"ingredients":[
      {"name":"بن تركي ناعم","amount":"ملعقتان صغيرتان"},
      {"name":"ماء بارد","amount":"فنجان"},
      {"name":"سكر","amount":"حسب الرغبة"},
      {"name":"هيل","amount":"رشة"}
    ],
    "steps":["يُخلط البن والسكر والماء في الركوة","يُسخّن على نار هادئة","يُرفع عند بدء الغليان","يُسكب في الفنجان"],
    "healthTags":["all"],
    "tips":"لا تُحرّكها بعد وضعها على النار"
  },
  {
    "id":"bev_28","name":"شوكولاتة ساخنة","type":"hot","subtype":"regular",
    "description":"مشروب شوكولاتة كريمي ساخن مع الكريمة المخفوقة",
    "calories":250,"ingredients":[
      {"name":"حليب","amount":"كوب"},
      {"name":"شوكولاتة داكنة","amount":"50 غرام"},
      {"name":"سكر","amount":"ملعقة كبيرة"},
      {"name":"كريمة مخفوقة","amount":"للتزيين"}
    ],
    "steps":["يُسخّن الحليب","تُذاب الشوكولاتة فيه مع التحريك","يُحلّى بالسكر","يُزيّن بالكريمة المخفوقة"],
    "healthTags":["all"],
    "tips":"استخدم شوكولاتة بنسبة كاكاو عالية لنكهة أغنى"
  },
  {
    "id":"bev_29","name":"لاتيه بالفانيلا","type":"hot","subtype":"regular",
    "description":"قهوة إسبريسو مع الحليب المبخّر ونكهة الفانيلا",
    "calories":150,"ingredients":[
      {"name":"إسبريسو","amount":"جرعة واحدة"},
      {"name":"حليب مبخّر","amount":"كوب"},
      {"name":"فانيلا","amount":"ملعقة صغيرة"},
      {"name":"سكر","amount":"حسب الرغبة"}
    ],
    "steps":["يُحضّر الإسبريسو","يُسخّن الحليب ويُرغّى","يُضاف الفانيلا","يُسكب الحليب فوق القهوة"],
    "healthTags":["all"],
    "tips":"يمكن استخدام حليب اللوز لنسخة صحية"
  },
  {
    "id":"bev_30","name":"شاي الحليب الهندي (ماسالا)","type":"hot","subtype":"regular",
    "description":"شاي حليب مبهّر بالبهارات الهندية، دافئ وعطري",
    "calories":110,"ingredients":[
      {"name":"شاي أسود","amount":"ملعقتان صغيرتان"},
      {"name":"حليب","amount":"كوب"},
      {"name":"ماء","amount":"نصف كوب"},
      {"name":"هيل وقرفة وزنجبيل وقرنفل","amount":"رشة لكل منها"},
      {"name":"سكر","amount":"حسب الرغبة"}
    ],
    "steps":["يُغلى الماء مع البهارات","يُضاف الشاي ويُترك دقيقتين","يُضاف الحليب والسكر","يُغلى مرة أخرى ويُصفّى"],
    "healthTags":["all"],
    "tips":"البهارات تعطي النكهة المميزة"
  },
  {
    "id":"bev_31","name":"موكا ساخنة","type":"hot","subtype":"regular",
    "description":"مزيج من القهوة والشوكولاتة والحليب المبخّر",
    "calories":220,"ingredients":[
      {"name":"إسبريسو","amount":"جرعة واحدة"},
      {"name":"شوكولاتة","amount":"ملعقتان كبيرتان"},
      {"name":"حليب مبخّر","amount":"كوب"},
      {"name":"كريمة مخفوقة","amount":"للتزيين"}
    ],
    "steps":["يُحضّر الإسبريسو","تُذاب الشوكولاتة في الحليب الساخن","يُخلط مع القهوة","يُزيّن بالكريمة"],
    "healthTags":["all"],
    "tips":"يمكن استخدام كاكاو بودرة بدلاً من الشوكولاتة"
  },
  {
    "id":"bev_32","name":"شاي إيرل غراي بالحليب","type":"hot","subtype":"regular",
    "description":"شاي إيرل غراي العطري مع الحليب والسكر",
    "calories":80,"ingredients":[
      {"name":"شاي إيرل غراي","amount":"كيس واحد"},
      {"name":"حليب","amount":"ربع كوب"},
      {"name":"ماء مغلي","amount":"كوب"},
      {"name":"سكر","amount":"حسب الرغبة"}
    ],
    "steps":["يُنقع الشاي في الماء المغلي 3 دقائق","يُضاف الحليب والسكر","يُقدّم ساخناً"],
    "healthTags":["all"],
    "tips":"لا تُنقعه أكثر من 3 دقائق"
  },
  {
    "id":"bev_33","name":"قهوة بالبندق","type":"hot","subtype":"regular",
    "description":"قهوة بنكهة البندق الغنية والكريمية",
    "calories":120,"ingredients":[
      {"name":"قهوة مطحونة","amount":"ملعقتان كبيرتان"},
      {"name":"حليب","amount":"نصف كوب"},
      {"name":"شراب البندق","amount":"ملعقة كبيرة"},
      {"name":"كريمة","amount":"للتزيين"}
    ],
    "steps":["تُحضّر القهوة","يُسخّن الحليب","يُضاف شراب البندق","يُزيّن بالكريمة"],
    "healthTags":["all"],
    "tips":"يمكن استخدام شراب الكراميل بدلاً من البندق"
  },
  # مشروبات باردة عادية (34-50)
  {
    "id":"bev_34","name":"عصير مانجو بالحليب","type":"cold","subtype":"regular",
    "description":"عصير مانجو كريمي بالحليب، مشروب صيفي منعش ولذيذ",
    "calories":180,"ingredients":[
      {"name":"مانجو ناضجة","amount":"حبتان"},
      {"name":"حليب بارد","amount":"كوب"},
      {"name":"سكر","amount":"ملعقتان كبيرتان"},
      {"name":"ثلج","amount":"حسب الرغبة"}
    ],
    "steps":["يُقطّع المانجو","يُخلط مع الحليب والسكر والثلج","يُقدّم بارداً"],
    "healthTags":["all"],
    "tips":"استخدم مانجو ناضجة جداً لأفضل نكهة"
  },
  {
    "id":"bev_35","name":"ميلك شيك فراولة","type":"cold","subtype":"regular",
    "description":"ميلك شيك فراولة كريمي مع الآيس كريم",
    "calories":280,"ingredients":[
      {"name":"فراولة طازجة","amount":"كوب"},
      {"name":"حليب بارد","amount":"كوب"},
      {"name":"آيس كريم فانيلا","amount":"كرتان"},
      {"name":"سكر","amount":"ملعقة كبيرة"}
    ],
    "steps":["تُخلط جميع المكونات في الخلاط","يُخلط حتى يصبح كريمياً","يُقدّم بارداً"],
    "healthTags":["all"],
    "tips":"يمكن استبدال الفراولة بأي فاكهة"
  },
  {
    "id":"bev_36","name":"عصير كوكتيل الفواكه","type":"cold","subtype":"regular",
    "description":"مزيج من الفواكه الاستوائية المنعشة",
    "calories":130,"ingredients":[
      {"name":"مانجو","amount":"نصف حبة"},
      {"name":"فراولة","amount":"5 حبات"},
      {"name":"موز","amount":"نصف حبة"},
      {"name":"عصير برتقال","amount":"كوب"},
      {"name":"ثلج","amount":"حسب الرغبة"}
    ],
    "steps":["تُقطّع الفواكه","تُخلط مع عصير البرتقال والثلج","يُقدّم بارداً"],
    "healthTags":["all"],
    "tips":"يمكن إضافة أي فاكهة متوفرة"
  },
  {
    "id":"bev_37","name":"عصير فيمتو خليجي","type":"cold","subtype":"regular",
    "description":"مشروب فيمتو المنعش، المشروب الرمضاني الخليجي الأشهر",
    "calories":120,"ingredients":[
      {"name":"شراب فيمتو مركز","amount":"3 ملاعق كبيرة"},
      {"name":"ماء بارد","amount":"كوب"},
      {"name":"ثلج","amount":"حسب الرغبة"},
      {"name":"نعناع وليمون","amount":"للتزيين"}
    ],
    "steps":["يُخلط الفيمتو مع الماء البارد","يُضاف الثلج","يُزيّن بالنعناع والليمون"],
    "healthTags":["all"],
    "tips":"المشروب الرسمي لرمضان في الخليج"
  },
  {
    "id":"bev_38","name":"عصير التمر بالحليب","type":"cold","subtype":"regular",
    "description":"مشروب تمر بالحليب، مغذٍّ وغني بالطاقة",
    "calories":220,"ingredients":[
      {"name":"تمر منزوع النوى","amount":"5 حبات"},
      {"name":"حليب بارد","amount":"كوب"},
      {"name":"هيل","amount":"رشة"},
      {"name":"ثلج","amount":"حسب الرغبة"}
    ],
    "steps":["يُنقع التمر في الحليب 30 دقيقة","يُخلط في الخلاط مع الهيل","يُضاف الثلج ويُقدّم"],
    "healthTags":["all"],
    "tips":"مشروب مثالي للإفطار في رمضان"
  },
  {
    "id":"bev_39","name":"لبن بالفراولة","type":"cold","subtype":"regular",
    "description":"لبن زبادي مخفوق بالفراولة الطازجة",
    "calories":140,"ingredients":[
      {"name":"لبن زبادي","amount":"كوب"},
      {"name":"فراولة","amount":"كوب"},
      {"name":"سكر","amount":"ملعقتان كبيرتان"},
      {"name":"ثلج","amount":"حسب الرغبة"}
    ],
    "steps":["تُخلط جميع المكونات في الخلاط","يُقدّم بارداً"],
    "healthTags":["all"],
    "tips":"يمكن استبدال الفراولة بالمانجو أو الموز"
  },
  {
    "id":"bev_40","name":"عصير قمر الدين","type":"cold","subtype":"regular",
    "description":"عصير مشمش مجفف، مشروب رمضاني تقليدي",
    "calories":100,"ingredients":[
      {"name":"قمر الدين (مشمش مجفف)","amount":"200 غرام"},
      {"name":"ماء دافئ","amount":"3 أكواب"},
      {"name":"سكر","amount":"ربع كوب"},
      {"name":"ماء ورد","amount":"ملعقة صغيرة"}
    ],
    "steps":["يُنقع قمر الدين في الماء الدافئ طوال الليل","يُخلط في الخلاط","يُحلّى بالسكر وماء الورد","يُقدّم بارداً"],
    "healthTags":["all"],
    "tips":"من أشهر مشروبات رمضان"
  },
  {
    "id":"bev_41","name":"موهيتو بدون كحول","type":"cold","subtype":"regular",
    "description":"موهيتو منعش بالليمون والنعناع والصودا",
    "calories":50,"ingredients":[
      {"name":"ليمون أخضر","amount":"حبة واحدة"},
      {"name":"نعناع طازج","amount":"حزمة صغيرة"},
      {"name":"سكر","amount":"ملعقتان كبيرتان"},
      {"name":"صودا","amount":"كوب"},
      {"name":"ثلج مجروش","amount":"كوب"}
    ],
    "steps":["يُهرس النعناع مع الليمون والسكر","يُضاف الثلج المجروش","تُسكب الصودا ويُقدّم"],
    "healthTags":["all"],
    "tips":"يمكن إضافة فراولة أو توت للنكهة"
  },
  {
    "id":"bev_42","name":"عصير الجلاب","type":"cold","subtype":"regular",
    "description":"مشروب الجلاب التقليدي بدبس العنب وماء الورد والصنوبر",
    "calories":110,"ingredients":[
      {"name":"شراب الجلاب","amount":"3 ملاعق كبيرة"},
      {"name":"ماء بارد","amount":"كوب"},
      {"name":"صنوبر","amount":"ملعقة كبيرة"},
      {"name":"زبيب","amount":"ملعقة كبيرة"},
      {"name":"ثلج","amount":"حسب الرغبة"}
    ],
    "steps":["يُخلط الجلاب مع الماء البارد","يُضاف الثلج","يُزيّن بالصنوبر والزبيب"],
    "healthTags":["all"],
    "tips":"مشروب رمضاني شامي أصيل"
  },
  {
    "id":"bev_43","name":"سموذي المانجو والموز","type":"cold","subtype":"regular",
    "description":"عصير سميك من المانجو والموز واللبن",
    "calories":200,"ingredients":[
      {"name":"مانجو","amount":"حبة واحدة"},
      {"name":"موز","amount":"حبة واحدة"},
      {"name":"لبن زبادي","amount":"نصف كوب"},
      {"name":"عسل","amount":"ملعقة كبيرة"},
      {"name":"ثلج","amount":"حسب الرغبة"}
    ],
    "steps":["تُقطّع الفواكه","تُخلط مع اللبن والعسل والثلج","يُقدّم بارداً"],
    "healthTags":["all"],
    "tips":"يمكن إضافة بذور الشيا"
  },
  {
    "id":"bev_44","name":"عصير الخوخ بالنعناع","type":"cold","subtype":"regular",
    "description":"عصير خوخ منعش بالنعناع الطازج",
    "calories":90,"ingredients":[
      {"name":"خوخ ناضج","amount":"3 حبات"},
      {"name":"نعناع طازج","amount":"أوراق عدة"},
      {"name":"ماء بارد","amount":"نصف كوب"},
      {"name":"عسل","amount":"ملعقة صغيرة"}
    ],
    "steps":["يُقطّع الخوخ","يُخلط مع النعناع والماء والعسل","يُقدّم بارداً"],
    "healthTags":["all"],
    "tips":"يُفضّل استخدام خوخ ناضج جداً"
  },
  {
    "id":"bev_45","name":"آيس تي بالليمون","type":"cold","subtype":"regular",
    "description":"شاي مثلج بالليمون، مشروب منعش لأيام الصيف",
    "calories":60,"ingredients":[
      {"name":"شاي أسود","amount":"ملعقتان كبيرتان"},
      {"name":"ماء مغلي","amount":"كوبان"},
      {"name":"ليمون","amount":"حبتان"},
      {"name":"سكر","amount":"3 ملاعق كبيرة"},
      {"name":"ثلج","amount":"كمية كبيرة"}
    ],
    "steps":["يُنقع الشاي في الماء المغلي 5 دقائق","يُصفّى ويُحلّى بالسكر","يُبرّد ويُضاف عصير الليمون والثلج"],
    "healthTags":["all"],
    "tips":"يمكن إضافة نكهات مثل الخوخ أو التوت"
  },
  {
    "id":"bev_46","name":"عصير الليمون بالعسل والزنجبيل","type":"cold","subtype":"healthy",
    "description":"مشروب ليمون بارد مع العسل والزنجبيل، منعش ومعزّز للمناعة",
    "calories":50,"ingredients":[
      {"name":"ليمون","amount":"حبتان"},
      {"name":"عسل","amount":"ملعقتان كبيرتان"},
      {"name":"زنجبيل مبشور","amount":"ملعقة صغيرة"},
      {"name":"ماء بارد","amount":"لتر"},
      {"name":"ثلج","amount":"حسب الرغبة"}
    ],
    "steps":["يُعصر الليمون","يُخلط مع العسل والزنجبيل والماء","يُضاف الثلج ويُقدّم"],
    "healthTags":["all","diabetes","obesity","cholesterol"],
    "tips":"مشروب مثالي لتعزيز المناعة"
  },
  {
    "id":"bev_47","name":"عصير الكيوي والليمون","type":"cold","subtype":"healthy",
    "description":"عصير كيوي منعش بالليمون، غني بفيتامين C",
    "calories":70,"ingredients":[
      {"name":"كيوي","amount":"3 حبات"},
      {"name":"ليمون","amount":"نصف حبة"},
      {"name":"ماء بارد","amount":"كوب"},
      {"name":"عسل","amount":"ملعقة صغيرة"}
    ],
    "steps":["يُقشّر الكيوي ويُقطّع","يُخلط مع الليمون والماء والعسل","يُقدّم بارداً"],
    "healthTags":["all","diabetes","obesity"],
    "tips":"غني جداً بفيتامين C"
  },
  {
    "id":"bev_48","name":"آيس لاتيه","type":"cold","subtype":"regular",
    "description":"قهوة لاتيه مثلجة كريمية ومنعشة",
    "calories":130,"ingredients":[
      {"name":"إسبريسو مبرّد","amount":"جرعة مزدوجة"},
      {"name":"حليب بارد","amount":"كوب"},
      {"name":"سكر أو شراب فانيلا","amount":"حسب الرغبة"},
      {"name":"ثلج","amount":"كوب"}
    ],
    "steps":["يُحضّر الإسبريسو ويُبرّد","يُوضع الثلج في كوب طويل","يُسكب الحليب ثم القهوة","يُحلّى حسب الرغبة"],
    "healthTags":["all"],
    "tips":"يمكن استخدام حليب اللوز أو الشوفان"
  },
  {
    "id":"bev_49","name":"عصير التوت المشكل","type":"cold","subtype":"healthy",
    "description":"عصير توت مشكل غني بمضادات الأكسدة",
    "calories":80,"ingredients":[
      {"name":"توت أزرق","amount":"نصف كوب"},
      {"name":"توت أحمر","amount":"نصف كوب"},
      {"name":"فراولة","amount":"نصف كوب"},
      {"name":"ماء بارد","amount":"كوب"},
      {"name":"عسل","amount":"ملعقة صغيرة"}
    ],
    "steps":["تُخلط جميع أنواع التوت في الخلاط","يُضاف الماء والعسل","يُصفّى ويُقدّم بارداً"],
    "healthTags":["all","diabetes","cholesterol"],
    "tips":"من أغنى المشروبات بمضادات الأكسدة"
  },
  {
    "id":"bev_50","name":"عصير الشمندر والبرتقال","type":"cold","subtype":"healthy",
    "description":"عصير شمندر بالبرتقال والجزر، يُعزّز الدورة الدموية",
    "calories":85,"ingredients":[
      {"name":"شمندر (بنجر)","amount":"حبة واحدة"},
      {"name":"برتقال","amount":"حبتان"},
      {"name":"جزر","amount":"حبة واحدة"},
      {"name":"زنجبيل","amount":"شريحة صغيرة"}
    ],
    "steps":["تُعصر جميع المكونات في العصارة","تُخلط وتُقدّم باردة"],
    "healthTags":["all","cholesterol"],
    "tips":"يُحسّن ضغط الدم ويُعزّز الدورة الدموية"
  }
]

# ========== Generate TypeScript ==========
def ingredient_to_ts(ing):
    return f'      {{ name: "{ing["name"]}", amount: "{ing["amount"]}" }}'

def recipe_to_ts(r):
    lines = []
    lines.append("  {")
    lines.append(f'    id: "{r["id"]}",')
    lines.append(f'    name: "{r["name"]}",')
    lines.append(f'    description: "{r["description"]}",')
    lines.append(f'    category: "{r["category"]}" as RecipeCategory,')
    mt = ", ".join([f'"{m}"' for m in r["mealType"]])
    lines.append(f'    mealType: [{mt}] as MealType[],')
    ht = ", ".join([f'"{h}"' for h in r["healthTags"]])
    lines.append(f'    healthTags: [{ht}] as HealthTag[],')
    lines.append(f'    difficulty: "{r["difficulty"]}" as "easy" | "medium" | "hard",')
    lines.append(f'    prepTime: {r["prepTime"]},')
    lines.append(f'    cookTime: {r["cookTime"]},')
    lines.append(f'    servings: {r["servings"]},')
    lines.append(f'    calories: {r["calories"]},')
    lines.append(f'    protein: {r["protein"]},')
    lines.append(f'    carbs: {r["carbs"]},')
    lines.append(f'    fat: {r["fat"]},')
    lines.append(f'    fiber: {r["fiber"]},')
    ings = ",\n".join([ingredient_to_ts(i) for i in r["ingredients"]])
    lines.append(f'    ingredients: [\n{ings}\n    ],')
    steps = ",\n".join([f'      "{s}"' for s in r["steps"]])
    lines.append(f'    steps: [\n{steps}\n    ],')
    lines.append(f'    tips: "{r.get("tips", "")}",')
    lines.append(f'    isIraqi: false,')
    lines.append(f'    origin: "{r["origin"]}",')
    lines.append(f'    image: undefined,')
    lines.append("  },")
    return "\n".join(lines)

def beverage_to_ts(b):
    lines = []
    lines.append("  {")
    lines.append(f'    id: "{b["id"]}",')
    lines.append(f'    name: "{b["name"]}",')
    lines.append(f'    description: "{b["description"]}",')
    lines.append(f'    type: "{b["type"]}" as "hot" | "cold",')
    lines.append(f'    subtype: "{b["subtype"]}" as "healthy" | "regular",')
    lines.append(f'    calories: {b["calories"]},')
    ht = ", ".join([f'"{h}"' for h in b["healthTags"]])
    lines.append(f'    healthTags: [{ht}] as HealthTag[],')
    ings = ",\n".join([ingredient_to_ts(i) for i in b["ingredients"]])
    lines.append(f'    ingredients: [\n{ings}\n    ],')
    steps = ",\n".join([f'      "{s}"' for s in b["steps"]])
    lines.append(f'    steps: [\n{steps}\n    ],')
    lines.append(f'    tips: "{b.get("tips", "")}",')
    lines.append("  },")
    return "\n".join(lines)

# Write gulf recipes 68-100
gulf_ts = "\n".join([recipe_to_ts(r) for r in gulf_extra])
with open("/home/ubuntu/awafiyat/scripts/gulf_extra.ts.txt", "w") as f:
    f.write(gulf_ts)

# Write beverages
bev_ts = "\n".join([beverage_to_ts(b) for b in beverages])
with open("/home/ubuntu/awafiyat/scripts/beverages.ts.txt", "w") as f:
    f.write(bev_ts)

print(f"Generated {len(gulf_extra)} gulf recipes (68-100)")
print(f"Generated {len(beverages)} beverages")
print("Files written to scripts/gulf_extra.ts.txt and scripts/beverages.ts.txt")
