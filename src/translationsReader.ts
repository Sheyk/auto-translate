import * as fs from 'fs';
import * as path from 'path';

export type Translations = {
  [key: TranslationKey]: TranslationValue;
}

export type Language = string
export type TranslationKey = string
export type TranslationValue = string
export type TranslationsPath = string

export class TranslationsReader {
  private translationsPath: TranslationsPath;
  private supportedLanguages: Language[];

  constructor(projectRoot: TranslationsPath, supportedLanguages: Language[] = ['en']) {
    this.translationsPath = path.join(projectRoot, 'translations');
    this.supportedLanguages = supportedLanguages;
    this.ensureTranslationsDirectory();
    this.ensureLanguageFiles();
  }

  private ensureTranslationsDirectory(): void {
    if (!fs.existsSync(this.translationsPath)) {
      fs.mkdirSync(this.translationsPath, { recursive: true });
    }
  }

  private ensureLanguageFiles(): void {
    this.supportedLanguages.forEach(languageCode => {
      const filePath = path.join(this.translationsPath, `${languageCode}.json`);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '{}', 'utf8');
      }
    });
  }

  public readAllTranslations(): Record<Language, Translations> {
    const translations: Record<Language, Translations> = {};

    this.supportedLanguages.forEach(languageCode => {
      const filePath = path.join(this.translationsPath, `${languageCode}.json`);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        translations[languageCode] = JSON.parse(content);
      } catch (error) {
        console.warn(`Warning: Could not read ${languageCode}.json, using empty object`);
        translations[languageCode] = {};
      }
    });

    return translations;
  }

  public readLanguageFile(languageCode: Language): Translations {
    const filePath = path.join(this.translationsPath, `${languageCode}.json`);
    
    if (!fs.existsSync(filePath)) {
      // Create the file if it doesn't exist
      fs.writeFileSync(filePath, '{}', 'utf8');
      return {};
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Warning: Could not parse ${languageCode}.json, using empty object`);
      return {};
    }
  }

  public writeLanguageFile(languageCode: Language, translations: Translations): void {
    const filePath = path.join(this.translationsPath, `${languageCode}.json`);
    fs.writeFileSync(filePath, JSON.stringify(translations, null, 2), 'utf8');
  }

  public getAvailableLanguages(): Language[] {
    const languages: Language[] = [];
    
    this.supportedLanguages.forEach(languageCode => {
      const filePath = path.join(this.translationsPath, `${languageCode}.json`);
      if (fs.existsSync(filePath)) {
        languages.push(languageCode);
      }
    });

    return languages;
  }

  public addLanguage(languageCode: Language): void {
    if (!this.supportedLanguages.includes(languageCode)) {
      this.supportedLanguages.push(languageCode);
    }
    this.ensureLanguageFiles();
  }

  public getTranslationsPath(): TranslationsPath {
    return this.translationsPath;
  }

  public getSupportedLanguages(): Language[] {
    return this.supportedLanguages;
  }
}
