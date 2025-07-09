import * as fs from 'fs'
import * as path from 'path'
import * as openaiClient from '../openaiClient'

// Mock the OpenAI client to avoid real API calls
jest.mock('../openaiClient', () => ({
  prompt: jest.fn()
}))

const mockedPrompt = openaiClient.prompt as jest.MockedFunction<typeof openaiClient.prompt>

// Import after mocking
import { run } from '../index'
import { Settings } from '../settingsReader'

// Mock console methods
const originalConsoleLog = console.log
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

beforeEach(() => {
  console.log = jest.fn()
  console.warn = jest.fn()
  console.error = jest.fn()
  
  // Reset the mock before each test
  mockedPrompt.mockReset()
})

afterEach(() => {
  console.log = originalConsoleLog
  console.warn = originalConsoleWarn
  console.error = originalConsoleError
})

describe('Auto-Translate Integration Test', () => {
  const testProjectDir = path.join(__dirname, 'mock-react-project')
  const i18nDir = path.join(testProjectDir, 'i18n')
  const settingsFile = 'auto-translate.settings.json'
  
  beforeEach(() => {
    // Clean up any existing test directory
    if (fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true })
    }
    
    // Create mock React.js project structure
    createMockReactProject()
    
    // Mock OpenAI responses
    setupOpenAIMocks()
  })

  afterEach(() => {
    // Clean up test directory and translation files
    if (fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true })
    }
    
    // Clean up any i18n files that might have been created in the current directory
    const currentI18nDir = path.join(process.cwd(), 'i18n')
    if (fs.existsSync(currentI18nDir)) {
      fs.rmSync(currentI18nDir, { recursive: true })
    }
    
    // Clean up settings files
    const currentSettingsFile = path.join(process.cwd(), settingsFile)
    if (fs.existsSync(currentSettingsFile)) {
      fs.rmSync(currentSettingsFile)
    }
    
    const testSettingsFile = path.join(testProjectDir, settingsFile)
    if (fs.existsSync(testSettingsFile)) {
      fs.rmSync(testSettingsFile)
    }
  })

  const createMockReactProject = () => {
    // Create directory structure
    const dirs = [
      'src/components',
      'src/pages', 
      'src/utils',
      'src/hooks',
      'public'
    ]
    
    dirs.forEach(dir => {
      fs.mkdirSync(path.join(testProjectDir, dir), { recursive: true })
    })

    // Create realistic React component files with translation calls
    const files = [
      {
        path: 'src/components/Header.tsx',
        content: `import React from 'react'
import { useAuth } from '../hooks/useAuth'

export const Header: React.FC = () => {
  const { user, logout } = useAuth()
  
  return (
    <header className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">{t('My Awesome App')}</h1>
        <nav>
          <ul className="flex space-x-4">
            <li><a href="/">{t('Home')}</a></li>
            <li><a href="/about">{t('About')}</a></li>
            <li><a href="/contact">{t('Contact')}</a></li>
            {user ? (
              <li>
                <button onClick={logout}>{t('Sign Out')}</button>
              </li>
            ) : (
              <li>
                <a href="/login">{t('Sign In')}</a>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  )
}`
      },
      {
        path: 'src/components/Footer.jsx',
        content: `import React from 'react'

export const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white p-6 mt-8">
      <div className="container mx-auto text-center">
        <p>&copy; 2024 {t('My Awesome App')}. {t('All rights reserved')}.</p>
        <div className="mt-4">
          <a href="/privacy" className="text-blue-400 hover:underline mr-4">
            {t('Privacy Policy')}
          </a>
          <a href="/terms" className="text-blue-400 hover:underline">
            {t('Terms of Service')}
          </a>
        </div>
      </div>
    </footer>
  )
}`
      },
      {
        path: 'src/pages/Home.js',
        content: `import React, { useState, useEffect } from 'react'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/data')
      if (!response.ok) {
        throw new Error(t('Failed to fetch data'))
      }
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error(t('Error loading data'), error)
      alert(t('Something went wrong. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">{t('Loading...')}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">{t('Welcome to our website')}</h1>
        <p className="text-lg mb-4">
          {t('Discover amazing features and services tailored just for you.')}
        </p>
        <button 
          onClick={() => alert(t('Feature coming soon!'))}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          {t('Get Started')}
        </button>
      </main>
      <Footer />
    </div>
  )
}`
      },
      {
        path: 'src/utils/validation.ts',
        content: `export const validateEmail = (email: string): string | null => {
  if (!email) {
    return t('Email is required')
  }
  
  if (!email.includes('@')) {
    return t('Please enter a valid email address')
  }
  
  return null
}

export const validatePassword = (password: string): string | null => {
  if (!password) {
    return t('Password is required')
  }
  
  if (password.length < 8) {
    return t('Password must be at least 8 characters long')
  }
  
  return null
}

export const validateForm = (data: any): Record<string, string> => {
  const errors: Record<string, string> = {}
  
  if (!data.name) {
    errors.name = t('Name is required')
  }
  
  const emailError = validateEmail(data.email)
  if (emailError) {
    errors.email = emailError
  }
  
  const passwordError = validatePassword(data.password)
  if (passwordError) {
    errors.password = passwordError
  }
  
  return errors
}`
      },
      {
        path: 'src/hooks/useAuth.ts',
        content: `import { useState, useEffect } from 'react'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      }
    } catch (error) {
      console.error(t('Authentication check failed'), error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      
      if (!response.ok) {
        throw new Error(t('Invalid credentials'))
      }
      
      const userData = await response.json()
      setUser(userData)
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.message || t('Login failed. Please try again.')
      }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('authToken')
    alert(t('You have been signed out'))
  }

  return { user, loading, login, logout }
}`
      },
      {
        path: 'package.json',
        content: `{
  "name": "mock-react-app",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}`
      },
      {
        path: 'src/App.js',
        content: `import React from 'react'
import Home from './pages/Home'

function App() {
  return (
    <div className="App">
      <Home />
    </div>
  )
}

export default App`
      }
    ]

    // Write all files
    files.forEach(file => {
      const fullPath = path.join(testProjectDir, file.path)
      fs.writeFileSync(fullPath, file.content)
    })
  }

  const setupOpenAIMocks = () => {
    // Mock translations for different languages
    const translations: Record<string, Record<string, string>> = {
      'fr': {
        'My Awesome App': 'Mon Application Géniale',
        'Home': 'Accueil',
        'About': 'À Propos',
        'Contact': 'Contact',
        'Sign Out': 'Se Déconnecter',
        'Sign In': 'Se Connecter',
        'All rights reserved': 'Tous droits réservés',
        'Privacy Policy': 'Politique de Confidentialité',
        'Terms of Service': 'Conditions d\'Utilisation',
        'Loading...': 'Chargement...',
        'Welcome to our website': 'Bienvenue sur notre site web',
        'Get Started': 'Commencer',
        'Email is required': 'L\'email est requis',
        'Password is required': 'Le mot de passe est requis',
        'Name is required': 'Le nom est requis'
      },
      'de': {
        'My Awesome App': 'Meine Tolle App',
        'Home': 'Startseite',
        'About': 'Über',
        'Contact': 'Kontakt',
        'Sign Out': 'Abmelden',
        'Sign In': 'Anmelden',
        'All rights reserved': 'Alle Rechte vorbehalten',
        'Privacy Policy': 'Datenschutzrichtlinie',
        'Terms of Service': 'Nutzungsbedingungen',
        'Loading...': 'Wird geladen...',
        'Welcome to our website': 'Willkommen auf unserer Website',
        'Get Started': 'Loslegen',
        'Email is required': 'E-Mail ist erforderlich',
        'Password is required': 'Passwort ist erforderlich',
        'Name is required': 'Name ist erforderlich'
      },
      'pt': {
        'My Awesome App': 'Meu App Incrível',
        'Home': 'Início',
        'About': 'Sobre',
        'Contact': 'Contato',
        'Sign Out': 'Sair',
        'Sign In': 'Entrar',
        'All rights reserved': 'Todos os direitos reservados',
        'Privacy Policy': 'Política de Privacidade',
        'Terms of Service': 'Termos de Serviço',
        'Loading...': 'Carregando...',
        'Welcome to our website': 'Bem-vindo ao nosso site',
        'Get Started': 'Começar',
        'Email is required': 'E-mail é obrigatório',
        'Password is required': 'Senha é obrigatória',
        'Name is required': 'Nome é obrigatório'
      }
    }

    mockedPrompt.mockImplementation(async (text: string) => {
      // Simulate translation based on the mock data
      // In a real scenario, this would be the OpenAI API response
      const currentLang = process.env.CURRENT_LANG || 'fr'
      return translations[currentLang]?.[text] || `[${currentLang.toUpperCase()}] ${text}`
    })
  }

  it('should run full auto-translate workflow on a React.js project', async () => {
    // Change to the mock project directory
    const originalCwd = process.cwd()
    const originalEnv = process.env.OPENAI_API_KEY
    
    // Set a mock API key
    process.env.OPENAI_API_KEY = 'mock-api-key'
    
    try {
      process.chdir(testProjectDir)

      // Run the auto-translate workflow
      await run()

      // Verify settings file was created
      const settingsFilePath = path.join(testProjectDir, settingsFile)
      expect(fs.existsSync(settingsFilePath)).toBe(true)
      
      const settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8'))
      expect(settings).toEqual({
        default: 'en',
        supported: ['en', 'fr', 'de'],
        openai: {
          model: 'gpt-4o-mini',
          apiKey: ''  // Should be empty in file for security
        }
      })

      // Verify English translations file was created
      const enFile = path.join(i18nDir, 'en.json')
      expect(fs.existsSync(enFile)).toBe(true)
      
      const enTranslations = JSON.parse(fs.readFileSync(enFile, 'utf-8'))
      
      // Verify key translations are present with actual text as keys
      expect(enTranslations).toEqual(expect.objectContaining({
        'My Awesome App': 'My Awesome App',
        'Home': 'Home',
        'About': 'About',
        'Contact': 'Contact',
        'Sign Out': 'Sign Out',
        'Sign In': 'Sign In',
        'All rights reserved': 'All rights reserved',
        'Privacy Policy': 'Privacy Policy',
        'Terms of Service': 'Terms of Service',
        'Loading...': 'Loading...',
        'Welcome to our website': 'Welcome to our website',
        'Get Started': 'Get Started',
        'Email is required': 'Email is required',
        'Password is required': 'Password is required',
        'Name is required': 'Name is required'
      }))

      // Verify French translations file was created
      process.env.CURRENT_LANG = 'fr'
      const frFile = path.join(i18nDir, 'fr.json')
      expect(fs.existsSync(frFile)).toBe(true)
      
      // Verify German translations file was created  
      process.env.CURRENT_LANG = 'de'
      const deFile = path.join(i18nDir, 'de.json')
      expect(fs.existsSync(deFile)).toBe(true)

      // Verify OpenAI API was called for translations
      expect(mockedPrompt).toHaveBeenCalled()
      
      // Verify success messages were logged
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Successfully updated en.json')
      )
      
      // Verify settings-related messages were logged
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Created auto-translate.settings.json with default settings')
      )
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Auto-translating from en to: fr, de')
      )

    } finally {
      // Restore original state
      process.chdir(originalCwd)
      process.env.OPENAI_API_KEY = originalEnv
      delete process.env.CURRENT_LANG
    }
  }, 30000) // 30 second timeout for integration test

  it('should use existing settings file when available', async () => {
    const originalCwd = process.cwd()
    const originalEnv = process.env.OPENAI_API_KEY
    
    // Set a mock API key
    process.env.OPENAI_API_KEY = 'mock-api-key'
    
    try {
      process.chdir(testProjectDir)
      
      // Create a custom settings file
      const customSettings = {
        default: 'es',
        supported: ['es', 'pt'],
        openai: {
          model: 'gpt-3.5-turbo',
          apiKey: 'custom-key-from-file'
        }
      }
      
      const settingsFilePath = path.join(testProjectDir, settingsFile)
      fs.writeFileSync(settingsFilePath, JSON.stringify(customSettings, null, 2))
      
      // Run the auto-translate workflow
      await run()
      
      // Verify the existing settings file was used (not overwritten)
      const savedSettings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8'))
      expect(savedSettings).toEqual(customSettings)
      
      // Verify Spanish (es) file was created as the default language
      const esFile = path.join(i18nDir, 'es.json')
      expect(fs.existsSync(esFile)).toBe(true)
      
      // Verify Portuguese (pt) file was created
      const ptFile = path.join(i18nDir, 'pt.json')
      expect(fs.existsSync(ptFile)).toBe(true)
      
      // Verify settings loading message was logged
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Loaded settings from auto-translate.settings.json')
      )
      
      // Verify the custom languages were used
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Auto-translating from es to: pt')
      )
      
    } finally {
      process.chdir(originalCwd)
      process.env.OPENAI_API_KEY = originalEnv
    }
  }, 15000)

  it('should handle missing OpenAI API key gracefully', async () => {
    const originalCwd = process.cwd()
    const originalEnv = process.env.OPENAI_API_KEY
    
    // Remove API key
    delete process.env.OPENAI_API_KEY
    
    try {
      process.chdir(testProjectDir)
      
      // This should still work for parsing but may fail on translation
      await run()
      
      // At minimum, the English file should be created
      const enFile = path.join(i18nDir, 'en.json')
      expect(fs.existsSync(enFile)).toBe(true)
      
    } finally {
      process.chdir(originalCwd)
      process.env.OPENAI_API_KEY = originalEnv
    }
  }, 15000)
}) 