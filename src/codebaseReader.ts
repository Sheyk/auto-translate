import * as fs from 'fs'
import * as path from 'path'
import { Language, Translations } from './translationsReader'
import { isLeft, Either, left, right } from './utils'

  
  // Helper function to recursively find files with specific extensions
  const findFiles = (dir: string, extensions: string[]): string[] => {
    const files: string[] = []
    
    try {
      const items = fs.readdirSync(dir)
      
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory()) {
          // Skip common directories that shouldn't contain translation calls
          if (!['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(item)) {
            files.push(...findFiles(fullPath, extensions))
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item)
          if (extensions.includes(ext)) {
            files.push(fullPath)
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${dir}:`, error)
    }
    
    return files
  }
  
  // Helper function to extract t('...') calls from file content
  const extractTranslationCalls = (content: string): string[] => {
    // Regex to match t('...') or t("...") calls
    // This handles escaped quotes and captures the content inside
    const regex = /\bt\s*\(\s*(['"`])((?:(?!\1)[^\\]|\\.)*)(\1)\s*\)/g
    const matches: string[] = []
    let match
    
    while ((match = regex.exec(content)) !== null) {
      // match[2] contains the text inside the quotes
      const text = match[2]
        .replace(/\\'/g, "'")  // Unescape single quotes
        .replace(/\\"/g, '"')  // Unescape double quotes
        .replace(/\\\\/g, '\\') // Unescape backslashes
      
      if (text.trim()) {
        matches.push(text.trim())
      }
    }
    
    return matches
  }
  
  export const read = async (): Promise<Either<Error, Translations>> => {
    try {
      console.log('🔍 Searching for translation calls in codebase...')
      
      // Define file extensions to search
      const extensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte']
      
      // Start from current working directory
      const rootDir = process.cwd()
      const files = findFiles(rootDir, extensions)
      
      console.log(`📁 Found ${files.length} files to scan`)
      
      // Collect all unique translation strings
      const translationStrings = new Set<string>()
      
      for (const filePath of files) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8')
          const calls = extractTranslationCalls(content)
          
          if (calls.length > 0) {
            console.log(`📄 Found ${calls.length} translation calls in ${path.relative(rootDir, filePath)}`)
            calls.forEach(call => translationStrings.add(call))
          }
        } catch (error) {
          console.warn(`Warning: Could not read file ${filePath}:`, error)
        }
      }
      
      console.log(`📝 Found ${translationStrings.size} unique translation strings`)
      
      // Convert to translations object with kebab-case keys
      const translations: Translations = {}
      translationStrings.forEach(text => {
        translations[text] = text
      })
      
      return right(translations)
    } catch (error) {
      return left(error as Error)
    }
  }