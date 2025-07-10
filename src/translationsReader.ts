import * as fs from 'fs';
import * as path from 'path';
import { Either, left, right, isLeft } from './utils';
import { TranslationReaderConfig } from './settingsReader';

export type Language = string;
export type Translations = Record<string, string>;

const getTranslationFilePath = (language: Language, config: TranslationReaderConfig): string => {
  return path.join(process.cwd(), config.output, `${language}.json`);
};

const readTranslationFile = (filePath: string): Either<Error, Translations> => {
  try {
    if (!fs.existsSync(filePath)) {
      return right({});
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(fileContent);
    return right(parsed);
  } catch (error) {
    return left(error as Error);
  }
};

export const readAllTranslations = (supportedLanguages: Language[], config: TranslationReaderConfig): Either<Error, Record<Language, Translations>> => {
  try {
    const translations: Record<Language, Translations> = {};
    
    for (const lang of supportedLanguages) {
      const filePath = getTranslationFilePath(lang, config);
      const result = readTranslationFile(filePath);
      
      if (isLeft(result)) {
        // If we can't read a translation file, log a warning but continue with empty translations
        console.warn(`Warning: Could not read translation file for language '${lang}': ${result.value.message}`);
        translations[lang] = {};
      } else {
        translations[lang] = result.value;
      }
    }
    
    return right(translations);
  } catch (error) {
    return left(error as Error);
  }
};

export const writeLanguageFile = (
  language: Language,
  translations: Translations,
  config: TranslationReaderConfig,
  options: { append: boolean } = { append: false }
): Either<Error, void> => {
  try {
    const filePath = getTranslationFilePath(language, config);
    const outputDir = path.dirname(filePath);

    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let existingTranslations: Translations = {};
    
    // If appending, try to read existing translations
    if (options.append && fs.existsSync(filePath)) {
      const readResult = readTranslationFile(filePath);
      if (isLeft(readResult)) {
        return left(new Error(`Failed to read existing translation file for '${language}': ${readResult.value.message}`));
      }
      existingTranslations = readResult.value;
    }

    const newTranslations = { ...existingTranslations, ...translations };
    const fileContent = JSON.stringify(newTranslations, null, 2);
    fs.writeFileSync(filePath, fileContent, 'utf-8');

    return right(undefined);
  } catch (error) {
    return left(error as Error);
  }
};

export const writeLanguageFiles = async (
  translations: Record<Language, Translations>,
  config: TranslationReaderConfig,
  options: { append: boolean }
): Promise<Either<Error, void>> => {
  try {
    for (const lang of Object.keys(translations)) {
      const result = writeLanguageFile(lang, translations[lang], config, options);
      if (isLeft(result)) {
        return result;
      }
    }
    return right(undefined);
  } catch (error) {
    return left(error as Error);
  }
};
