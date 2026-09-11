# Шортс ~90 с — сценарій СільпоSE

SSoT для запису: **silent master** + окрема доріжка **машинної озвучки** (замінна на свій голос).  
База: [CAPABILITIES.md](../CAPABILITIES.md), [PITCH.md](../PITCH.md), [17-jury-recording-checklist.md](17-jury-recording-checklist.md).  
Дослідження можливостей: не вигадуємо фічі поза MVP.

| Параметр | Значення |
|----------|----------|
| Довжина master | **90 с** (±2 с) |
| Формат | вертикаль **390×844** (9:16) |
| URL | `https://silpo-se.vercel.app/` або `http://127.0.0.1:8766/#/` |
| Логін на зйомці | **A (реком.):** прелогін до старту · **B:** демо + caption про живий кошик |
| Глибина Express (один блок) | **qty ±** обовʼязково; плюс **або** tip-маячок **або** База+ (не все одразу) |
| Заборона копі | слово «тарілки» — ніколи ([no-tarilky](../.cursor/rules/no-tarilky.mdc)) |
| Не показувати | jury «для журі», raw token, порівняння банків/АТБ, «закінчилось» як факт |

**Теза ролика (1 рядок):** не чат «що на вечерю» — **два ритуали одного дня** (Sport → страви → Express → Погодити → кошик Сільпо).

---

## 1. Два майстри (один монтаж)

| Master | Звук | Навіщо |
|--------|------|--------|
| **M0 Silent** | без VO; UI + burn-in captions + UI sounds optional off | IG autoplay muted; база під будь-який голос |
| **M1 Machine VO** | M0 + окремий аудіофайл VO | швидкий реліз; якість ≈ людська (див. §5) |
| **M2 Human ADR** | M0 + твій голос замість VO | ті самі таймкоди `[TAP]` / паузи |

Правило: **картинка ніколи не залежить від голосу**. Усе важливе читається з UI або caption.

Нарізки з того ж таймлайну:

| Cut | Секунди | Ідея |
|-----|---------|------|
| Full | 0–90 | Instagram / пітч-хвилина |
| Sport hook | 0–48 | «додаток життя» + тренування |
| Express | 48–90 | бюджет + Погодити |
| Punch | 75–90 | лише commit у кошик |

---

## 2. Що за що відповідає (мапа для камери)

| Зона UI | За що відповідає в історії | Показ у 90 с |
|---------|----------------------------|--------------|
| Home brand + whisper | Один бренд, два ритуали | MUST |
| Chip Увійти / демо / підключено | Чесність: fixture vs live | MUST (глянс) |
| Sport pulse / tip | Ритм місяця: сесії · раціон | MUST |
| **Пігнали** → день · **Старт** | Sport = сесія «сьогодні», не постер | MUST |
| Спортивний раціон · Додати в Express | Паливо з програми → список | MUST |
| Express pulse · hot tip | Стеля грошей · що вдарило по бюджету | MUST |
| qty ± | Ти керуєш; кошик ще не пишеться | MUST |
| sku-beacon / База+ | Довіра / повтор списку | NICE (один) |
| **Погодити** · busy veil | Єдиний write у кошик | MUST |
| Toast / silpo.ua | Handoff; оплата в Сільпо | MUST (або caption) |
| Swap / survey / walk map / OTP | Глибина / latency | SKIP у 90 с |

---

## 3. Shot-list (master 90 с)

Колонки: час · екран · палець · що видно · **silent caption** · **VO** (довідково).  
**VO для booth = лише `research/24-shorts-assets/vo-adr-cue.txt` (+ `adr-booth.md`).** Клітинки **VO** нижче — obsolete; не читати в кабінці. Timing bed: `vo-adr-guide-90s.wav`.

Маркери VO: `[TAP]` = пауза 0.3–0.5 с під жест; `[VEIL]` = говорити повільніше / пауза.

### Beat A — Проблема (0:00–0:10)

| | |
|--|--|
| **Екран** | `#/` Home, верх |
| **Палець** | без тапу; легкий scroll 0–1 с OK |
| **Видно** | СільпоSE, whisper «два ритуали · один ритм», chip демо/підключено |
| **Silent** | «Ранок уже в русі» |
| **VO** | → **`vo-adr-cue.txt` `[0:00]`** (не цей рядок) |

### Beat B — Два входи (0:10–0:18)

| | |
|--|--|
| **Екран** | Home rituals |
| **Палець** | вказівник на Sport «Пігнали», потім Express «Замовити» (не клікати Express ще) |
| **Видно** | Sport desc «Сесія сьогодні · страви з полиці»; Express «Список з чеків · долив у кошик» |
| **Silent** | «Sport · Express» |
| **VO** | → cue `[0:10]` |

### Beat C — Sport pulse (0:18–0:28)

| | |
|--|--|
| **Екран** | Home Sport pulse |
| **Палець** | tap tip / phrase **або** короткий pan по spark (один жест) |
| **Видно** | орієнтир / раціон · ккал · легенда без медмови |
| **Silent** | «Ритм минулого місяця» |
| **VO** | → cue `[0:18]` |

### Beat D — День · сесія · страви (0:28–0:42)

| | |
|--|--|
| **Екран** | `#/sport` швидко → `#/day` |
| **Палець** | **Пігнали** → (якщо профіль — skip / вже заповнений) → **Старт** (1–2 с prep OK) → scroll до «Спортивний раціон» |
| **Видно** | плеєр сесії; готові страви / інгредієнти chip; 1–2 страви |
| **Silent** | «Сесія сьогодні» |
| **VO** | → cue `[0:28]` |

### Beat E — Handoff Sport → Express (0:42–0:48)

| | |
|--|--|
| **Екран** | day → `#/shop` |
| **Палець** | **Додати всі (N) в Express** або «Додати в Express» |
| **Видно** | callout «з програми» / handoff |
| **Silent** | «Паливо з програми» |
| **VO** | → cue `[0:42]` |

### Beat F — Express pulse (0:48–0:58)

| | |
|--|--|
| **Екран** | Home Express pulse **або** shop після handoff + back-to-pulse якщо зручніше: краще залишитись у shop і показати wallet, **або** коротко home Express tip |
| **Реком. для одного дубля** | Після handoff одразу shop wallet + checklist; tip з home зняти **окремим insert 0:48–0:53** якщо знімаєш home Express до Sport (див. alt path нижче) |
| **Палець** | tap hot tip mark (якщо на pulse) |
| **Видно** | tip kicker («Дорожче за темп» / дата · SKU · ₴) **або** wallet remain / стеля |
| **Silent** | «Удар по стелі» |
| **VO** | → cue `[0:48]` |

**Alt path (стабільніший для зйомки):**  
0:10–0:18 Home → 0:18–0:28 Express tip на home → 0:28–0:48 Sport day+handoff → 0:48–0:58 shop wallet (без повторного tip). VO той самий сенс; не дублюй tip двічі.

### Beat G — Контроль списку (0:58–0:75)

| | |
|--|--|
| **Екран** | `#/shop` checklist |
| **Палець** | qty **−** або **+** (видима зміна числа) · опційно **один**: beacon toast **або** База+ |
| **Видно** | **f:** стеля ПЕРЕВИЩЕНО → **g:** після qty−/галочок ЗАЛИШИЛОСЬ (під стелею); dock ще не «Додано» |
| **Silent** | «Ти правиш список — під стелею» |
| **VO** | → cue `[0:58]` |

### Beat H — Погодити · кошик (0:75–0:90)

| | |
|--|--|
| **Екран** | shop dock |
| **Палець** | **Погодити N** (жест під blank-tab handoff) |
| **Видно** | busy veil «Додаємо товари в кошик Сільпо…» → toast / «Додати ще» / лінк silpo.ua |
| **Silent** | «Погодити → кошик Сільпо» · end: «Оплата — у Сільпо» |
| **VO** | → cue `[0:75]` |

**Якщо режим B (без логіну):** після тапу Погодити покажи UI/тост або зупинись на кнопці + silent «Після Увійти — долив у твій кошик». Не фейш live cart.

---

## 4. Повний VO-скрипт (машинний / людський — один текст)

**Canonical (читати в кабінці):**  
[`24-shorts-assets/vo-adr-cue.txt`](24-shorts-assets/vo-adr-cue.txt) — без `+`, з `[TAP]`/`[VEIL]`.  
Prep / наголоси: [`vo-script-plain-ua.txt`](24-shorts-assets/vo-script-plain-ua.txt) + [`stress-preview.md`](24-shorts-assets/stress-preview.md).  
Booth → remux **M2**: [`adr-booth.md`](24-shorts-assets/adr-booth.md).

Plan hash: `12060a0f1a7f`. Паузи: `[TAP]=0.28s`, `[VEIL]=0.42s`. Темп ≈ **2.4–2.7 сл/с**.

> **Не читай** §3 VO cells і старі anti-chat блоки як скрипт — авторитет = plain/cue.

**Слова на екран:** silent burn-in = `captions-silent-burnin.srt`; VO captions = `captions-vo.srt` (organic, без «чат»-хука).
---

## 5. Машинна озвучка ≈ людська (як зробити, щоб не соромно міняти на свій голос)

| Правило | Деталь |
|---------|--------|
| Окремий файл | `vo-shorts-90s-ua.wav` / `.mp3` — **не** вшивати в silent master |
| Голос | **Draft free:** `tts-uk` **mykyta** (`SHORTS_VO_ENGINE=ttsuk`). Fallback: StyleTTS2 (rejected for LRA). **Ship:** human ADR → `m2-human-adr-90s.mp4`. |
| SSML / паузи | `[TAP]=0.28s`, `[VEIL]=0.42s` (cue); бренди кирилицею |
| Loudness | −14 LUFS (IG/Reels friendly); без кліпу; **без aecho** |
| Sync | вирівняти VO під M0; якщо жест запізнився — тягни паузу, не прискорюй мову |
| Заміна | **`vo-adr-cue.txt`** у кабінці (не §3 VO cells); маркери ті самі — ADR лягає в ті самі дірки |

Чеклист якості: `listen-card.md` **без відео**.  
Booth: [`24-shorts-assets/adr-booth.md`](24-shorts-assets/adr-booth.md).  
**Stop rule:** після ≤2 free-engine проходів → **human ADR**, не третій TTS.

---

## 6. Prep перед записом (2–3 хв)

1. Hard refresh з актуальним `?v=` з `prototype/index.html`.  
2. Viewport 390×844.  
3. Режим **A:** `/auth/start` + OTP **до** Rec; chip = «підключено».  
4. Профіль Sport і програма вже обрані; день = **сьогодні**.  
   Pulse (Sport + Express) = **минулий місяць**: `?month=prev` (або `sportMonth`/`pulseMonth=YYYY-MM`). Chain stills уже так.
5. Shop dirty OK; 3–5 прийнятих позицій з live SKU.  
6. Не відкривати «для журі».  
7. Не вмикати TTS «Слухати» під час VO.  
8. Репетиція Погодити один раз off-camera (veil + вкладка).  
9. Опційно Express stills: `cd prototype && ./scripts/visual-express-control.sh`.

---

## 7. Acceptance (сценарій готовий, коли)

- [x] Сума бітів ≈ 90 с  
- [x] MUST з §2 покриті  
- [x] Silent captions самодостатні  
- [x] VO з маркерами для заміни голосу  
- [x] Cut map 30/60/90  
- [x] Login A/B і заборони зафіксовані  
- [x] Draft VO + SRT у [24-shorts-assets/](24-shorts-assets/) (`vo-shorts-90s-ua.wav` = 90 с)  
- [x] Draft M0 stills + silent/M1 mp4: `cd prototype && ./scripts/visual-shorts-90s.sh` → `visual-shots/shorts-90s/` (`m0-silent-90s.mp4`, `m1-machine-vo-90s.mp4`)  
- [x] Free neural VO (local StyleTTS2 multi; A/B у `visual-shots/shorts-90s/m1-ab-*.mp4`) у [24-shorts-assets/](24-shorts-assets/)  
- [ ] (реліз) людський ADR або перезйомка з пальцем/VEIL live

---

## 8. Звʼязок з іншими доками

| Док | Роль |
|-----|------|
| [PITCH.md](../PITCH.md) | Каркас пітчу; посилання сюди |
| [17-jury…](17-jury-recording-checklist.md) | Довгий дубль журі 3.5 хв; не плутати з IG |
| [CAPABILITIES.md](../CAPABILITIES.md) | Що вміє продукт |
| [24-shorts-assets/](24-shorts-assets/) | SRT + draft VO + **ADR booth** (`adr-booth.md`, `vo-adr-cue.txt`) |
| `prototype/scripts/vo-tools/` | Voice lab: plan-check, stress, QA, listen-card, ADR, build, A/B |
| `prototype/scripts/shorts-vo-say.sh` | Free neural VO: tts-uk → StyleTTS2 multi → HF Space → edge/say |
| `prototype/scripts/shorts-vo-tts-uk.py` | 90s PLAN + tts-uk Tetiana (F0/energy) |
| `prototype/scripts/shorts-vo-local-styletts2.py` | 90s PLAN + StyleTTS2 multi fallback |
| `prototype/scripts/visual-shorts-90s.sh` | Auto M0 stills + silent burn-in + M1 mux (server :8766) |
| `prototype/visual-shots/chain-shorts-90s.json` | Browse chain для 90 с stills |
| `prototype/visual-shots/chain-jury-express.json` | Авто-жести Express half (не повний 90 с) |

---

*Оновлено: local StyleTTS2 multi (Марина default; A/B Вероніка/Інна у `m1-ab-*.mp4`); human ADR — стеля якості.*
