from pathlib import Path


SRC = Path("/Users/lin/Desktop/LabCheck/report_current.rtf")
DST = Path("/Users/lin/Desktop/LabCheck/report_current_updated.rtf")


def enc(text: str) -> str:
    parts = ["\\uc0"]
    for ch in text:
        code = ord(ch)
        if ch == "\\":
            parts.append("\\\\")
        elif ch == "{":
            parts.append("\\{")
        elif ch == "}":
            parts.append("\\}")
        elif 32 <= code <= 126:
            parts.append(ch)
        elif ch == "\n":
            parts.append("\\\n")
        else:
            parts.append(f"\\u{code} ")
    return "".join(parts)


TABLE_HEADER = (
    "\\itap1\\trowd \\taflags1 \\trgaph108\\trleft-108 \\trbrdrt\\brdrnil \\trbrdrl\\brdrnil \\trbrdrr\\brdrnil \n"
    "\\clvertalt \\clshdrawnil \\clminw2513 \\clbrdrt\\brdrs\\brdrw20\\brdrcf5 \\clbrdrl\\brdrs\\brdrw20\\brdrcf5 \\clbrdrb\\brdrs\\brdrw20\\brdrcf5 \\clbrdrr\\brdrs\\brdrw20\\brdrcf5 \\clpadl100 \\clpadr100 \\gaph\\cellx2880\n"
    "\\clvertalt \\clshdrawnil \\clminw2552 \\clbrdrt\\brdrs\\brdrw20\\brdrcf5 \\clbrdrl\\brdrs\\brdrw20\\brdrcf5 \\clbrdrb\\brdrs\\brdrw20\\brdrcf5 \\clbrdrr\\brdrs\\brdrw20\\brdrcf5 \\clpadl100 \\clpadr100 \\gaph\\cellx5760\n"
    "\\clvertalt \\clshdrawnil \\clminw4625 \\clbrdrt\\brdrs\\brdrw20\\brdrcf5 \\clbrdrl\\brdrs\\brdrw20\\brdrcf5 \\clbrdrb\\brdrs\\brdrw20\\brdrcf5 \\clbrdrr\\brdrs\\brdrw20\\brdrcf5 \\clpadl100 \\clpadr100 \\gaph\\cellx8640\n"
)


ROW_PREFIX = (
    "\\pard\\intbl\\itap1\\pardeftab720\\sl340\\pardirnatural\\qj\\partightenfactor0\n\n"
)


def make_row(col1: str, col2: str, col3: str, last: bool = False) -> str:
    suffix = "\\lastrow\\row" if last else "\\row"
    return (
        TABLE_HEADER
        + ROW_PREFIX
        + f"\\fs22 \\cf4 {enc(col1)}\n\\fs24 \\cf0 \\cell \n"
        + ROW_PREFIX
        + f"\\fs22 \\cf4 {enc(col2)}\n\\fs24 \\cf0 \\cell \n"
        + ROW_PREFIX
        + f"\\fs22 \\cf4 {enc(col3)}\n\\fs24 \\cf0 \\cell {suffix}\n"
    )


def make_table(rows):
    header = make_row("Դաշտ", "Տեսակ", "Նկարագրություն")
    body = []
    for idx, row in enumerate(rows):
        body.append(make_row(row[0], row[1], row[2], last=idx == len(rows) - 1))
    return header + "".join(body)


def make_section(num: int, title: str, description: str, rows) -> str:
    return (
        "\\pard\\pardeftab720\\sl460\\sa60\\pardirnatural\\qc\\partightenfactor0\n\n"
        + f"\\f0\\b\\fs24 \\cf4 {num}. {title}\n"
        + "\\f2\\b0 \\\n"
        + "\\pard\\pardeftab720\\fi720\\sl460\\sa80\\pardirnatural\\qj\\partightenfactor0\n"
        + f"\\cf4 {enc(description)}\\\n\n"
        + make_table(rows)
        + "\\pard\\pardeftab720\\sl460\\sa120\\pardirnatural\\qj\\partightenfactor0\n\n"
        + "\\fs22 \\cf4 \\\n"
    )


rtf = SRC.read_text()

new_bullet = (
    enc(
        "ուսանողների և դասախոսների համար առանձին գրանցման հոսքերի կազմակերպում՝ ներառյալ էլեկտրոնային հասցեի հաստատումը և դասախոսի գրանցման հայտի հաստատման փուլը"
    )
    + ",\\\n"
)

bullet_anchor = "polytechnic.am"
idx = rtf.index(bullet_anchor)
line_end = rtf.index(",\\\n", idx) + 3
rtf = rtf[:line_end] + new_bullet + rtf[line_end:]

accounts_section = make_section(
    14,
    "Accounts",
    "Accounts աղյուսակը նախատեսված է համակարգի նույնականացման տվյալների պահպանման համար։ Այստեղ պահվում են օգտատիրոջ էլեկտրոնային հասցեն, գաղտնաբառի հեշը, դերը և հաշվի կարգավիճակը։ Այս մոտեցումը թույլ է տալիս գրանցման և մուտքի գործընթացը կենտրոնացնել մեկ աղյուսակում։",
    [
        ("AccountID", "PK", "Հաշվի եզակի նույնացուցիչ"),
        ("Email", "VARCHAR(255)", "Էլեկտրոնային հասցե"),
        ("PasswordHash", "VARCHAR(255)", "Կոդավորված գաղտնաբառ"),
        ("Role", "ENUM('student','teacher','admin')", "Օգտատիրոջ դերը"),
        (
            "Status",
            "ENUM('pending_verification','pending_approval','active','disabled')",
            "Հաշվի կարգավիճակը",
        ),
        ("EmailVerifiedAt", "DATETIME", "Էլեկտրոնային հասցեի հաստատման ժամանակը"),
        ("CreatedAt", "DATETIME", "Գրառման ստեղծման ժամանակը"),
    ],
)

tokens_section = make_section(
    15,
    "EmailVerificationTokens",
    "EmailVerificationTokens աղյուսակը պահպանում է այն token-ները, որոնք օգտագործվում են օգտատիրոջ էլեկտրոնային հասցեի հաստատման համար։ Սա անհրաժեշտ է registration-ի ընթացքում հաշվի ակտիվացումը վերահսկելու համար։",
    [
        ("VerificationTokenID", "PK", "Token-ի եզակի նույնացուցիչ"),
        ("AccountID", "FK", "Կապ Accounts աղյուսակի հետ"),
        ("TokenHash", "VARCHAR(255)", "Կոդավորված հաստատման token"),
        ("ExpiresAt", "DATETIME", "Token-ի վավերականության վերջնաժամկետը"),
        ("UsedAt", "DATETIME", "Token-ի օգտագործման ժամանակը"),
        ("CreatedAt", "DATETIME", "Գրառման ստեղծման ժամանակը"),
    ],
)

requests_section = make_section(
    16,
    "TeacherRegistrationRequests",
    "TeacherRegistrationRequests աղյուսակը նախատեսված է դասախոսների գրանցման հայտերի պահպանման համար։ Քանի որ teacher-ի գրանցումը պետք է վերահսկելի լինի, հայտը նախ պահվում է այս աղյուսակում և միայն հաստատումից հետո է ստեղծվում իրական teacher հաշիվը։",
    [
        ("RequestID", "PK", "Հայտի եզակի նույնացուցիչ"),
        ("FirstName", "VARCHAR(100)", "Դիմողի անունը"),
        ("LastName", "VARCHAR(100)", "Դիմողի ազգանունը"),
        ("Email", "VARCHAR(255)", "Էլեկտրոնային հասցե"),
        ("PasswordHash", "VARCHAR(255)", "Կոդավորված գաղտնաբառ"),
        ("Status", "ENUM('pending','approved','rejected')", "Հայտի կարգավիճակը"),
        ("SubmittedAt", "DATETIME", "Հայտի ուղարկման ժամանակը"),
        ("ReviewedAt", "DATETIME", "Հայտի դիտարկման ժամանակը"),
    ],
)

insert_block = accounts_section + tokens_section + requests_section

relations_heading = enc("Աղյուսակների միջև կապերը") + "\n\\f2\\b0 \\\n"
rel_idx = rtf.index(relations_heading)
rtf = rtf[:rel_idx] + insert_block + rtf[rel_idx:]

DST.write_text(rtf)
