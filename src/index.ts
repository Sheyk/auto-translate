import { LlmConfiguration } from './modelConfiguration'
import { Prettify } from './utils'
import { TranslationsReader, Translations, Language } from './translationsReader'
import { addMissingTranslations } from './translationsParser'
import { prompt } from './openaiClient'

export const t = (key: string) => {
  return key;
}

export type Settings = Prettify<{ default: string, supported: string[] } & LlmConfiguration>

export const load = async (settings: Settings) => {
  const translationsReader = new TranslationsReader(process.cwd(), settings?.supported)

  await addMissingTranslations(settings.default, {
    reader: () => Promise.resolve(translationsReader.readAllTranslations()),
    writer: (translations: Record<Language, Translations>) => translationsReader.writeLanguageFiles(translations, { append: true}),
    translator: (text: string) => prompt(text, settings.openai.model, settings.openai.apiKey)
  })
}

export const setLanguage = (language: string) => {}

export default {
  t,
  load,
  setLanguage
}