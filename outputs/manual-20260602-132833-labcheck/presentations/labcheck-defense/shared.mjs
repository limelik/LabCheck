import {
  composeSlide,
  panel,
  column,
  grid,
  fixed,
  fr,
  text,
  shape,
  rule,
  paint,
  stroke,
  textStyle,
} from "@oai/artifact-tool";

const COLORS = {
  ink: "#16324d",
  inkSoft: "#53697f",
  blue: "#0f4c81",
  blue2: "#2f7cc0",
  blue3: "#5fa2da",
  blueLight: "#dfeeff",
  bluePale: "#f5faff",
  border: "#c8d8eb",
  borderSoft: "#dce7f4",
  white: "#ffffff",
  green: "#2f8f69",
  amber: "#d98f2b",
  red: "#c64f4f",
  slate: "#8aa0b8",
};

const FONT = "Arian AMU";
const SLIDE_W = 1280;
const SLIDE_H = 720;

function style(size, weight = 400, color = COLORS.ink, extra = "") {
  const parts = [`font: ${weight} ${size}px ${FONT}`, `color: ${color}`];
  if (extra) parts.push(extra);
  return textStyle(parts.join("; "));
}

function titleText(value, width = "fill") {
  return text(value, { width, style: style(32, 700, COLORS.ink, "leading: 1.14") });
}

function subtitleText(value, width = "fill") {
  return text(value, { width, style: style(16, 400, COLORS.inkSoft, "leading: 1.3") });
}

function bodyText(value, width = "fill", size = 18, color = COLORS.ink) {
  return text(value, { width, style: style(size, 400, color, "leading: 1.32") });
}

function smallLabel(value, width = "fill", color = COLORS.inkSoft) {
  return text(value, { width, style: style(12, 600, color, "leading: 1.2") });
}

function bulletList(items, width = "fill", size = 17) {
  return column(
    { gap: 10, width },
    items.map((item) => bodyText(`• ${item}`, width, size)),
  );
}

function accentBar(width = 132) {
  return shape({
    width,
    height: 6,
    fill: COLORS.blue,
    borderRadius: 4,
  });
}

function badge(value, fillColor = COLORS.blueLight, textColor = COLORS.blue) {
  return panel(
    {
      padding: 10,
      fill: fillColor,
      borderRadius: 999,
    },
    text(value, {
      style: style(13, 700, textColor, "align: center"),
    }),
  );
}

function statCard(value, label) {
  return panel(
    {
      padding: 18,
      fill: COLORS.bluePale,
      line: stroke(`1 ${COLORS.borderSoft}`),
      borderRadius: 18,
    },
    column({ gap: 6 }, [
      text(value, { style: style(26, 700, COLORS.blue) }),
      smallLabel(label, "fill", COLORS.inkSoft),
    ]),
  );
}

function infoPair(label, value) {
  return grid(
    {
      columns: [fixed(108), fr(1)],
      columnGap: 12,
      width: "fill",
    },
    [
      smallLabel(label, "fill", COLORS.inkSoft),
      bodyText(value, "fill", 16),
    ],
  );
}

function sectionChip(value) {
  return panel(
    {
      padding: 8,
      fill: "#edf5ff",
      borderRadius: 999,
    },
    text(value, { style: style(12, 700, COLORS.blue, "align: center") }),
  );
}

function card(title, content, options = {}) {
  const fill = options.fill || COLORS.white;
  const titleColor = options.titleColor || COLORS.ink;
  const items =
    Array.isArray(content)
      ? bulletList(content, "fill", options.bulletSize || 16)
      : bodyText(content, "fill", options.bodySize || 16, options.bodyColor || COLORS.ink);

  return panel(
    {
      padding: options.padding || 20,
      fill,
      line: stroke(`1 ${options.border || COLORS.borderSoft}`),
      borderRadius: options.radius || 18,
      width: options.width || "fill",
      height: options.height || "hug",
    },
    column({ gap: 12, width: "fill" }, [
      grid({ columns: [fixed(14), fr(1)], columnGap: 10, width: "fill" }, [
        shape({
          width: 14,
          height: 14,
          geometry: "ellipse",
          fill: options.dot || COLORS.blue,
        }),
        text(title, { width: "fill", style: style(options.titleSize || 18, 700, titleColor, "leading: 1.2") }),
      ]),
      items,
    ]),
  );
}

function codeCard(title, lines) {
  return panel(
    {
      padding: 16,
      fill: "#f8fbff",
      line: stroke(`1 ${COLORS.border}`),
      borderRadius: 16,
      width: "fill",
    },
    column({ gap: 8 }, [
      text(title, { style: style(16, 700, COLORS.blue) }),
      ...lines.map((line) =>
        text(line, {
          width: "fill",
          style: style(15, 400, COLORS.ink, "leading: 1.28"),
        }),
      ),
    ]),
  );
}

function fakeTable(headers, rows, tracks) {
  const columns = tracks || headers.map(() => fr(1));
  const headerRow = grid(
    {
      columns,
      columnGap: 8,
      width: "fill",
    },
    headers.map((header) =>
      panel(
        {
          padding: 12,
          fill: "#e9f3ff",
          borderRadius: 12,
        },
        text(header, { style: style(13, 700, COLORS.blue, "align: center") }),
      ),
    ),
  );

  const bodyRows = rows.map((row) =>
    grid(
      {
        columns,
        columnGap: 8,
        width: "fill",
      },
      row.map((cell, index) =>
        panel(
          {
            padding: 12,
            fill: index === 0 ? "#fbfdff" : COLORS.white,
            line: stroke(`1 ${COLORS.borderSoft}`),
            borderRadius: 12,
          },
          bodyText(cell, "fill", 14),
        ),
      ),
    ),
  );

  return column({ gap: 8, width: "fill" }, [headerRow, ...bodyRows]);
}

function flowRow(nodes) {
  const columns = [];
  const children = [];
  nodes.forEach((node, index) => {
    columns.push(fr(1));
    children.push(card(node.title, node.caption, {
      fill: node.fill || COLORS.white,
      border: node.border || COLORS.border,
      dot: node.dot || COLORS.blue,
      titleColor: node.titleColor || COLORS.ink,
      titleSize: 16,
      padding: 14,
      bodySize: 13,
      bodyColor: COLORS.inkSoft,
    }));
    if (index < nodes.length - 1) {
      columns.push(fixed(48));
      children.push(text("→", { style: style(28, 700, COLORS.blue, "align: center") }));
    }
  });
  return grid({ columns, columnGap: 10, width: "fill" }, children);
}

function verticalFlow(nodes) {
  const children = [];
  nodes.forEach((node, index) => {
    children.push(card(node.title, node.caption, {
      fill: node.fill || COLORS.white,
      border: node.border || COLORS.border,
      dot: node.dot || COLORS.blue,
      titleColor: node.titleColor || COLORS.ink,
      titleSize: 16,
      padding: 14,
      bodySize: 13,
      bodyColor: COLORS.inkSoft,
    }));
    if (index < nodes.length - 1) {
      children.push(text("↓", { style: style(28, 700, COLORS.blue, "align: center") }));
    }
  });
  return column({ gap: 10, width: "fill", align: "stretch" }, children);
}

function useCaseRole(title, cases, fillColor) {
  return panel(
    {
      padding: 18,
      fill: fillColor,
      line: stroke(`1 ${COLORS.border}`),
      borderRadius: 18,
    },
    column({ gap: 12 }, [
      text(title, { style: style(18, 700, COLORS.ink, "align: center") }),
      ...cases.map((item) => badge(item, COLORS.white, COLORS.blue)),
    ]),
  );
}

function layerCard(title, caption, tone = COLORS.white) {
  return card(title, caption, {
    fill: tone,
    border: COLORS.border,
    dot: COLORS.blue,
    bodySize: 14,
    bodyColor: COLORS.inkSoft,
  });
}

function topHeader(spec, index) {
  return column({ gap: 12, width: "fill" }, [
    grid({ columns: [fr(1), fixed(152)], columnGap: 20, width: "fill" }, [
      column({ gap: 8, width: "fill" }, [
        accentBar(),
        grid({ columns: [fixed(150), fr(1)], columnGap: 12, width: "fill" }, [
          sectionChip(spec.kicker),
          text(spec.title, {
            width: "fill",
            style: style(30, 700, COLORS.ink, "leading: 1.14"),
          }),
        ]),
        text(spec.subtitle, {
          width: "fill",
          style: style(15, 400, COLORS.inkSoft, "leading: 1.28"),
        }),
      ]),
      column({ gap: 10 }, [
        statCard(String(index).padStart(2, "0"), "սլայդ"),
      ]),
    ]),
    rule({ width: "fill", stroke: COLORS.borderSoft }),
  ]);
}

function footer(index) {
  return grid({ columns: [fr(1), fixed(120)], columnGap: 20, width: "fill" }, [
    smallLabel("LabCheck • MySQL schema • Armenian defense deck", "fill", COLORS.slate),
    text(String(index).padStart(2, "0"), {
      width: "fill",
      style: style(12, 700, COLORS.blue, "align: right"),
    }),
  ]);
}

function stage(spec, index, content) {
  return panel(
    {
      width: SLIDE_W,
      height: SLIDE_H,
      fill: paint("linear(180deg, #f4f9ff 0%, #e6f0fb 100%)"),
      padding: 48,
    },
    panel(
      {
        width: "fill",
        height: "fill",
        fill: COLORS.white,
        line: stroke(`1 ${COLORS.border}`),
        borderRadius: 28,
        padding: 30,
      },
      column({ gap: 18, width: "fill", height: "fill" }, [
        topHeader(spec, index),
        panel({ width: "fill", height: "fill" }, content),
        footer(index),
      ]),
    ),
  );
}

const SPECS = [
  {
    kicker: "Շապիկ",
    title: "Լաբորատոր աշխատանքների կատարողականի գրանցման և վերահսկման համակարգ",
    subtitle: "Տվյալների բազայի կառուցվածք և բիզնես տրամաբանություն",
    notes:
      "Այս տարբերակում ներկայացումը անմիջապես կենտրոնանում է տվյալների բազայի կառուցվածքի վրա։ Շեշտը դրվում է ոչ թե ընդհանուր նպատակի կամ տեխնիկական մեխանիզմների, այլ աղյուսակների դերի և դրանց միջև բիզնես կապերի վրա։",
  },
  {
    kicker: "Ընդհանուր տեսք",
    title: "Ինչպես է բաժանված մոդելը",
    subtitle: "Բազան կառուցված է երեք խոշոր շերտով՝ հաշիվներ, ակադեմիական կառուցվածք և ուսումնական գործընթաց",
    notes:
      "Այս սլայդը տալիս է ամբողջ մոդելի ընթերցման տրամաբանությունը։ Նախ ունենք հաշիվներ և դերեր, հետո համալսարանական կառուցվածքը, և վերջում այն աղյուսակները, որոնք իրականում նկարագրում են առարկայի անցկացումը, ուսանողի գրանցումը և լաբորատոր աշխատանքի արդյունքը։",
  },
  {
    kicker: "Հաշիվներ",
    title: "`user_accounts` և դերային աղյուսակները",
    subtitle: "`user_accounts`-ը ընդհանուր մուտքային հիմքն է, իսկ դերային աղյուսակները պահում են տվյալ դերի բովանդակությունը",
    notes:
      "Մոդելը սկսվում է `user_accounts` աղյուսակից, որովհետև յուրաքանչյուր մարդ նախ ունի հաշիվ։ Դրանից հետո տվյալ հաշիվը դառնում է ադմինիստրատոր, դասախոս կամ ուսանող՝ համապատասխան դերային աղյուսակի միջոցով։ Այս մոտեցումը օգնում է չկրկնել նույնականացման տվյալները բոլոր դերերում առանձին։",
  },
  {
    kicker: "Ադմինիստրատորներ",
    title: "`admins` աղյուսակը",
    subtitle: "Այս աղյուսակը նկարագրում է ով է համակարգը կառավարում և որ ակադեմիական միավորի համար",
    notes:
      "Ադմինիստրատորը բազայում դիտարկվում է որպես առանձին բիզնես դեր։ Նա կապված է հաշվի հետ, բայց ունի նաև իր կառավարման տիրույթը։ Եթե ադմինը պատասխանատու է կոնկրետ ակադեմիական միավորի համար, դա պահվում է հենց այս աղյուսակում։",
  },
  {
    kicker: "Դասախոսներ և ուսանողներ",
    title: "`teachers` և `students` աղյուսակները",
    subtitle: "Դրանք պահում են մարդկանց ակադեմիական դերերը, մինչդեռ իրական մասնակցությունը նկարագրվում է հետագա կապող աղյուսակներով",
    notes:
      "Այս երկու աղյուսակները դեռ չեն ասում, թե ով ինչ է դասավանդում կամ ինչի է մասնակցում։ Դրանք պահում են միայն դերային ինքնությունը։ Իրական ուսումնական մասնակցությունը գալիս է հետո՝ նշանակումների և գրանցումների միջոցով։ Սա շատ կարևոր բաժանում է բիզնես տեսանկյունից։",
  },
  {
    kicker: "Կառուցվածք",
    title: "`academic_units` և `specializations`",
    subtitle: "Այս հատվածը նկարագրում է համալսարանի վերին կազմակերպական շերտը",
    notes:
      "Առաջին կառուցվածքային մակարդակում ունենք ինստիտուտներ կամ ֆակուլտետներ, իսկ դրանց ներսում՝ մասնագիտություններ։ Այս աղյուսակները պետք են, որպեսզի ուսումնական ամբողջ գործընթացը կապված լինի իրական համալսարանական կառուցվածքի հետ, ոչ թե լինի վերացական խմբերի հավաքածու։",
  },
  {
    kicker: "Խմբեր",
    title: "`academic_groups` և `lab_groups`",
    subtitle: "Ակադեմիական խումբը ընդհանուր հոսքն է, իսկ լաբորատոր խումբը նրա ներսում բաժանված ուսումնական ենթախումբը",
    notes:
      "Սա մոդելի ամենակարևոր բիզնես բաժանումներից մեկն է։ Մի ակադեմիական խումբ կարող է բաժանվել մի քանի լաբորատոր խմբերի։ Հենց այստեղից է գալիս այն հնարավորությունը, որ նույն ակադեմիական խմբի տարբեր լաբորատոր ենթախմբերը կարող են աշխատել տարբեր դասախոսների հետ։",
  },
  {
    kicker: "Առարկաներ",
    title: "`subjects` աղյուսակը",
    subtitle: "Այստեղ պահվում է առարկան որպես կատալոգային միավոր, ոչ թե որպես կոնկրետ անցկացվող դասընթաց",
    notes:
      "Այս աղյուսակում առարկան դեռ անկախ է խմբից, տարուց կամ կիսամյակից։ Այսպիսով մեկ անգամ սահմանված առարկան կարելի է հետո օգտագործել տարբեր ուսումնական իրավիճակներում։ Այս բաժանումը թույլ է տալիս չկրկնել նույն առարկան ամեն կիսամյակի կամ ամեն խմբի համար։",
  },
  {
    kicker: "Առաջարկներ",
    title: "`subject_group_offerings` աղյուսակը",
    subtitle: "Սա ասում է, թե կոնկրետ որ առարկան է դասավանդվում կոնկրետ որ խմբին, որ տարում և որ կիսամյակում",
    notes:
      "Եթե `subjects` աղյուսակը ասում է «ինչ առարկա է», ապա `subject_group_offerings`-ը ասում է «որտեղ և երբ է այդ առարկան անցկացվում»։ Սա արդեն իրական ուսումնական դեպքն է, որի շուրջ հետո կկառուցվեն թե՛ դասախոսի նշանակումը, թե՛ ուսանողի գրանցումը, թե՛ լաբորատոր աշխատանքները։",
  },
  {
    kicker: "Դասախոսի նշանակումը",
    title: "`teacher_subject_assignments` աղյուսակը",
    subtitle: "Այստեղ որոշվում է, թե որ դասախոսն է տվյալ առարկայի առաջարկի մեջ աշխատում կոնկրետ որ lab group-ի հետ",
    notes:
      "Այս աղյուսակը կարևոր է, որովհետև հենց այստեղ է արտահայտվում քո նշած բիզնես կանոնը՝ նույն ակադեմիական խմբի ներսում տարբեր լաբորատոր խմբեր կարող են դասավանդվել տարբեր դասախոսների կողմից։ Այսպիսով դասախոսի նշանակումը կապված է ոչ միայն առարկայի, այլ նաև ենթախմբի հետ։",
  },
  {
    kicker: "Ուսանողի գրանցումը",
    title: "`student_subject_enrollments` աղյուսակը",
    subtitle: "Այն պահում է, թե ուսանողը տվյալ առարկայի առաջարկի շրջանակում որ lab group-ի անդամ է",
    notes:
      "Ուսանողը պարզապես խմբի անդամ լինելը դեռ բավարար չէ, որովհետև յուրաքանչյուր առարկայի դեպքում նրա լաբորատոր ենթախումբը կարևոր է։ Այս աղյուսակն ասում է, թե կոնկրետ այդ առարկայի համար ուսանողը որ ենթախմբում է հաշվառված, և հենց դա է որոշում նրա տեսանելի լաբորատորները։",
  },
  {
    kicker: "Լաբորատոր աշխատանքներ",
    title: "`lab_assignments` աղյուսակը",
    subtitle: "Այստեղ պահվում են տվյալ առաջարկին պատկանող լաբորատոր աշխատանքները որպես առանձին ուսումնական միավորներ",
    notes:
      "Լաբորատոր աշխատանքը համակարգում դիտարկվում է որպես առանձին միավոր, որը պատկանում է առարկայի կոնկրետ առաջարկին։ Այստեղ պահվում է աշխատանքի համարը և առավելագույն գնահատականը։ Այս աղյուսակը պետք է, որպեսզի հետո արդյունքները գրանցվեն ոչ թե ընդհանուր առարկայի, այլ կոնկրետ լաբորատոր աշխատանքի մակարդակով։",
  },
  {
    kicker: "Արդյունքներ",
    title: "`student_lab_results` աղյուսակը",
    subtitle: "Այս աղյուսակը միավորում է ուսանողին, լաբորատոր աշխատանքը, հաճախումը և գնահատականը",
    notes:
      "Սա ամբողջ մոդելի վերջնական բիզնես արդյունքն է։ Այստեղ արդեն մեկ կոնկրետ ուսանողի համար մեկ կոնկրետ լաբորատոր աշխատանքի կատարողականն է պահվում։ Այս աղյուսակն ունի իմաստ միայն այն պատճառով, որ նախորդ բոլոր աղյուսակները ճիշտ նկարագրել են ուսանողի տեղը, դասախոսի նշանակումը և առարկայի առաջարկը։",
  },
  {
    kicker: "Բիզնես սցենար",
    title: "Մի academic group, մի քանի lab group, մի քանի դասախոս",
    subtitle: "Մոդելը հատուկ նախագծված է ենթախմբերով դասավանդումը նկարագրելու համար",
    notes:
      "Սա հենց այն սցենարն է, որը պետք է հատկապես շեշտել պաշտպանության ժամանակ։ Օրինակ՝ մեկ ակադեմիական խումբ կարող է բաժանվել 319-1 և 319-2 լաբորատոր խմբերի, և այդ երկու ենթախմբերը կարող են ունենալ տարբեր դասախոսներ նույն առարկայի շրջանակում։ Այդ տրամաբանությունը մաքուր ձևով արտահայտվում է `teacher_subject_assignments` աղյուսակում։",
  },
  {
    kicker: "Բիզնես սցենար",
    title: "Ինչպես է ուսանողը «մտնում» իր ճիշտ լաբորատորների մեջ",
    subtitle: "Ուսանողի համար տեսանելիությունը որոշվում է ոչ թե միայն խմբով, այլ նաև տվյալ առարկայի enrollment-ով",
    notes:
      "Այս սլայդը բացատրում է, թե ինչու `student_subject_enrollments` աղյուսակը պարտադիր է։ Եթե ուսանողը պարզապես լինի ընդհանուր խմբի անդամ, համակարգը չի հասկանա տվյալ առարկայի համար նա որ ենթախմբում է աշխատում։ Այդ պատճառով enrollment-ը առանձին բիզնես փաստ է։",
  },
  {
    kicker: "Բիզնես սցենար",
    title: "Ինչու է առարկան բաժանված `subjects` և `subject_group_offerings`",
    subtitle: "Առարկան կատալոգ է, offering-ը՝ այդ առարկայի կոնկրետ անցկացումը",
    notes:
      "Այս բաժանումը շատ կարևոր է բացատրել, որովհետև այն ցույց է տալիս մոդելի հասունությունը։ Եթե ամեն անգամ առարկան պահվեր խմբի կամ կիսամյակի հետ միասին, նույն առարկան բազմիցս կկրկնվեր։ Offering-ի առանձին աղյուսակը թույլ է տալիս պահել իրական դասավանդման դեպքը առանց կատալոգը կրկնելու։",
  },
  {
    kicker: "Ինչու այսպես",
    title: "Ինչու են assignment և enrollment աղյուսակները առանձին",
    subtitle: "Դասախոսի մասնակցությունը և ուսանողի մասնակցությունը տարբեր բիզնես փաստեր են",
    notes:
      "Դասախոսն ու ուսանողը նույն առարկայի առաջարկի մեջ տարբեր դերերով են մասնակցում։ Դասախոսը նշանակվում է դասավանդելու, իսկ ուսանողը գրանցվում է սովորելու։ Այս պատճառով մոդելը դրանք միավորում չէ մեկ ընդհանուր աղյուսակում, այլ պահում է որպես երկու առանձին հարաբերություն։",
  },
  {
    kicker: "Placeholder-ներ",
    title: "Որտեղ ավելացնել screenshot-ներ և table-to-table դիագրամներ",
    subtitle: "Այս սլայդում նշված տեղերը կարելի է փոխարինել քո իրական schema screenshot-ներով",
    notes:
      "Քո խնդրանքով այս հատվածում կարելի է ոչ թե գեներացնել սխեմաներ, այլ հստակ գրել ինչ screenshot կամ կապ ցույց տալ։ Այդպես դու կարող ես ավելացնել սեփական ERD կամ phpMyAdmin / Workbench screenshot-ները և պահել տեխնիկական ճշգրտությունը։",
  },
  {
    kicker: "Կանոններ",
    title: "Հիմնական բիզնես կանոնները կառուցվածքի մակարդակում",
    subtitle: "Մոդելի իմաստը հենց այն է, որ այն նկարագրում է իրական ուսումնական կազմակերպումը",
    notes:
      "Այս սլայդում պետք է շեշտել ոչ թե trigger-ները, այլ հենց կանոնների բիզնես իմաստը։ Համակարգը պահանջում է համալսարանական հաշիվ, կապում է դասախոսին ճիշտ ենթախմբի հետ, կապում է ուսանողին ճիշտ enrollment-ի հետ, և պահում է գնահատականները կոնկրետ լաբորատոր աշխատանքի մակարդակում։",
  },
  {
    kicker: "Փակում",
    title: "Շնորհակալություն ուշադրության համար",
    subtitle: "Հարցեր և քննարկում տվյալների բազայի կառուցվածքի շուրջ",
    notes:
      "Վերջին սլայդը փակման համար է։ Այստեղ կարելի է քննարկումը տեղափոխել կոնկրետ աղյուսակների ընտրության, բիզնես կապերի և մոդելի հիմնավորման վրա։",
  },
];

function slide01Body() {
  return grid({ columns: [fr(1), fixed(350)], columnGap: 26, width: "fill" }, [
    column({ gap: 20 }, [
      card("Նախագծի առանցքը", [
        "Տվյալների բազայի կառուցվածքը նկարագրում է ամբողջ լաբորատոր ուսումնական հոսքը",
        "Շեշտը դրված է աղյուսակների դերի և դրանց միջև բիզնես կապերի վրա",
        "Հատուկ ուշադրություն է դարձված academic group / lab group բաժանմանը",
      ], { fill: "#edf5ff", dot: COLORS.blue, bulletSize: 16, padding: 24 }),
      grid({ columns: [fr(1), fr(1), fr(1)], columnGap: 12, width: "fill" }, [
        statCard("3 շերտ", "Հաշիվներ, կառուցվածք, գործընթաց"),
        statCard("14 աղյուսակ", "Հիմնական բիզնես մոդել"),
        statCard("Lab groups", "Ենթախմբային տրամաբանություն"),
      ]),
      grid({ columns: [fr(1), fr(1), fr(1)], columnGap: 12, width: "fill" }, [
        badge("MySQL"),
        badge("Role-Based Access"),
        badge("Workflow Control"),
      ]),
    ]),
    panel(
      {
        padding: 22,
        fill: COLORS.white,
        line: stroke(`1 ${COLORS.border}`),
        borderRadius: 24,
      },
      column({ gap: 14 }, [
        text("Ներկայացման տվյալներ", { style: style(18, 700, COLORS.blue) }),
        infoPair("Հեղինակ", "Անուն Ազգանուն"),
        infoPair("ԲՈՒՀ", "ՀԱՊՀ"),
        infoPair("Ֆակուլտետ", "Տեղեկատվական տեխնոլոգիաներ"),
        infoPair("Ղեկավար", "Անուն Ազգանուն"),
        infoPair("Տարի", "2026"),
      ]),
    ),
  ]);
}

function slide02Body() {
  return column({ gap: 18, width: "fill" }, [
    grid({ columns: [fr(1), fr(1), fr(1)], columnGap: 16, width: "fill" }, [
      card("1. Հաշիվներ և դերեր", ["user_accounts", "admins", "teachers", "students"], { fill: "#f8fbff", dot: COLORS.blue }),
      card("2. Ակադեմիական կառուցվածք", ["academic_units", "specializations", "academic_groups", "lab_groups"], { fill: "#f8fbff", dot: COLORS.blue2 }),
      card("3. Ուսումնական գործընթաց", ["subjects", "subject_group_offerings", "teacher_subject_assignments", "student_subject_enrollments", "lab_assignments", "student_lab_results"], { fill: "#f8fbff", dot: COLORS.green, bulletSize: 15 }),
    ]),
    card("Մոդելի հիմնական գաղափարը", [
      "Մարդը նախ դառնում է համակարգի օգտատեր",
      "Հետո նա տեղավորվում է համալսարանի կառուցվածքի մեջ",
      "Վերջում նա մասնակցում է կոնկրետ առարկայի առաջարկի, լաբորատոր ենթախմբի և արդյունքի մակարդակով",
    ], { fill: "#edf5ff", dot: COLORS.blue, bulletSize: 16 }),
    grid({ columns: [fr(1), fr(1)], columnGap: 16, width: "fill" }, [
      card("Կարդալու հերթականություն", ["Սկսել `user_accounts`-ից", "Հետո անցնել `academic_units`-ից մինչև `lab_groups`", "Ապա հասկանալ offering → assignment → result շղթան"], { fill: COLORS.white, dot: COLORS.blue3, bulletSize: 15 }),
      card("Դիագրամ placeholder", ["Տեղադրել ընդհանուր ERD screenshot", "Կամ գրել՝ put user/structure/process overview"], { fill: COLORS.white, dot: COLORS.amber, bulletSize: 15 }),
    ]),
  ]);
}

function slide03Body() {
  return column({ gap: 18, width: "fill" }, [
    grid({ columns: [fixed(450), fr(1)], columnGap: 18, width: "fill" }, [
      fakeTable(
        ["`user_accounts` դաշտ", "Իմաստ"],
        [
          ["email", "Համալսարանական մուտքային նույնականացում"],
          ["password_hash", "Մուտքի գաղտնաբառի պահպանում"],
          ["account_type", "Որ դերային ուղղությամբ կշարժվի հաշիվը"],
          ["approval_status", "Հաստատված է, թե դեռ սպասման մեջ"],
          ["last_login_at", "Վերջին մուտքի վերահսկում"],
        ],
        [fixed(170), fr(1)],
      ),
      column({ gap: 16 }, [
        card("Ինչու է `user_accounts`-ը առանձին", [
          "Նույնականացման տվյալները մեկ անգամ են պահվում",
          "Ադմինի, դասախոսի և ուսանողի հաշիվները սկսվում են նույն հիմքից",
          "Դերային աղյուսակները պահում են արդեն տվյալ դերին հատուկ տեղեկությունը",
        ], { fill: "#f8fbff", dot: COLORS.blue, bulletSize: 15 }),
        card("Կապերի իմաստ", [
          "`user_accounts` → `admins`",
          "`user_accounts` → `teachers`",
          "`user_accounts` → `students`",
        ], { fill: COLORS.white, dot: COLORS.green }),
        card("Diagram placeholder", ["put user_accounts - admins/teachers/students"], { fill: COLORS.white, dot: COLORS.amber }),
      ]),
    ]),
  ]);
}

function slide04Body() {
  return column({ gap: 20, width: "fill" }, [
    grid({ columns: [fixed(420), fr(1)], columnGap: 18, width: "fill" }, [
      fakeTable(
        ["`admins` դաշտ", "Բացատրություն"],
        [
          ["user_account_id", "Որ հաշվի ադմին պրոֆիլն է"],
          ["academic_unit_id", "Որ կառուցվածքային միավորի համար է պատասխանատու"],
          ["first_name / last_name", "Ադմինի անձնական տվյալներ"],
          ["admin_level", "Ընդհանուր ադմին, թե academic unit admin"],
        ],
        [fixed(180), fr(1)],
      ),
      column({ gap: 16 }, [
        card("Աղյուսակի բիզնես իմաստը", [
          "Ադմինիստրատորը համակարգի կազմակերպիչ դեր է",
          "Նա կարող է լինել կոնկրետ academic unit-ի պատասխանատու",
          "Այս կապը թույլ է տալիս կառավարման իրավասությունը կապել համալսարանի կառուցվածքի հետ",
        ], { fill: "#f8fbff", dot: COLORS.blue, bulletSize: 15 }),
        card("Ինչու սա առանձին աղյուսակ է", [
          "Որովհետև ադմին լինելու փաստը տարբեր է պարզապես հաշիվ ունենալուց",
          "Բոլոր օգտատերերը ադմին չեն, ուստի այս տվյալները չեն պահվում `user_accounts`-ում",
        ], { fill: COLORS.white, dot: COLORS.green, bulletSize: 15 }),
      ]),
    ]),
    card("Screenshot placeholder", ["Տեղադրել `admins` table screenshot", "Կամ գրել՝ put user_accounts - admins"], { fill: COLORS.white, dot: COLORS.amber }),
  ]);
}

function slide05Body() {
  return grid({ columns: [fr(1), fr(1)], columnGap: 18, width: "fill" }, [
    column({ gap: 14 }, [
      fakeTable(
        ["`teachers`", "Իմաստ"],
        [
          ["user_account_id", "Դասախոսական հաշվի կապ"],
          ["first_name / last_name", "Դասախոսի տվյալներ"],
        ],
        [fixed(150), fr(1)],
      ),
      card("Դասախոս աղյուսակի դերը", [
        "Դասախոսը որպես մարդ դեռ չի նշանակում, որ արդեն ինչ-որ առարկա է վարում",
        "Նրա իրական դասավանդման մասնակցությունը հետո է երևում assignment աղյուսակում",
      ], { fill: "#f8fbff", dot: COLORS.blue, bulletSize: 15 }),
    ]),
    column({ gap: 14 }, [
      fakeTable(
        ["`students`", "Իմաստ"],
        [
          ["user_account_id", "Ուսանողական հաշվի կապ"],
          ["first_name / last_name", "Ուսանողի տվյալներ"],
        ],
        [fixed(150), fr(1)],
      ),
      card("Ուսանող աղյուսակի դերը", [
        "Ուսանող լինելը դեռ չի ասում, թե որ առարկայի որ ենթախմբում է սովորում",
        "Այդ բիզնես փաստը հետո պահվում է enrollment աղյուսակում",
      ], { fill: COLORS.white, dot: COLORS.green, bulletSize: 15 }),
    ]),
  ]);
}

function slide06Body() {
  return grid({ columns: [fr(1), fr(1)], columnGap: 18, width: "fill" }, [
    column({ gap: 14 }, [
      fakeTable(
        ["`academic_units`", "Իմաստ"],
        [
          ["code", "Կարճ կոդ"],
          ["name", "Միավորի անվանում"],
          ["unit_type", "Ինստիտուտ կամ ֆակուլտետ"],
        ],
        [fixed(150), fr(1)],
      ),
      card("Ինչ է նկարագրում", [
        "Համալսարանի վերին կազմակերպական մակարդակը",
        "Կառավարման և մասնագիտությունների ելակետային կետը",
      ], { fill: "#f8fbff", dot: COLORS.blue }),
    ]),
    column({ gap: 14 }, [
      fakeTable(
        ["`specializations`", "Իմաստ"],
        [
          ["academic_unit_id", "Որ academic unit-ի ներսում է"],
          ["code", "Մասնագիտության կոդ"],
          ["name", "Մասնագիտության անվանում"],
        ],
        [fixed(170), fr(1)],
      ),
      card("Ինչու է պետք", [
        "Քանի որ խմբերը չեն գոյանում օդում",
        "Դրանք պատկանում են կոնկրետ մասնագիտության, իսկ մասնագիտությունը՝ academic unit-ի",
      ], { fill: COLORS.white, dot: COLORS.green, bulletSize: 15 }),
      card("Diagram placeholder", ["put academic_units - specializations"], { fill: COLORS.white, dot: COLORS.amber }),
    ]),
  ]);
}

function slide07Body() {
  return column({ gap: 18, width: "fill" }, [
    verticalFlow([
      { title: "Academic Unit", caption: "Օր.` Ֆակուլտետ կամ ինստիտուտ", fill: "#edf5ff" },
      { title: "Specialization", caption: "Օր.` Ծրագրային ճարտարագիտություն", fill: "#ffffff" },
      { title: "Academic Group", caption: "Օր.` 319", fill: "#edf5ff" },
      { title: "Lab Group", caption: "Օր.` 319-1, 319-2", fill: "#ffffff" },
    ]),
    grid({ columns: [fr(1), fr(1)], columnGap: 16, width: "fill" }, [
      card("Ամենակարևոր բիզնես միտքը", [
        "Academic group-ը ընդհանուր հոսքն է",
        "Lab group-ը այդ հոսքի ներսում բաժանված աշխատանքային ենթախումբն է",
      ], { fill: "#f8fbff", dot: COLORS.blue }),
      card("Ինչու սա կարևոր է", [
        "Նույն ակադեմիական խմբի տարբեր lab group-ներ կարող են ունենալ տարբեր դասախոսներ",
        "Ուսանողի ճիշտ լաբորատորներն ու արդյունքները կախված են հենց այս բաժանումից",
      ], { fill: "#edf5ff", dot: COLORS.green, bulletSize: 15 }),
    ]),
  ]);
}

function slide08Body() {
  return grid({ columns: [fixed(420), fr(1)], columnGap: 18, width: "fill" }, [
    column({ gap: 14 }, [
      fakeTable(
        ["`subjects` դաշտ", "Բացատրություն"],
        [
          ["code", "Առարկայի կոդ"],
          ["name", "Առարկայի անվանում"],
        ],
        [fixed(140), fr(1)],
      ),
      card("Այս աղյուսակը ինչ չի ասում", [
        "Այն չի ասում որ խմբին է դասավանդվում",
        "Այն չի ասում որ տարում կամ որ կիսամյակում է գնում",
      ], { fill: "#fffaf3", dot: COLORS.amber }),
    ]),
    column({ gap: 16 }, [
      card("Ինչ է ասում `subjects`-ը", [
        "Սա առարկայի մաքուր կատալոգային նկարագրությունն է",
        "Միևնույն առարկան կարող է հետո բազմիցս օգտագործվել տարբեր offering-ներում",
      ], { fill: "#f8fbff", dot: COLORS.blue, bulletSize: 15 }),
      card("Ինչու է այս ձևը ճիշտ", [
        "Քանի որ նույն առարկան չպետք է կրկնվի ամեն խմբի կամ ամեն կիսամյակի համար առանձին",
      ], { fill: COLORS.white, dot: COLORS.green }),
      card("Screenshot placeholder", ["Տեղադրել `subjects` table screenshot"], { fill: COLORS.white, dot: COLORS.amber }),
    ]),
  ]);
}

function slide09Body() {
  return grid({ columns: [fixed(470), fr(1)], columnGap: 18, width: "fill" }, [
    column({ gap: 14 }, [
      fakeTable(
        ["`subject_group_offerings`", "Բացատրություն"],
        [
          ["subject_id", "Որ առարկան է"],
          ["academic_group_id", "Որ խմբի համար է"],
          ["academic_year", "Որ ուս. տարում է"],
          ["semester", "Որ կիսամյակում է"],
          ["total_grade", "Ընդհանուր գնահատման չափը"],
        ],
        [fixed(180), fr(1)],
      ),
    ]),
    column({ gap: 16 }, [
      card("Offering-ի բիզնես իմաստը", [
        "Սա առարկայի կոնկրետ անցկացումն է",
        "Այստեղ արդեն առարկան կապվում է խմբի, տարվա և կիսամյակի հետ",
        "Հետագա բոլոր ուսումնական գործողությունները կկապվեն հենց offering-ի շուրջ",
      ], { fill: "#f8fbff", dot: COLORS.blue, bulletSize: 15 }),
      card("Diagram placeholder", ["put subjects - subject_group_offerings - academic_groups"], { fill: COLORS.white, dot: COLORS.amber }),
    ]),
  ]);
}

function slide10Body() {
  return column({ gap: 18, width: "fill" }, [
    flowRow([
      { title: "Teacher", caption: "Ով է դասավանդում" },
      { title: "Subject Offering", caption: "Ինչն է անցկացվում", fill: "#f7fbff" },
      { title: "Lab Group", caption: "Որ ենթախմբի համար" },
    ]),
    grid({ columns: [fr(1), fr(1)], columnGap: 16, width: "fill" }, [
      card("`teacher_subject_assignments` աղյուսակը ինչ է ասում", [
        "Այս դասախոսը աշխատում է այս offering-ի մեջ",
        "Բայց ոչ ամբողջ academic group-ի, այլ կոնկրետ lab group-ի հետ",
      ], { fill: "#edf5ff", dot: COLORS.blue, bulletSize: 15 }),
      card("Սա ինչ բիզնես խնդիր է լուծում", [
        "Մեկ academic group-ի ներսում տարբեր lab group-ներ կարող են ունենալ տարբեր դասախոսներ",
        "Նույն առարկան կարելի է բաժանել ենթախմբային ուսուցման",
      ], { fill: "#f8fbff", dot: COLORS.green, bulletSize: 15 }),
    ]),
    card("Diagram placeholder", ["put teachers - teacher_subject_assignments - subject_group_offerings - lab_groups"], { fill: COLORS.white, dot: COLORS.amber }),
  ]);
}

function slide11Body() {
  return column({ gap: 18, width: "fill" }, [
    flowRow([
      { title: "Student", caption: "Ով է սովորում" },
      { title: "Subject Offering", caption: "Որ առարկայի անցկացման մեջ է" },
      { title: "Lab Group", caption: "Որ ենթախմբի մաս է" },
    ]),
    grid({ columns: [fr(1), fr(1)], columnGap: 16, width: "fill" }, [
      card("`student_subject_enrollments` աղյուսակը ինչ է ասում", [
        "Ուսանողը կապված է ոչ թե ընդհանրապես առարկայի, այլ կոնկրետ offering-ի հետ",
        "Եվ այդ offering-ի ներսում նա ունի կոնկրետ lab group",
      ], { fill: "#edf5ff", dot: COLORS.blue, bulletSize: 15 }),
      card("Ինչու սա կարևոր է", [
        "Հենց այս աղյուսակն է հետո որոշում, թե ուսանողը ինչ լաբորատորներ է տեսնելու",
        "Եվ ում արդյունքներն են թույլատրելի գրանցել տվյալ offering-ի մեջ",
      ], { fill: "#f8fbff", dot: COLORS.green, bulletSize: 15 }),
    ]),
    card("Diagram placeholder", ["put students - student_subject_enrollments - subject_group_offerings - lab_groups"], { fill: COLORS.white, dot: COLORS.amber }),
  ]);
}

function slide12Body() {
  return grid({ columns: [fixed(470), fr(1)], columnGap: 18, width: "fill" }, [
    column({ gap: 14 }, [
      fakeTable(
        ["`lab_assignments` դաշտ", "Բացատրություն"],
        [
          ["subject_group_offering_id", "Որ offering-ի լաբորատորն է"],
          ["lab_number", "Աշխատանքի հերթական համարը"],
          ["max_grade", "Առավելագույն գնահատականը"],
        ],
        [fixed(190), fr(1)],
      ),
    ]),
    column({ gap: 16 }, [
      card("Աղյուսակի բիզնես դերը", [
        "Լաբորատոր աշխատանքը պահվում է որպես առանձին ուսումնական օբյեկտ",
        "Այն պատկանում է տվյալ առարկայի offering-ին",
        "Այսպիսով արդյունքները հետո կարելի է պահել աշխատանքի մակարդակով, ոչ թե միայն առարկայի ընդհանուր մակարդակով",
      ], { fill: "#f8fbff", dot: COLORS.blue, bulletSize: 15 }),
      card("Screenshot placeholder", ["Տեղադրել `lab_assignments` table screenshot"], { fill: COLORS.white, dot: COLORS.amber }),
    ]),
  ]);
}

function slide13Body() {
  return grid({ columns: [fixed(470), fr(1)], columnGap: 18, width: "fill" }, [
    column({ gap: 14 }, [
      fakeTable(
        ["`student_lab_results` դաշտ", "Բացատրություն"],
        [
          ["lab_assignment_id", "Որ լաբորատորի արդյունքն է"],
          ["student_subject_enrollment_id", "Որ ուսանողի offering+lab group կապի արդյունքն է"],
          ["attendance", "Ներկա էր, բացակա էր և այլն"],
          ["grade", "Ստացված գնահատականը"],
        ],
        [fixed(200), fr(1)],
      ),
    ]),
    column({ gap: 16 }, [
      card("Աղյուսակի իմաստը", [
        "Սա մոդելի վերջնական ուսումնական փաստն է",
        "Այստեղ արդեն մեկ ուսանողի մեկ լաբորատոր աշխատանքի կատարողականն է պահվում",
      ], { fill: "#f8fbff", dot: COLORS.blue, bulletSize: 15 }),
      card("Ինչու է կապվում enrollment-ի հետ", [
        "Որպեսզի արդյունքը կապված լինի ճիշտ offering-ի և ճիշտ lab group-ի ուսանողի հետ",
      ], { fill: "#edf5ff", dot: COLORS.green }),
      card("Diagram placeholder", ["put student_subject_enrollments - student_lab_results - lab_assignments"], { fill: COLORS.white, dot: COLORS.amber }),
    ]),
  ]);
}

function slide14Body() {
  return column({ gap: 18, width: "fill" }, [
    card("Օրինակ սցենար", [
      "Academic group 319-ը բաժանված է 319-1 և 319-2 lab group-ների",
      "Նույն `subject_group_offering`-ի համար 319-1-ը կարող է վարել մեկ դասախոս, իսկ 319-2-ը՝ մեկ այլ դասախոս",
      "Այս տարբերությունը պահվում է `teacher_subject_assignments` աղյուսակում",
    ], { fill: "#edf5ff", dot: COLORS.blue, bulletSize: 16 }),
    grid({ columns: [fr(1), fr(1)], columnGap: 16, width: "fill" }, [
      card("Business meaning", [
        "Մոդելը նկարագրում է իրական լաբորատոր բաժանումը",
        "Չի ստիպում ամբողջ academic group-ին ունենալ միայն մեկ դասախոս",
      ], { fill: "#f8fbff", dot: COLORS.green }),
      card("Diagram placeholder", [
        "put academic_groups - lab_groups",
        "put subject_group_offerings - teacher_subject_assignments - lab_groups",
      ], { fill: COLORS.white, dot: COLORS.amber }),
    ]),
  ]);
}

function slide15Body() {
  return column({ gap: 18, width: "fill" }, [
    card("Ուսանողի տեսանկյունից", [
      "Ուսանողը կարող է պատկանել academic group 319-ին",
      "Բայց տվյալ առարկայի համար նրա իրական աշխատանքային տեղը օրինակ 319-2 lab group-ն է",
      "Հենց այդ պատճառով արդյունքներն ու լաբորատորները պետք է կապվեն enrollment-ի միջոցով",
    ], { fill: "#edf5ff", dot: COLORS.blue, bulletSize: 16 }),
    grid({ columns: [fr(1), fr(1)], columnGap: 16, width: "fill" }, [
      card("Եթե enrollment-ը առանձին չլիներ", [
        "Համակարգը չէր տարբերակելու նույն խմբի տարբեր ենթախմբերով ուսանողներին",
        "Լաբորատոր տեսանելիությունն ու արդյունքները կխառնվեին",
      ], { fill: "#fffaf3", dot: COLORS.amber }),
      card("Diagram placeholder", ["put students - student_subject_enrollments - lab_groups"], { fill: COLORS.white, dot: COLORS.green }),
    ]),
  ]);
}

function slide16Body() {
  return column({ gap: 18, width: "fill" }, [
    card("Ինչու է առարկան բաժանված երկու մակարդակի", [
      "`subjects` աղյուսակը պահում է առարկան որպես ընդհանուր կատալոգ",
      "`subject_group_offerings` աղյուսակը պահում է նույն առարկայի կոնկրետ անցկացումը",
      "Սա թույլ է տալիս նույն առարկան վարել տարբեր խմբերի, տարբեր տարիների և տարբեր կիսամյակների համար",
    ], { fill: "#edf5ff", dot: COLORS.blue, bulletSize: 16 }),
    grid({ columns: [fr(1), fr(1)], columnGap: 16, width: "fill" }, [
      card("Օրինակ", [
        "`Databases` առարկան կարող է լինել 319 խմբի համար Fall-ում",
        "Եվ նույն `Databases`-ը կարող է նոր offering ունենալ 419 խմբի համար Spring-ում",
      ], { fill: "#f8fbff", dot: COLORS.green, bulletSize: 15 }),
      card("Diagram placeholder", ["put subjects - subject_group_offerings"], { fill: COLORS.white, dot: COLORS.amber }),
    ]),
  ]);
}

function slide17Body() {
  return column({ gap: 18, width: "fill" }, [
    grid({ columns: [fr(1), fr(1), fr(1)], columnGap: 16, width: "fill" }, [
      card("Catalog level", ["subjects"], { fill: "#f8fbff", dot: COLORS.blue }),
      card("Teaching level", ["subject_group_offerings", "teacher_subject_assignments"], { fill: "#f8fbff", dot: COLORS.green }),
      card("Student/result level", ["student_subject_enrollments", "lab_assignments", "student_lab_results"], { fill: "#f8fbff", dot: COLORS.blue2 }),
    ]),
    card("Ինչու են այս մակարդակները տարանջատված", [
      "Որովհետև «առարկա կա»-ն, «առարկան անցկացվում է»-ն և «ուսանողը կատարեց լաբորատորը»-ն նույն բիզնես փաստը չեն",
      "Յուրաքանչյուր մակարդակ պահվում է իր առանձին աղյուսակում, որպեսզի մոդելը մաքուր և ճշգրիտ լինի",
    ], { fill: "#edf5ff", dot: COLORS.blue, bulletSize: 16 }),
  ]);
}

function slide18Body() {
  return grid({ columns: [fr(1), fr(1)], columnGap: 18, width: "fill" }, [
    card("Առաջարկվող screenshot-ներ", [
      "put user_accounts - admins/teachers/students",
      "put academic_units - specializations - academic_groups - lab_groups",
      "put subjects - subject_group_offerings",
      "put teacher_subject_assignments - lab_groups",
      "put student_subject_enrollments - student_lab_results - lab_assignments",
    ], { fill: "#edf5ff", dot: COLORS.blue, bulletSize: 15 }),
    card("Ինչի համար են պետք", [
      "Որպեսզի դու ներկայացման մեջ ցույց տաս հենց իրական schema-ն",
      "Եվ բանավոր բացատրես ոչ թե տեխնիկական constraints-ը, այլ տվյալ կապի բիզնես իմաստը",
    ], { fill: "#f8fbff", dot: COLORS.green, bulletSize: 15 }),
  ]);
}

function slide19Body() {
  return grid({ columns: [fr(1), fr(1)], columnGap: 16, width: "fill" }, [
    card("Հիմնական կանոն 1", ["Յուրաքանչյուր մարդ նախ ունի հաշիվ, հետո միայն դառնում է ադմին, դասախոս կամ ուսանող"], { fill: "#f8fbff", dot: COLORS.blue }),
    card("Հիմնական կանոն 2", ["Academic group-ը կարող է բաժանվել մի քանի lab group-ների"], { fill: "#f8fbff", dot: COLORS.green }),
    card("Հիմնական կանոն 3", ["Նույն offering-ի տարբեր lab group-ները կարող են ունենալ տարբեր դասախոսներ"], { fill: "#f8fbff", dot: COLORS.blue2 }),
    card("Հիմնական կանոն 4", ["Ուսանողի ճիշտ լաբորատորներն ու արդյունքները որոշվում են իր enrollment-ով"], { fill: "#f8fbff", dot: COLORS.blue3 }),
    card("Հիմնական կանոն 5", ["Առարկան որպես կատալոգային միավոր տարբեր է նրա կոնկրետ կիսամյակային անցկացման փաստից"], { fill: "#fffaf3", dot: COLORS.amber }),
    card("Հիմնական կանոն 6", ["Գնահատականը պահվում է կոնկրետ լաբորատոր աշխատանքի մակարդակով"], { fill: "#fff8f8", dot: COLORS.red }),
  ]);
}

function slide20Body() {
  return panel(
    {
      width: "fill",
      height: "fill",
      fill: paint("linear(180deg, #f7fbff 0%, #e6f0fb 100%)"),
      borderRadius: 24,
      padding: 34,
    },
    column({ gap: 20, justify: "center", height: "fill" }, [
      accentBar(180),
      text("Շնորհակալություն ուշադրության համար", {
        width: "fill",
        style: style(34, 700, COLORS.ink, "align: center; leading: 1.12"),
      }),
      text("Հարցեր տվյալների բազայի կառուցվածքի և բիզնես տրամաբանության շուրջ", {
        width: "fill",
        style: style(18, 400, COLORS.inkSoft, "align: center"),
      }),
      grid({ columns: [fr(1), fr(1), fr(1)], columnGap: 12, width: "fill" }, [
        badge("Structure"),
        badge("Business Logic", COLORS.white, COLORS.blue2),
        badge("Lab Workflow", COLORS.white, COLORS.green),
      ]),
    ]),
  );
}

const BUILDERS = {
  1: slide01Body,
  2: slide02Body,
  3: slide03Body,
  4: slide04Body,
  5: slide05Body,
  6: slide06Body,
  7: slide07Body,
  8: slide08Body,
  9: slide09Body,
  10: slide10Body,
  11: slide11Body,
  12: slide12Body,
  13: slide13Body,
  14: slide14Body,
  15: slide15Body,
  16: slide16Body,
  17: slide17Body,
  18: slide18Body,
  19: slide19Body,
  20: slide20Body,
};

export async function renderSlideByNumber(presentation, number) {
  const spec = SPECS[number - 1];
  const builder = BUILDERS[number];
  if (!spec || !builder) {
    throw new Error(`Missing slide definition for slide ${number}.`);
  }

  const slide = presentation.slides.add();
  composeSlide(slide, stage(spec, number, builder()));

  if (slide.speakerNotes) {
    slide.speakerNotes.setVisible(true);
    slide.speakerNotes.setText(spec.notes);
  }

  return slide;
}
