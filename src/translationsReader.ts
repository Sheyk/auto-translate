import * as fs from 'fs';
import * as path from 'path';

export interface TranslationData {
  [key: string]: string | TranslationData;
}

export class TranslationsReader {
  private translationsPath: string;
  private supportedLanguages: string[];

  constructor(projectRoot: string, supportedLanguages: string[] = ['en']) {
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

  public readAllTranslations(): Record<string, TranslationData> {
    const translations: Record<string, TranslationData> = {};

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

  public readLanguageFile(languageCode: string): TranslationData {
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

  public writeLanguageFile(languageCode: string, data: TranslationData): void {
    const filePath = path.join(this.translationsPath, `${languageCode}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  public getAvailableLanguages(): string[] {
    const languages: string[] = [];
    
    this.supportedLanguages.forEach(languageCode => {
      const filePath = path.join(this.translationsPath, `${languageCode}.json`);
      if (fs.existsSync(filePath)) {
        languages.push(languageCode);
      }
    });

    return languages;
  }

  public addLanguage(languageCode: string): void {
    if (!this.supportedLanguages.includes(languageCode)) {
      this.supportedLanguages.push(languageCode);
    }
    this.ensureLanguageFiles();
  }

  public getTranslationsPath(): string {
    return this.translationsPath;
  }

  public getSupportedLanguages(): string[] {
    return this.supportedLanguages;
  }
}
