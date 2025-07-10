import * as fs from 'fs'
import * as path from 'path'
import {
  getDefaultSettings,
  readSettingsFile,
  createDefaultSettingsFile,
  loadSettings,
  initializeSettings,
  Settings
} from '../settingsReader'
import { isLeft, isRight } from '../utils'

// Mock readline
const mockQuestion = jest.fn()
const mockClose = jest.fn()
jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    question: mockQuestion,
    close: mockClose
  }))
}))

// Mock process.exit
const mockProcessExit = jest.fn()
jest.spyOn(process, 'exit').mockImplementation(mockProcessExit as any)

// Mock console methods
const originalConsoleLog = console.log
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

beforeEach(() => {
  console.log = jest.fn()
  console.warn = jest.fn()
  console.error = jest.fn()

  // Clear all mocks before each test
  jest.clearAllMocks()
})

afterEach(() => {
  console.log = originalConsoleLog
  console.warn = originalConsoleWarn
  console.error = originalConsoleError
})

describe('settingsReader', () => {
  const testDir = path.join(__dirname, 'test-settings')
  const settingsFileName = 'auto-translate.settings.json'
  const settingsFilePath = path.join(testDir, settingsFileName)
  const originalEnv = process.env.OPENAI_API_KEY

  beforeEach(() => {
    // Create test directory
    if (fs.existsSync(testDir)) {
      try {
        fs.rmSync(testDir, { recursive: true, force: true })
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    fs.mkdirSync(testDir, { recursive: true })

    // Clean environment
    delete process.env.OPENAI_API_KEY
  })

  afterEach(() => {
    // Clean up test directory with retry logic
    let retries = 3
    while (retries > 0) {
      try {
        if (fs.existsSync(testDir)) {
          fs.rmSync(testDir, { recursive: true, force: true })
        }
        break
      } catch (error) {
        retries--
        if (retries === 0) {
          console.warn('Could not clean up test directory:', error)
        }
      }
    }

    // Clean up any settings files in current directory
    try {
      const currentDirSettingsFile = path.join(process.cwd(), settingsFileName)
      if (fs.existsSync(currentDirSettingsFile)) {
        fs.rmSync(currentDirSettingsFile)
      }
    } catch (error) {
      // Ignore cleanup errors
    }

    // Restore environment
    if (originalEnv) {
      process.env.OPENAI_API_KEY = originalEnv
    } else {
      delete process.env.OPENAI_API_KEY
    }
  })

  describe('getDefaultSettings', () => {
    it('should return default settings without environment variable', () => {
      const settings = getDefaultSettings()

      expect(settings).toEqual({
        default: 'en',
        supported: ['en', 'fr', 'de'],
        output: 'i18n',
        include: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
        ignore: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
        openai: {
          model: 'gpt-4o-mini',
          apiKey: ''
        }
      })
    })

    it('should include environment variable for API key when available', () => {
      process.env.OPENAI_API_KEY = 'test-api-key'

      const settings = getDefaultSettings()

      expect(settings).toEqual({
        default: 'en',
        supported: ['en', 'fr', 'de'],
        output: 'i18n',
        include: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
        ignore: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
        openai: {
          model: 'gpt-4o-mini',
          apiKey: 'test-api-key'
        }
      })
    })
  })

  describe('readSettingsFile', () => {
    const originalCwd = process.cwd()

    afterEach(() => {
      process.chdir(originalCwd)
    })

    it('should return Left when settings file does not exist', () => {
      process.chdir(testDir)

      const result = readSettingsFile()

      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.value.message).toBe('Settings file auto-translate.settings.json not found')
      }
    })

    it('should return Right with settings when file exists and is valid', () => {
      const validSettings: Settings = {
        default: 'es',
        supported: ['es', 'en', 'pt'],
        output: 'translations',
        include: ['.js', '.ts'],
        ignore: ['node_modules'],
        openai: {
          model: 'gpt-4',
          apiKey: 'file-api-key'
        }
      }

      process.chdir(testDir)
      fs.writeFileSync(settingsFilePath, JSON.stringify(validSettings, null, 2))

      const result = readSettingsFile()

      expect(isRight(result)).toBe(true)
      if (isRight(result)) {
        expect(result.value).toEqual(validSettings)
      }
    })

    it('should automatically add default language to supported array when missing', () => {
      const settingsWithMissingDefault: Settings = {
        default: 'ja',
        supported: ['en', 'fr'],
        output: 'i18n',
        include: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
        ignore: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
        openai: {
          model: 'gpt-4',
          apiKey: 'test-key'
        }
      }

      process.chdir(testDir)
      fs.writeFileSync(settingsFilePath, JSON.stringify(settingsWithMissingDefault, null, 2))

      const result = readSettingsFile()

      expect(isRight(result)).toBe(true)
      if (isRight(result)) {
        expect(result.value.supported).toEqual(['ja', 'en', 'fr'])
        expect(result.value.default).toBe('ja')
      }

      // Should log a warning
      expect(console.warn).toHaveBeenCalledWith("⚠️  Default language 'ja' not found in supported languages. Adding it automatically.")
    })

    it('should merge environment API key when file has empty API key', () => {
      process.env.OPENAI_API_KEY = 'env-api-key'

      const settingsWithoutApiKey: Settings = {
        default: 'fr',
        supported: ['fr', 'en'],
        output: 'i18n',
        include: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
        ignore: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
        openai: {
          model: 'gpt-3.5-turbo',
          apiKey: ''
        }
      }

      process.chdir(testDir)
      fs.writeFileSync(settingsFilePath, JSON.stringify(settingsWithoutApiKey, null, 2))

      const result = readSettingsFile()

      expect(isRight(result)).toBe(true)
      if (isRight(result)) {
        expect(result.value.openai.apiKey).toBe('env-api-key')
      }
    })

    it('should prefer file API key over environment when file has non-empty API key', () => {
      process.env.OPENAI_API_KEY = 'env-api-key'

      const settingsWithApiKey: Settings = {
        default: 'de',
        supported: ['de', 'en'],
        output: 'i18n',
        include: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
        ignore: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
        openai: {
          model: 'gpt-4',
          apiKey: 'file-api-key'
        }
      }

      process.chdir(testDir)
      fs.writeFileSync(settingsFilePath, JSON.stringify(settingsWithApiKey, null, 2))

      const result = readSettingsFile()

      expect(isRight(result)).toBe(true)
      if (isRight(result)) {
        expect(result.value.openai.apiKey).toBe('file-api-key')
      }
    })

    it('should return Left when settings file has invalid JSON', () => {
      process.chdir(testDir)
      fs.writeFileSync(settingsFilePath, '{ invalid json }')

      const result = readSettingsFile()

      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.value).toBeInstanceOf(Error)
      }
    })

    it('should return Left when default field is missing', () => {
      const settingsWithoutDefault = {
        supported: ['en', 'fr'],
        openai: {
          model: 'gpt-4',
          apiKey: 'test-key'
        }
      }

      process.chdir(testDir)
      fs.writeFileSync(settingsFilePath, JSON.stringify(settingsWithoutDefault, null, 2))

      const result = readSettingsFile()

      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.value.message).toBe('Settings file is missing required field: default')
      }
    })

    it('should return Left when supported field is missing', () => {
      const settingsWithoutSupported = {
        default: 'en',
        openai: {
          model: 'gpt-4',
          apiKey: 'test-key'
        }
      }

      process.chdir(testDir)
      fs.writeFileSync(settingsFilePath, JSON.stringify(settingsWithoutSupported, null, 2))

      const result = readSettingsFile()

      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.value.message).toBe('Settings file is missing required field: supported (must be a non-empty array)')
      }
    })

    it('should return Left when supported field is empty array', () => {
      const settingsWithEmptySupported = {
        default: 'en',
        supported: [],
        openai: {
          model: 'gpt-4',
          apiKey: 'test-key'
        }
      }

      process.chdir(testDir)
      fs.writeFileSync(settingsFilePath, JSON.stringify(settingsWithEmptySupported, null, 2))

      const result = readSettingsFile()

      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.value.message).toBe('Settings file is missing required field: supported (must be a non-empty array)')
      }
    })

    it('should return Left when openai.model field is missing', () => {
      const settingsWithoutModel = {
        default: 'en',
        supported: ['en', 'fr'],
        openai: {
          apiKey: 'test-key'
        }
      }

      process.chdir(testDir)
      fs.writeFileSync(settingsFilePath, JSON.stringify(settingsWithoutModel, null, 2))

      const result = readSettingsFile()

      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.value.message).toBe(
          'Settings file is missing required field: openai.model. Please set your OpenAI model in the file or as OPENAI_MODEL environment variable.'
        )
      }
    })
  })

  describe('createDefaultSettingsFile', () => {
    const originalCwd = process.cwd()

    afterEach(() => {
      process.chdir(originalCwd)
    })

    it('should create settings file with default values when environment API key is provided and user says yes', async () => {
      process.env.OPENAI_API_KEY = 'test-env-key'
      process.chdir(testDir)

      // Mock user responding "yes"
      mockQuestion.mockImplementation((question, callback) => {
        callback('y')
      })

      const result = await createDefaultSettingsFile()

      expect(isRight(result)).toBe(true)
      expect(fs.existsSync(settingsFilePath)).toBe(true)

      const fileContent = JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8'))
      expect(fileContent).toEqual({
        default: 'en',
        supported: ['en', 'fr', 'de'],
        output: 'i18n',
        include: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
        ignore: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
        openai: {
          model: 'gpt-4o-mini',
          apiKey: '' // Should be empty in file for security
        }
      })

      if (isRight(result)) {
        // But should return settings with environment API key
        expect(result.value.openai.apiKey).toBe('test-env-key')
      }

      expect(console.log).toHaveBeenCalledWith('✅ Using default languages. Continuing...')
    })

    it('should exit when user says no to default languages', async () => {
      process.env.OPENAI_API_KEY = 'test-env-key'
      process.chdir(testDir)

      // Mock user responding "no"
      mockQuestion.mockImplementation((question, callback) => {
        callback('n')
      })

      await createDefaultSettingsFile()

      expect(mockProcessExit).toHaveBeenCalledWith(0)
      expect(console.log).toHaveBeenCalledWith(
        "\n📝 Please edit the 'supported' property in auto-translate.settings.json to include your desired languages, then run the command again."
      )
    })

    it('should handle invalid user response gracefully', async () => {
      process.env.OPENAI_API_KEY = 'test-env-key'
      process.chdir(testDir)

      // Mock user responding with invalid input
      mockQuestion.mockImplementation((question, callback) => {
        callback('maybe')
      })

      const result = await createDefaultSettingsFile()

      expect(isRight(result)).toBe(true)
      expect(mockProcessExit).toHaveBeenCalledWith(0)
      expect(console.log).toHaveBeenCalledWith('❓ Invalid response. Please edit the settings file manually if needed.')
    })

    it('should return error when environment API key is not provided', async () => {
      // Ensure no API key is set
      delete process.env.OPENAI_API_KEY
      process.chdir(testDir)

      const result = await createDefaultSettingsFile()

      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.value.message).toBe(
          'Settings file is missing required field: openai.apiKey. Please set your OpenAI API key in the file or as OPENAI_API_KEY environment variable.'
        )
      }

      // Should not prompt user if API key is missing
      expect(mockQuestion).not.toHaveBeenCalled()
    })

    it('should create settings file and return settings with environment API key', async () => {
      process.env.OPENAI_API_KEY = 'test-env-key'
      process.chdir(testDir)

      // Mock user responding "yes"
      mockQuestion.mockImplementation((question, callback) => {
        callback('yes')
      })

      const result = await createDefaultSettingsFile()

      expect(isRight(result)).toBe(true)

      // File should still have empty API key for security
      const fileContent = JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8'))
      expect(fileContent.openai.apiKey).toBe('')

      // But returned settings should have environment API key
      if (isRight(result)) {
        expect(result.value.openai.apiKey).toBe('test-env-key')
      }
    })

    it('should log creation messages when environment API key is provided', async () => {
      process.env.OPENAI_API_KEY = 'test-env-key'
      process.chdir(testDir)

      // Mock user responding "y"
      mockQuestion.mockImplementation((question, callback) => {
        callback('y')
      })

      await createDefaultSettingsFile()

      expect(console.log).toHaveBeenCalledWith('📄 Created auto-translate.settings.json with default settings')
      expect(console.log).toHaveBeenCalledWith('\n🌍 Default supported languages: en, fr, de')
    })
  })

  describe('initializeSettings', () => {
    const originalCwd = process.cwd()

    afterEach(() => {
      process.chdir(originalCwd)
    })

    it('should create default settings when file does not exist and environment API key is provided', async () => {
      process.env.OPENAI_API_KEY = 'test-env-key'
      process.chdir(testDir)

      // Mock user responding "yes"
      mockQuestion.mockImplementation((question, callback) => {
        callback('yes')
      })

      const result = await initializeSettings()

      expect(isRight(result)).toBe(true)
      expect(fs.existsSync(settingsFilePath)).toBe(true)

      if (isRight(result)) {
        expect(result.value).toEqual({
          default: 'en',
          supported: ['en', 'fr', 'de'],
          output: 'i18n',
          include: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
          ignore: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
          openai: {
            model: 'gpt-4o-mini',
            apiKey: 'test-env-key'
          }
        })
      }

      expect(console.log).toHaveBeenCalledWith('⚙️ Settings file auto-translate.settings.json not found, creating default settings...')
    })

    it('should return error when file does not exist and environment API key is not provided', async () => {
      // Ensure no API key is set
      delete process.env.OPENAI_API_KEY
      process.chdir(testDir)

      const result = await initializeSettings()

      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.value.message).toBe(
          'Settings file is missing required field: openai.apiKey. Please set your OpenAI API key in the file or as OPENAI_API_KEY environment variable.'
        )
      }

      expect(console.log).toHaveBeenCalledWith('⚙️ Settings file auto-translate.settings.json not found, creating default settings...')
    })

    it('should load existing settings when file exists', async () => {
      const existingSettings: Settings = {
        default: 'ja',
        supported: ['ja', 'en', 'ko'],
        output: 'i18n',
        include: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
        ignore: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
        openai: {
          model: 'gpt-4-turbo',
          apiKey: 'existing-key'
        }
      }

      process.chdir(testDir)
      fs.writeFileSync(settingsFilePath, JSON.stringify(existingSettings, null, 2))

      const result = await initializeSettings()

      expect(isRight(result)).toBe(true)
      if (isRight(result)) {
        expect(result.value).toEqual(existingSettings)
      }

      expect(console.log).toHaveBeenCalledWith('⚙️ Loaded settings from auto-translate.settings.json')

      // Should not prompt user when file already exists
      expect(mockQuestion).not.toHaveBeenCalled()
    })

    it('should return error when file has invalid JSON and environment API key is not provided', async () => {
      // Ensure no API key is set
      delete process.env.OPENAI_API_KEY
      process.chdir(testDir)
      fs.writeFileSync(settingsFilePath, '{ invalid json }')

      const result = await initializeSettings()

      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.value.message).toBe(
          'Settings file is missing required field: openai.apiKey. Please set your OpenAI API key in the file or as OPENAI_API_KEY environment variable.'
        )
      }

      // Should have logged the error and attempted to create defaults
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('creating default settings...'))
    })

    it('should create default settings when file has invalid JSON and environment API key is provided', async () => {
      process.env.OPENAI_API_KEY = 'test-env-key'
      process.chdir(testDir)
      fs.writeFileSync(settingsFilePath, '{ invalid json }')

      // Mock user responding "yes"
      mockQuestion.mockImplementation((question, callback) => {
        callback('yes')
      })

      const result = await initializeSettings()

      expect(isRight(result)).toBe(true)
      if (isRight(result)) {
        expect(result.value).toEqual({
          default: 'en',
          supported: ['en', 'fr', 'de'],
          output: 'i18n',
          include: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
          ignore: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
          openai: {
            model: 'gpt-4o-mini',
            apiKey: 'test-env-key'
          }
        })
      }

      // Should have logged the error and created defaults
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('creating default settings...'))
    })

    it('should exit when user says no to default languages during file creation', async () => {
      process.env.OPENAI_API_KEY = 'test-env-key'
      process.chdir(testDir)

      // Mock user responding "no"
      mockQuestion.mockImplementation((question, callback) => {
        callback('no')
      })

      await initializeSettings()

      expect(mockProcessExit).toHaveBeenCalledWith(0)
      expect(console.log).toHaveBeenCalledWith('⚙️ Settings file auto-translate.settings.json not found, creating default settings...')
    })
  })

  describe('loadSettings', () => {
    const originalCwd = process.cwd()

    afterEach(() => {
      process.chdir(originalCwd)
    })

    it('should return existing settings when file exists', () => {
      const existingSettings: Settings = {
        default: 'ja',
        supported: ['ja', 'en', 'ko'],
        output: 'i18n',
        include: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
        ignore: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
        openai: {
          model: 'gpt-4-turbo',
          apiKey: 'existing-key'
        }
      }

      process.chdir(testDir)
      fs.writeFileSync(settingsFilePath, JSON.stringify(existingSettings, null, 2))

      const result = loadSettings()

      expect(isRight(result)).toBe(true)
      if (isRight(result)) {
        expect(result.value).toEqual(existingSettings)
      }

      expect(console.log).toHaveBeenCalledWith('⚙️ Loaded settings from auto-translate.settings.json')
    })

    it('should return error when file does not exist', () => {
      process.chdir(testDir)

      const result = loadSettings()

      expect(isLeft(result)).toBe(true)
      expect(fs.existsSync(settingsFilePath)).toBe(false)

      if (isLeft(result)) {
        expect(result.value.message).toBe('Settings file auto-translate.settings.json not found')
      }
    })

    it('should auto-fix settings when default language is missing from supported array', () => {
      const settingsWithMissingDefault = {
        default: 'pt',
        supported: ['en', 'fr'],
        openai: {
          model: 'gpt-4',
          apiKey: 'test-key'
        }
      }

      process.chdir(testDir)
      fs.writeFileSync(settingsFilePath, JSON.stringify(settingsWithMissingDefault, null, 2))

      const result = loadSettings()

      expect(isRight(result)).toBe(true)
      if (isRight(result)) {
        expect(result.value.supported).toEqual(['pt', 'en', 'fr'])
        expect(result.value.default).toBe('pt')
      }

      expect(console.warn).toHaveBeenCalledWith("⚠️  Default language 'pt' not found in supported languages. Adding it automatically.")
    })
  })

  describe('Settings type validation', () => {
    it('should handle settings with all required fields', () => {
      const validSettings: Settings = {
        default: 'pt',
        supported: ['pt', 'es', 'en'],
        output: 'i18n',
        include: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
        ignore: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
        openai: {
          model: 'gpt-4',
          apiKey: 'test-key'
        }
      }

      const originalCwd = process.cwd()
      process.chdir(testDir)

      try {
        fs.writeFileSync(settingsFilePath, JSON.stringify(validSettings, null, 2))

        const result = readSettingsFile()

        expect(isRight(result)).toBe(true)
        if (isRight(result)) {
          expect(result.value.default).toBe('pt')
          expect(result.value.supported).toContain('pt')
          expect(result.value.supported).toContain('es')
          expect(result.value.supported).toContain('en')
          expect(result.value.openai.model).toBe('gpt-4')
          expect(result.value.openai.apiKey).toBe('test-key')
        }
      } finally {
        process.chdir(originalCwd)
      }
    })
  })
})
