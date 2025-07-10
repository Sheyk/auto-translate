import * as fs from 'fs'
import * as path from 'path'
import { Either, left, right } from './utils'
import { LlmConfiguration } from './modelConfiguration'
import { Prettify } from './utils'

export type Settings = Prettify<LanguageConfig & TranslationReaderConfig & CodebaseReaderConfig & LlmConfiguration>

type LanguageConfig = { default: string; supported: string[] }

export type TranslationReaderConfig = {
  output: string
}

export type CodebaseReaderConfig = {
  include: string[]
  ignore: string[]
}

const SETTINGS_FILE = 'auto-translate.settings.json'

// Helper function to validate and fix settings
const validateAndFixSettings = (settings: Settings): Settings => {
  // Check if default language is in supported array
  if (!settings.supported.includes(settings.default)) {
    console.warn(`⚠️  Default language '${settings.default}' not found in supported languages. Adding it automatically.`)
    return {
      ...settings,
      supported: [settings.default, ...settings.supported]
    }
  }

  return settings
}

// Helper function to get the default settings
export const getDefaultSettings = (): Settings => ({
  default: 'en',
  supported: ['en', 'fr', 'de'],
  output: 'i18n',
  include: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
  ignore: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
  openai: {
    model: 'gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY || ''
  }
})

// Helper function to read settings from file
export const readSettingsFile = (): Either<Error, Settings> => {
  try {
    const settingsPath = path.join(process.cwd(), SETTINGS_FILE)

    if (!fs.existsSync(settingsPath)) {
      return left(new Error(`Settings file ${SETTINGS_FILE} not found`))
    }

    const fileContent = fs.readFileSync(settingsPath, 'utf-8')
    const rawSettings = JSON.parse(fileContent) as Settings

    // Validate required fields
    if (!rawSettings.default) {
      return left(new Error('Settings file is missing required field: default'))
    }

    if (!rawSettings.supported || !Array.isArray(rawSettings.supported) || rawSettings.supported.length === 0) {
      return left(new Error('Settings file is missing required field: supported (must be a non-empty array)'))
    }

    if (!rawSettings.openai || !rawSettings.openai.model) {
      return left(
        new Error(
          'Settings file is missing required field: openai.model. Please set your OpenAI model in the file or as OPENAI_MODEL environment variable.'
        )
      )
    }

    // Set defaults for new optional fields if missing
    if (!rawSettings.output) {
      rawSettings.output = 'i18n'
    }

    if (!rawSettings.include || !Array.isArray(rawSettings.include)) {
      rawSettings.include = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte']
    }

    if (!rawSettings.ignore || !Array.isArray(rawSettings.ignore)) {
      rawSettings.ignore = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage']
    }

    // Merge with environment variables for API key if not provided
    if (rawSettings.openai && !rawSettings.openai.apiKey && process.env.OPENAI_API_KEY) {
      rawSettings.openai.apiKey = process.env.OPENAI_API_KEY
    }

    if (!rawSettings.openai || !rawSettings.openai.apiKey) {
      return left(
        new Error(
          'Settings file is missing required field: openai.apiKey. Please set your OpenAI API key in the file or as OPENAI_API_KEY environment variable.'
        )
      )
    }

    // Validate and fix settings (ensure default is in supported array)
    const validatedSettings = validateAndFixSettings(rawSettings)

    return right(validatedSettings)
  } catch (error) {
    return left(error as Error)
  }
}

// Helper function to create default settings file
export const createDefaultSettingsFile = (): Either<Error, Settings> => {
  try {
    const settingsPath = path.join(process.cwd(), SETTINGS_FILE)
    const defaultSettings = getDefaultSettings()

    // Don't include the API key in the file for security
    const settingsToWrite = {
      ...defaultSettings,
      openai: {
        ...defaultSettings.openai,
        apiKey: ''
      }
    }

    const fileContent = JSON.stringify(settingsToWrite, null, 2)
    fs.writeFileSync(settingsPath, fileContent, 'utf-8')

    console.log(`📄 Created ${SETTINGS_FILE} with default settings`)

    if (!process.env.OPENAI_API_KEY)
      return left(
        new Error(
          'Settings file is missing required field: openai.apiKey. Please set your OpenAI API key in the file or as OPENAI_API_KEY environment variable.'
        )
      )
    else defaultSettings.openai.apiKey = process.env.OPENAI_API_KEY

    return right(defaultSettings)
  } catch (error) {
    return left(error as Error)
  }
}

// Helper function to initialize settings (creates defaults if none exist)
export const initializeSettings = (): Either<Error, Settings> => {
  const readResult = readSettingsFile()

  if (readResult.type === 'left') {
    console.log(`⚙️ ${readResult.value.message}, creating default settings...`)
    return createDefaultSettingsFile()
  }

  console.log(`⚙️ Loaded settings from ${SETTINGS_FILE}`)
  return readResult
}

// Helper function to load or create settings
export const loadSettings = (): Either<Error, Settings> => {
  const readResult = readSettingsFile()

  if (readResult.type === 'left') {
    return readResult // Return the error immediately, don't create defaults
  }

  console.log(`⚙️ Loaded settings from ${SETTINGS_FILE}`)
  return readResult
}
