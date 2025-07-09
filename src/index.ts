import { prompt } from './openaiClient'
import { createTranslator } from './translate'
import { LlmConfiguration } from './modelConfiguration'
import { Prettify } from './utils'
import { TranslationsReader, Translations } from './translationsReader'

export const t = (key: string) => {
  return key;
}

export type Settings = Prettify<{ default: string, supported: string[] } & LlmConfiguration>

export const load = async (settings: Settings) => {
  const translationsReader = new TranslationsReader(process.cwd(), settings?.supported)
  const translations: Record<string, Translations> = translationsReader.readAllTranslations()

  const defaultTranslations = translations[settings.default]
  const defaultKeys = Object.keys(defaultTranslations)

  for (const language of settings.supported.filter(language => language !== settings.default)) {
    const missingTranslations = defaultKeys.filter(key => !translations[language][key])
    if(!missingTranslations.length) continue

    var translate = createTranslator(settings.default, language, (text) => prompt(text, settings.openai.model, settings.openai.apiKey))

    for (const key of missingTranslations) {
      const translation = await translate(defaultTranslations[key])
      translations[language][key] = translation
    }

    translationsReader.writeLanguageFile(language, translations[language])
  }
}

export const setLanguage = (language: string) => {}

export default {
  t,
  load,
  setLanguage
}