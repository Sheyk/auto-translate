import { isLeft } from './utils'
import { Translations, Language, readAllTranslations, writeLanguageFiles, writeLanguageFile } from './translationsReader'
import { addMissingTranslations } from './translationsParser'
import { prompt } from './openaiClient'
import { read } from './codebaseReader'
import { Settings, loadSettings } from './settingsReader'

export const parseCodeBaseTranslations = async (settings: Settings) => {
  const readResult = await read()
  
  if (isLeft(readResult)) {
    console.error('❌ Error parsing codebase translations:', readResult.value.message)
    throw readResult.value
  }
  
  const defaultTranslations = readResult.value
  const writeResult = writeLanguageFile(settings.default, defaultTranslations, { append: false })
  
  if (isLeft(writeResult)) {
    console.error('❌ Failed to write translation file:', writeResult.value.message)
    throw writeResult.value
  }
  
  console.log(`✅ Successfully updated ${settings.default}.json with ${Object.keys(defaultTranslations).length} translations`)
  console.log(`📍 Translation file location: ./i18n/${settings.default}.json`)
}

const translate = async (settings: Settings) => {
  await addMissingTranslations(settings.default, {
    reader: () => Promise.resolve(readAllTranslations(settings.supported)),
    writer: (translations: Record<Language, Translations>) => writeLanguageFiles(translations, { append: true}),
    translator: (text: string) => prompt(text, settings.openai.model, settings.openai.apiKey)
  })
}

export const run = async () => {
  const settingsResult = loadSettings()
  
  if (isLeft(settingsResult)) {
    console.error('❌ Failed to load settings:', settingsResult.value.message)
    throw settingsResult.value
  }
  
  const settings = settingsResult.value
  
  console.log(`🌍 Auto-translating from ${settings.default} to: ${settings.supported.filter(lang => lang !== settings.default).join(', ')}`)
  
  await parseCodeBaseTranslations(settings)
  await translate(settings)
}

export default {
  run
}