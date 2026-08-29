/**
 * UA how-to cues for session steps (form orientir — not medical advice).
 * Keys = normalizeExerciseStem() stems (same as exercise-art-map).
 */

import { normalizeExerciseStem } from "./exercise-art-map.js";
import { sessionLabelShortName } from "./session-label.js";

/** Disclaimer shown in UI only — not spoken every listen. */
export const HOWTO_DISCLAIMER_SHORT = "орієнтир форми, не медична порада";

const FALLBACK_TEXT =
  "Робіть рух у комфортній амплітуді, без болю й різких ривків. Дихайте рівно. Якщо сумніваєтесь у техніці — зменшіть навантаження або пропустіть крок.";

/**
 * Stem → cue. Longer stems must win (віджимання з колін > віджимання).
 * @type {Array<[string, string]>}
 */
const STEM_HOWTO_RAW = [
  [
    "віджимання з колін",
    "Станьте на коліна, долоні під плечима. Тіло пряме від колін до голови. Згинайте лікті, груди до підлоги, потім випрямляйте. Не провисайте у попереку.",
  ],
  [
    "мертва комаха",
    "Ляжте на спину, руки вгору, коліна зігнуті над тазом. Повільно витягніть протилежні руку й ногу, потім поверніть. Поперек притиснутий до підлоги.",
  ],
  [
    "кішка-корова",
    "На четвереньках: на видиху округліть спину (кішка), на вдиху мʼяко прогніть і підніміть груди (корова). Рух повільний, шия без ривків.",
  ],
  [
    "нахил до ніг",
    "Стоячи або сидячи, нахиліться до ніг з прямішою спиною, наскільки комфортно. Не тягніть через біль — мʼяке розтягнення задньої поверхні стегон.",
  ],
  [
    "скрутка лежачи",
    "Ляжте на спину, коліна зігнуті. Повільно скрутіть коліна в один бік, плечі лишаються на підлозі. Подихайте й повторіть в інший бік.",
  ],
  [
    "скрутка на стільці",
    "Сидячи рівно, мʼяко поверніть корпус і погляд убік. Таз стабільний. Не форсуйте амплітуду — коротка пауза в кінці повороту.",
  ],
  [
    "зупинка розтягнути литки",
    "Одна нога трохи позаду, пʼята на підлозі. Нахиліть корпус уперед, поки відчуєте розтягнення литки. Тримайте без підстрибування.",
  ],
  [
    "сидячи: підйом коліна",
    "Сидячи на стільці, тримайте спину рівно. Піднімайте одне коліно вгору, опускайте контрольовано. Чергуйте ноги, без розгойдування.",
  ],
  [
    "крок на місці",
    "Крокуйте на місці, піднімаючи коліна зручно високо. Руки допомагають ритму. Тримайте корпус стабільно, дихайте рівно.",
  ],
  [
    "плечі назад",
    "Стоячи або сидячи, мʼяко зведіть лопатки назад і вниз, розкрийте груди. Не піднімайте плечі до вух. Повільний ритм.",
  ],
  [
    "повільна ходьба",
    "Йдіть спокійним рівним кроком. Дихайте через ніс або комфортно ротом. Плечі розслаблені, погляд вперед.",
  ],
  [
    "стійка вершника",
    "Ноги ширше за плечі, носки трохи назовні. Зігніть коліна, таз назад, ніби сідаєте. Груди вперед, пʼяти на підлозі.",
  ],
  [
    "хвиля руками",
    "Руки в сторони або вперед. Робіть спокійні кола плечима / руками. Амплітуда комфортна, без різких ривків.",
  ],
  [
    "перенесення ваги",
    "Стоячи, повільно переносьте вагу з однієї ноги на іншу. Корпус стабільний. Відчуйте стопу, не поспішайте.",
  ],
  [
    "пауза тайцзі",
    "Зупиніться в мʼякій стійці, коліна трохи зігнуті. Дихайте спокійно, плечі вниз. Коротке «зібрання» перед наступним кроком.",
  ],
  [
    "дихання животом",
    "Сядьте або ляжте зручно. На вдиху живіт мʼяко розширюється, на видиху — осідає. Плечі не піднімайте. Рівний спокійний ритм.",
  ],
  [
    "віджимання",
    "Упор лежачи, долоні під плечима. Тіло — пряма лінія. Згинайте лікті, груди до підлоги, потім випрямляйте. Можна з колін, якщо важко.",
  ],
  [
    "присідання",
    "Ноги на ширині плечей. Таз назад, коліна над стопами, груди вперед. Опустіться наскільки зручно, встаньте через пʼяти. Без ривків.",
  ],
  [
    "планка",
    "Оперіться на передпліччя й пальці ніг. Тіло — пряма лінія від голови до пʼят. Живіт підтягнутий, не провисайте в попереку. Дихайте рівно.",
  ],
  [
    "берпі",
    "З положення стоячи — упор лежачи, віджимання за бажанням, стрибок ногами вперед і легкий вистриб угору. Темп рівний, без зриву техніки.",
  ],
  [
    "випади",
    "Крок уперед, обидва коліна ≈ 90°. Переднє коліно над стопою, заднє під собою. Відштовхніться й поверніться. Чергуйте ноги.",
  ],
  [
    "супермен",
    "Ляжте на живіт. Одночасно трохи підніміть руки й ноги від підлоги, стисніть сідниці. Тримайте коротко, опустіть мʼяко. Шия нейтральна.",
  ],
  [
    "дитина",
    "Сядьте на пʼяти, нахиліть корпус уперед, руки вперед або вздовж тіла. Лоб до підлоги якщо зручно. Спокійне дихання, розслабте спину.",
  ],
  [
    "дихання",
    "Зупиніться. Вдих спокійний через ніс, видих довше за вдих. Плечі вниз. Це пауза для відновлення, не силове навантаження.",
  ],
  [
    "ходьба",
    "Рівний крок у комфортному темпі. Руки вільно. Дихайте без затримок. Стежте за поставою — не сутультесь.",
  ],
  [
    "шия повільно",
    "Повільно нахиляйте голову до плеча або повертайте погляд убік. Без ривків і болю. Повертайтесь у центр між рухами.",
  ],
  [
    "плечі",
    "Кругові рухи плечима назад або вперед. Амплітуда комфортна. Тримайте шию вільною, не піднімайте плечі до вух.",
  ],
  [
    "стегна",
    "Мʼякі махи або кола ногою з опорою. Таз стабільний. Рух контрольований — розігрів, не ривок.",
  ],
];

const STEM_HOWTO = [...STEM_HOWTO_RAW].sort((a, b) => b[0].length - a[0].length);

/** @returns {string[]} */
export function listExerciseHowToStems() {
  return STEM_HOWTO.map(([k]) => k);
}

/**
 * @param {string} label
 * @param {{ allowFallback?: boolean }} [opts]
 * @returns {{ stem: string, name: string, text: string, speakText: string, fallback?: boolean } | null}
 */
export function resolveExerciseHowTo(label, opts = {}) {
  const allowFallback = opts.allowFallback !== false;
  const stem = normalizeExerciseStem(label);
  const name = sessionLabelShortName(label) || stem;
  if (!stem) return null;
  for (const [key, text] of STEM_HOWTO) {
    /* Longest keys first — "дихання животом" before "дихання". */
    if (stem === key || stem.startsWith(key)) {
      return { stem: key, name, text, speakText: `${name}. ${text}`, fallback: false };
    }
  }
  if (!allowFallback) return null;
  const text = FALLBACK_TEXT;
  return {
    stem,
    name,
    text,
    speakText: `${name}. ${text}`,
    fallback: true,
  };
}

/**
 * Chrome often returns [] until voiceschanged — warm cache after user gesture / boot.
 * @returns {Promise<SpeechSynthesisVoice[]>}
 */
export function warmSpeechVoices() {
  const synth = globalThis.speechSynthesis;
  if (!synth?.getVoices) return Promise.resolve([]);
  const now = synth.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try {
        synth.removeEventListener?.("voiceschanged", onChange);
      } catch {
        /* ignore */
      }
      resolve(synth.getVoices() || []);
    };
    const onChange = () => finish();
    try {
      synth.addEventListener?.("voiceschanged", onChange);
    } catch {
      /* ignore */
    }
    setTimeout(finish, 400);
  });
}

/**
 * @param {SpeechSynthesisVoice[]} voices
 * @returns {SpeechSynthesisVoice | null}
 */
export function pickHowToVoice(voices) {
  const list = Array.isArray(voices) ? voices : [];
  return (
    list.find((v) => /^uk(-|$)/i.test(v.lang || "")) ||
    list.find((v) => /ukrain/i.test(v.name || "")) ||
    list.find((v) => /^ru(-|$)/i.test(v.lang || "")) ||
    null
  );
}

/**
 * @param {string} text
 * @param {{ lang?: string, rate?: number, onend?: () => void, onerror?: () => void }} [opts]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function speakExerciseHowTo(text, opts = {}) {
  const synth = globalThis.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
    return { ok: false, reason: "no_synth" };
  }
  const line = String(text || "").trim();
  if (!line) return { ok: false, reason: "empty" };
  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(line);
    u.lang = opts.lang || "uk-UA";
    u.rate = typeof opts.rate === "number" ? opts.rate : 0.92;
    const voice = pickHowToVoice(synth.getVoices?.() || []);
    if (voice) {
      u.voice = voice;
      if (voice.lang) u.lang = voice.lang;
    }
    if (opts.onend) u.onend = opts.onend;
    if (opts.onerror) u.onerror = opts.onerror;
    /* Some engines drop first utterance after cancel — micro defer. */
    const kick = () => {
      try {
        synth.speak(u);
      } catch {
        opts.onerror?.();
      }
    };
    if (typeof queueMicrotask === "function") queueMicrotask(kick);
    else setTimeout(kick, 0);
    return { ok: true };
  } catch {
    return { ok: false, reason: "speak_failed" };
  }
}

export function stopExerciseHowToSpeech() {
  try {
    globalThis.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

export function canSpeakExerciseHowTo() {
  return Boolean(globalThis.speechSynthesis && typeof SpeechSynthesisUtterance !== "undefined");
}
