const DEFAULT_LANGUAGE = "en";
const SUPPORTED_LANGUAGES = new Set(["en", "ta", "hi", "ml"]);
const translationCache = new Map();

const DICTIONARY = {
  gender: {
    male: { ta: "ஆண்", hi: "पुरुष", ml: "പുരുഷൻ" },
    female: { ta: "பெண்", hi: "महिला", ml: "സ്ത്രീ" },
    other: { ta: "மற்றவை", hi: "अन्य", ml: "മറ്റ്" },
  },
  department: {
    cardiology: { ta: "இதய நோய் பிரிவு", hi: "हृदय रोग विभाग", ml: "ഹൃദയ വിഭാഗം" },
    orthopedics: { ta: "எலும்பியல்", hi: "हड्डी रोग विभाग", ml: "ഓർത്തോപീഡിക്സ്" },
    neurology: { ta: "நரம்பியல்", hi: "तंत्रिका विभाग", ml: "ന്യൂറോളജി" },
    gynecology: { ta: "மகப்பேறு பிரிவு", hi: "स्त्री रोग विभाग", ml: "ഗൈനക്കോളജി" },
    ent: { ta: "காது மூக்கு தொண்டை", hi: "कान नाक गला विभाग", ml: "കാത് മൂക്ക് തൊണ്ട" },
    pediatrics: { ta: "குழந்தைகள் பிரிவு", hi: "बाल रोग विभाग", ml: "ശിശു വിഭാഗം" },
    dermatology: { ta: "தோல் பிரிவு", hi: "त्वचा विभाग", ml: "ചർമ്മ വിഭാഗം" },
    ophthalmology: { ta: "கண் பிரிவு", hi: "नेत्र विभाग", ml: "നെത്ര വിഭാഗം" },
    generalmedicine: { ta: "பொது மருத்துவம்", hi: "सामान्य चिकित्सा", ml: "ജനറൽ മെഡിസിൻ" },
    general_medicine: { ta: "பொது மருத்துவம்", hi: "सामान्य चिकित्सा", ml: "ജനറൽ മെഡിസിൻ" },
    oncology: { ta: "புற்றுநோய் பிரிவு", hi: "कैंसर विभाग", ml: "ഓങ്കോളജി" },
    radiology: { ta: "கதிரியக்கம்", hi: "रेडियोलॉजी", ml: "റേഡിയോളജി" },
    urology: { ta: "மூத்திரவியல்", hi: "मूत्र रोग विभाग", ml: "യൂറോളജി" },
    pathology: { ta: "நோயியல்", hi: "पैथोलॉजी", ml: "പാത്തോളജി" },
    surgery: { ta: "அறுவை சிகிச்சை", hi: "शल्य चिकित्सा", ml: "ശസ്ത്രക്രിയ" },
  },
};

function normalizeLanguage(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return SUPPORTED_LANGUAGES.has(normalized) ? normalized : DEFAULT_LANGUAGE;
}

function getRequestLanguage(req) {
  return normalizeLanguage(req?.headers?.["x-language"] || req?.headers?.lang || req?.query?.lang);
}

function normalizeLookupKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getManualTranslation(translations, language) {
  if (!isPlainObject(translations)) return null;
  const directValue = translations[language];
  if (typeof directValue === "string" && directValue.trim()) {
    return directValue.trim();
  }
  const englishValue = translations.en;
  if (typeof englishValue === "string" && englishValue.trim()) {
    return englishValue.trim();
  }
  return null;
}

function getDictionaryTranslation(text, language, category) {
  if (language === DEFAULT_LANGUAGE || !category) return null;
  const categoryMap = DICTIONARY[category];
  if (!categoryMap) return null;
  const translated = categoryMap[normalizeLookupKey(text)]?.[language];
  return typeof translated === "string" && translated.trim() ? translated.trim() : null;
}

async function translateWithLibreTranslate(text, language) {
  const baseUrl = String(process.env.LIBRETRANSLATE_URL || "").trim().replace(/\/+$/, "");
  if (!baseUrl || language === DEFAULT_LANGUAGE) {
    return null;
  }

  const cacheKey = `${language}:${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  try {
    const response = await fetch(`${baseUrl}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: "en",
        target: language,
        format: "text",
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const translatedText =
      typeof data?.translatedText === "string" && data.translatedText.trim()
        ? data.translatedText.trim()
        : null;

    if (translatedText) {
      translationCache.set(cacheKey, translatedText);
    }

    return translatedText;
  } catch {
    return null;
  }
}

async function getLocalizedDisplayValue(value, language, options = {}) {
  const normalizedLanguage = normalizeLanguage(language);
  const rawValue = typeof value === "string" ? value.trim() : String(value || "").trim();

  if (!rawValue) return "";
  if (normalizedLanguage === DEFAULT_LANGUAGE) return rawValue;

  const manualTranslation = getManualTranslation(options.translations, normalizedLanguage);
  if (manualTranslation) return manualTranslation;

  const dictionaryTranslation = getDictionaryTranslation(rawValue, normalizedLanguage, options.category);
  if (dictionaryTranslation) return dictionaryTranslation;

  if (options.disableRuntimeTranslation) {
    return rawValue;
  }

  const libreTranslation = await translateWithLibreTranslate(rawValue, normalizedLanguage);
  return libreTranslation || rawValue;
}

async function getLocalizedDisplayArray(values, language, options = {}) {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }

  const localizedValues = await Promise.all(
    values.map((value) =>
      getLocalizedDisplayValue(value, language, {
        ...options,
        translations: isPlainObject(options.translations) ? options.translations[String(value)] : null,
      })
    )
  );

  return localizedValues;
}

module.exports = {
  DEFAULT_LANGUAGE,
  getLocalizedDisplayArray,
  getLocalizedDisplayValue,
  getRequestLanguage,
  normalizeLanguage,
};
