import * as fs from 'fs';
import * as path from 'path';
import { Either, left, right, isLeft } from './utils';

export type Language = string;
export type Translations = Record<string, string>;

const i18nFolder = 'i18n';

const getTranslationFilePath = (language: Language): string => {
  return path.join(process.cwd(), i18nFolder, `${language}.json`);
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

export const readAllTranslations = (supportedLanguages: Language[]): Either<Error, Record<Language, Translations>> => {
  try {
    const translations: Record<Language, Translations> = {};
    
    for (const lang of supportedLanguages) {
      const filePath = getTranslationFilePath(lang);
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
  options: { append: boolean } = { append: false }
): Either<Error, void> => {
  try {
    const filePath = getTranslationFilePath(language);
    const i18nDir = path.dirname(filePath);

    // Ensure directory exists
    if (!fs.existsSync(i18nDir)) {
      fs.mkdirSync(i18nDir, { recursive: true });
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
  options: { append: boolean }
): Promise<Either<Error, void>> => {
  try {
    for (const lang of Object.keys(translations)) {
      const result = writeLanguageFile(lang, translations[lang], options);
      if (isLeft(result)) {
        return result;
      }
    }
    return right(undefined);
  } catch (error) {
    return left(error as Error);
  }
};
