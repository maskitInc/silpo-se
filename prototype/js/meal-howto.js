/**
 * UA cooking steps for day-plate «інгредієнти» mode (V1 collapse «Як готувати»).
 * Keys = normalizeMealTitleStem() — longest stem wins (same pattern as exercise-howto).
 */

/** @param {string} title */
export function normalizeMealTitleStem(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[«»"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @type {Array<[string, string[]]>}
 */
const STEM_RECIPE_RAW = [
  [
    "вівсянка на молоці",
    [
      "Залити вівсянку молоком, довести до кипіння.",
      "Тушити 5–7 хв, помішуючи.",
      "Подати теплою.",
    ],
  ],
  [
    "курка з гречкою й овочами",
    [
      "Відварити гречку до готовності.",
      "Обсмажити курку з овочами на сковороді.",
      "Змішати, приправити, подати.",
    ],
  ],
  [
    "курка з гречкою",
    [
      "Відварити гречку до готовності.",
      "Обсмажити або відварити курку.",
      "Подати разом, приправити за смаком.",
    ],
  ],
  [
    "гречка з куркою",
    [
      "Відварити гречку до готовності.",
      "Обсмажити або відварити курку.",
      "Подати разом, приправити за смаком.",
    ],
  ],
  [
    "гречка з овочами й куркою",
    [
      "Відварити гречку до готовності.",
      "Підготувати курку з овочами на сковороді.",
      "Змішати та подати.",
    ],
  ],
  [
    "курка з овочами",
    [
      "Обсмажити курку до золотистої скоринки.",
      "Додати овочі, тушити 8–10 хв.",
      "Приправити, подати.",
    ],
  ],
  [
    "курка й овочі",
    [
      "Обсмажити курку до золотистої скоринки.",
      "Додати овочі, тушити 8–10 хв.",
      "Приправити, подати.",
    ],
  ],
  [
    "рис з овочами",
    [
      "Рис промити, відварити до готовності.",
      "Овочі обсмажити на сковороді 6–8 хв.",
      "Змішати, приправити, подати.",
    ],
  ],
  [
    "рис і овочі",
    [
      "Рис промити, відварити до готовності.",
      "Овочі обсмажити на сковороді 6–8 хв.",
      "Змішати, приправити, подати.",
    ],
  ],
  [
    "овочі з рисом",
    [
      "Рис промити, відварити до готовності.",
      "Овочі обсмажити на сковороді 6–8 хв.",
      "Змішати та подати.",
    ],
  ],
  [
    "риба з салатом",
    [
      "Рибу посолити, обсмажити або запекти до готовності.",
      "Салат промити, нарізати.",
      "Подати рибу зі свіжим салатом.",
    ],
  ],
  [
    "салат з рибою",
    [
      "Рибу посолити, обсмажити або запекти до готовності.",
      "Салат промити, нарізати.",
      "Подати рибу зі свіжим салатом.",
    ],
  ],
  [
    "яєчня з тостом",
    [
      "Розігріти сковороду з маслом.",
      "Розбити яйця, посолити, смажити до готовності.",
      "Подати з підсмаженим тостом.",
    ],
  ],
  [
    "омлет на маслі",
    [
      "Розбити яйця, злегка збити.",
      "Розігріти сковороду з маслом, вилити суміш.",
      "Смажити на середньому вогні, згорнути або перевернути.",
    ],
  ],
  [
    "овочі на пару",
    [
      "Овочі нарізати однаковими шматочками.",
      "Готувати на пару 8–12 хв до мʼякості.",
      "Приправити, подати.",
    ],
  ],
  [
    "овочі з цибулею",
    [
      "Овочі та цибулю нарізати однаковими шматочками.",
      "Готувати на пару або тушити 8–12 хв до мʼякості.",
      "Приправити, подати.",
    ],
  ],
  [
    "пара овочів",
    [
      "Овочі нарізати однаковими шматочками.",
      "Готувати на пару 8–12 хв до мʼякості.",
      "Приправити, подати.",
    ],
  ],
  [
    "вівсянка",
    [
      "Залити вівсянку молоком або водою, довести до кипіння.",
      "Тушити 5–7 хв, помішуючи.",
      "Подати теплою.",
    ],
  ],
  [
    "каша вівсяна",
    [
      "Залити вівсянку молоком, довести до кипіння.",
      "Тушити 5–7 хв, помішуючи.",
      "Подати теплою.",
    ],
  ],
  [
    "яєчня",
    [
      "Розігріти сковороду з маслом.",
      "Розбити яйця, посолити.",
      "Смажити до бажаної готовності.",
    ],
  ],
  [
    "омлет",
    [
      "Розбити яйця, злегка збити.",
      "Розігріти сковороду з маслом, вилити суміш.",
      "Смажити до готовності.",
    ],
  ],
  [
    "скрамбл",
    [
      "Розбити яйця, злегка збити.",
      "На розігрітій сковороді з маслом помішувати до кремової текстури.",
      "Зняти з вогню, подати одразу.",
    ],
  ],
  [
    "риба",
    [
      "Рибу посолити, обсмажити або запекти до готовності.",
      "Додати лимон або зелень за бажанням.",
      "Подати теплою.",
    ],
  ],
];

const STEM_RECIPE = [...STEM_RECIPE_RAW].sort((a, b) => b[0].length - a[0].length);

/** @type {Array<[string, string]>} */
const STEM_SERVE_RAW = [
  ["йогурт з ягодами", "Подати охолодженим · без приготування"],
  ["йогурт на вечір", "Подати охолодженим · без приготування"],
  ["йогурт на ранок", "Подати охолодженим · без приготування"],
  ["йогурт", "Подати охолодженим · без приготування"],
  ["зелений салат", "Промити, приправити · без приготування"],
  ["легкий салат", "Промити, приправити · без приготування"],
  ["салат зі зеленню", "Промити, приправити · без приготування"],
];

const STEM_SERVE = [...STEM_SERVE_RAW].sort((a, b) => b[0].length - a[0].length);

const DEFAULT_SERVE_NOTE = "Подати без приготування";

/**
 * @param {string} title
 * @param {{ recipe?: { steps?: string[] }, staples?: string[] } | null} [slotEntry]
 * @returns {string[] | null}
 */
export function resolveMealRecipeSteps(title, slotEntry = null) {
  const kbSteps = slotEntry?.recipe?.steps;
  if (Array.isArray(kbSteps) && kbSteps.length) {
    return kbSteps.map((s) => String(s).trim()).filter(Boolean);
  }
  const stem = normalizeMealTitleStem(title);
  if (!stem) return null;
  for (const [key, steps] of STEM_RECIPE) {
    if (stem === key || stem.includes(key)) {
      return steps;
    }
  }
  return null;
}

/**
 * @param {string} title
 * @param {{ serveNote?: string } | null} [slotEntry]
 * @returns {string | null}
 */
export function resolveMealServeNote(title, slotEntry = null) {
  const kbNote = slotEntry?.serveNote;
  if (typeof kbNote === "string" && kbNote.trim()) return kbNote.trim();
  const stem = normalizeMealTitleStem(title);
  if (!stem) return DEFAULT_SERVE_NOTE;
  for (const [key, note] of STEM_SERVE) {
    if (stem === key || stem.includes(key)) return note;
  }
  if (stem.includes("йогурт")) return "Подати охолодженим · без приготування";
  if (stem.includes("салат")) return "Промити, приправити · без приготування";
  return DEFAULT_SERVE_NOTE;
}

/**
 * @param {string} note
 * @param {(s: string) => string} esc
 * @returns {string}
 */
export function mealServeNoteHtml(note, esc) {
  const line = String(note || "").trim();
  if (!line || typeof esc !== "function") return "";
  return `<p class="meal-recipe-ready-note">${esc(line)}</p>`;
}

/**
 * @param {string[]} steps
 * @param {(s: string) => string} esc
 * @returns {string}
 */
export function mealRecipeHowtoHtml(steps, esc) {
  if (!Array.isArray(steps) || !steps.length || typeof esc !== "function") return "";
  const items = steps.map((s) => `<li>${esc(String(s))}</li>`).join("");
  return `<details class="meal-recipe-howto">
        <summary class="meal-recipe-howto__toggle">Як готувати</summary>
        <div class="meal-recipe-howto__body">
          <ol class="meal-recipe-steps">${items}</ol>
        </div>
      </details>`;
}

/** @returns {string[]} */
export function listMealRecipeStems() {
  return STEM_RECIPE.map(([k]) => k);
}
