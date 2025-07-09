import { LlmConfiguration } from './modelConfiguration'
import { Prettify } from './utils'
import { Translations, Language, readAllTranslations, writeLanguageFiles } from './translationsReader'
import { addMissingTranslations } from './translationsParser'
import { prompt } from './openaiClient'

export const t = (key: string) => {
  return key;
}

export type Settings = Prettify<{ default: string, supported: string[] } & LlmConfiguration>

export const load = async (settings: Settings) => {
  await addMissingTranslations(settings.default, {
    reader: () => Promise.resolve(readAllTranslations(settings.supported)),
    writer: (translations: Record<Language, Translations>) => writeLanguageFiles(translations, { append: true}),
    translator: (text: string) => prompt(text, settings.openai.model, settings.openai.apiKey)
  })
}

export const setLanguage = (language: string) => {}

export default {
  t,
  load,
  setLanguage
}