import * as fs from 'fs';
import {
  readAllTranslations,
  writeLanguageFile,
  writeLanguageFiles,
  Language,
} from '../translationsReader';
import { isLeft, isRight } from '../utils';
import * as path from 'path';

jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

const i18nFolder = 'i18n';
const CWD = '/fake/project/root';

// Helper to get expected file path
const getTranslationFilePath = (language: Language): string => {
  return path.join(CWD, i18nFolder, `${language}.json`);
};

describe('translationsReader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock process.cwd()
    jest.spyOn(process, 'cwd').mockReturnValue(CWD);
    
    // Set up default mock implementations
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.readFileSync.mockReturnValue('{}');
    mockedFs.writeFileSync.mockReturnValue(undefined);
    mockedFs.mkdirSync.mockReturnValue(undefined);
  });

  describe('readAllTranslations', () => {
    it('should read all existing translation files correctly', () => {
      const supportedLanguages = ['en', 'fr'];
      const enTranslations = { hello: 'Hello' };
      const frTranslations = { hello: 'Bonjour' };

      mockedFs.existsSync.mockImplementation((p) => {
        return p === getTranslationFilePath('en') || p === getTranslationFilePath('fr');
      });
      mockedFs.readFileSync.mockImplementation((p) => {
        if (p === getTranslationFilePath('en')) {
          return JSON.stringify(enTranslations);
        }
        if (p === getTranslationFilePath('fr')) {
          return JSON.stringify(frTranslations);
        }
        return '{}';
      });

      const result = readAllTranslations(supportedLanguages);

      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.value).toEqual({
          en: enTranslations,
          fr: frTranslations,
        });
      }
      expect(mockedFs.existsSync).toHaveBeenCalledTimes(2);
      expect(mockedFs.readFileSync).toHaveBeenCalledTimes(2);
    });

    it('should return an empty object for languages with no translation file', () => {
      const supportedLanguages = ['en', 'es'];
      const enTranslations = { hello: 'Hello' };

      mockedFs.existsSync.mockImplementation((p) => p === getTranslationFilePath('en'));
      mockedFs.readFileSync.mockImplementation((p) => {
        if (p === getTranslationFilePath('en')) {
          return JSON.stringify(enTranslations);
        }
        return '{}';
      });

      const result = readAllTranslations(supportedLanguages);

      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.value).toEqual({
          en: enTranslations,
          es: {},
        });
      }
    });

    it('should return an empty object if no languages are provided', () => {
      const result = readAllTranslations([]);
      
      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.value).toEqual({});
      }
      expect(mockedFs.existsSync).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON gracefully and continue with other languages', () => {
      const supportedLanguages = ['en', 'fr'];
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation((p) => {
        if (p === getTranslationFilePath('en')) {
          return '{"hello": "Hello",}'; // Invalid JSON
        }
        if (p === getTranslationFilePath('fr')) {
          return '{"hello": "Bonjour"}'; // Valid JSON
        }
        return '{}';
      });

      const result = readAllTranslations(supportedLanguages);

      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.value).toEqual({
          en: {}, // Should be empty due to JSON parse error
          fr: { hello: 'Bonjour' },
        });
      }
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Warning: Could not read translation file for language 'en'"));
      
      consoleSpy.mockRestore();
    });

    it('should handle file system errors gracefully for individual files', () => {
      const supportedLanguages = ['en', 'fr'];
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      mockedFs.existsSync.mockImplementation((p) => {
        if (p === getTranslationFilePath('en')) {
          throw new Error('File system error');
        }
        return p === getTranslationFilePath('fr');
      });
      mockedFs.readFileSync.mockImplementation((p) => {
        if (p === getTranslationFilePath('fr')) {
          return '{"hello": "Bonjour"}';
        }
        return '{}';
      });

      const result = readAllTranslations(supportedLanguages);

      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.value).toEqual({
          en: {}, // Should be empty due to file system error
          fr: { hello: 'Bonjour' },
        });
      }
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Warning: Could not read translation file for language 'en'"));
      
      consoleSpy.mockRestore();
    });

    it('should handle edge cases gracefully', () => {
      // Test with a very large number of languages to ensure robustness
      const manyLanguages = Array.from({ length: 100 }, (_, i) => `lang${i}`);
      
      mockedFs.existsSync.mockReturnValue(false); // No files exist

      const result = readAllTranslations(manyLanguages);

      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(Object.keys(result.value)).toHaveLength(100);
        expect(Object.values(result.value).every(translations => Object.keys(translations).length === 0)).toBe(true);
      }
    });
  });

  describe('writeLanguageFile', () => {
    it('should write a new file when it does not exist', () => {
      const lang = 'de';
      const translations = { welcome: 'Willkommen' };
      const filePath = getTranslationFilePath(lang);

      // Directory doesn't exist, file doesn't exist
      mockedFs.existsSync.mockReturnValue(false);

      const result = writeLanguageFile(lang, translations);

      expect(isRight(result)).toBe(true);
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(path.dirname(filePath), { recursive: true });
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(filePath, JSON.stringify(translations, null, 2), 'utf-8');
    });

    it('should overwrite an existing file when append is false', () => {
      const lang = 'en';
      const translations = { bye: 'Goodbye' };
      const filePath = getTranslationFilePath(lang);

      // Directory exists, file exists, but we're not appending
      mockedFs.existsSync.mockImplementation((p) => {
        return p === path.dirname(filePath); // directory exists
      });

      const result = writeLanguageFile(lang, translations, { append: false });

      expect(isRight(result)).toBe(true);
      // readFileSync should NOT be called when overwriting (append: false)
      expect(mockedFs.readFileSync).not.toHaveBeenCalled();
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(filePath, JSON.stringify(translations, null, 2), 'utf-8');
    });

    it('should append to an existing file when append is true', () => {
      const lang = 'en';
      const newTranslations = { bye: 'Goodbye' };
      const filePath = getTranslationFilePath(lang);
      const existingTranslations = { hello: 'Hello' };
      const mergedTranslations = { ...existingTranslations, ...newTranslations };

      // Directory and file both exist
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(existingTranslations));

      const result = writeLanguageFile(lang, newTranslations, { append: true });

      expect(isRight(result)).toBe(true);
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(filePath, 'utf-8');
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(filePath, JSON.stringify(mergedTranslations, null, 2), 'utf-8');
    });

    it('should return a left with an error if writing fails', () => {
      const lang = 'fr';
      const translations = { test: 'Test' };
      const error = new Error('Disk full');

      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.writeFileSync.mockImplementation(() => {
        throw error;
      });

      const result = writeLanguageFile(lang, translations);

      expect(isLeft(result)).toBe(true);
      if (isLeft(result)) {
        expect(result.value).toBe(error);
      }
    });

    it('should return left if reading existing file for append fails', () => {
      const lang = 'en';
      const translations = { test: 'Test' };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('{"malformed": json,}'); // Invalid JSON

      const result = writeLanguageFile(lang, translations, { append: true });

      expect(isLeft(result)).toBe(true);
      if (isLeft(result)) {
        expect(result.value.message).toContain(`Failed to read existing translation file for '${lang}'`);
      }
    });
  });

  describe('writeLanguageFiles', () => {
    it('should write all language files successfully', async () => {
      const translations = {
        en: { hello: 'Hello' },
        fr: { hello: 'Bonjour' },
      };

      // Setup mocks for successful writes
      mockedFs.existsSync.mockReturnValue(false); // directories don't exist

      const result = await writeLanguageFiles(translations, { append: false });

      expect(isRight(result)).toBe(true);
      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(2);
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(getTranslationFilePath('en'), JSON.stringify(translations.en, null, 2), 'utf-8');
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(getTranslationFilePath('fr'), JSON.stringify(translations.fr, null, 2), 'utf-8');
    });

    it('should return a left if any file write fails', async () => {
      const translations = {
        en: { hello: 'Hello' },
        fr: { hello: 'Bonjour' },
      };
      const error = new Error('Write error');

      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.writeFileSync.mockImplementation((p) => {
        if ((p as string).includes('fr.json')) {
          throw error;
        }
      });

      const result = await writeLanguageFiles(translations, { append: false });

      expect(isLeft(result)).toBe(true);
      if (isLeft(result)) {
        expect(result.value).toBe(error);
      }
      // It should have tried to write 'en' successfully and then failed on 'fr'
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(getTranslationFilePath('en'), JSON.stringify(translations.en, null, 2), 'utf-8');
      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(2);
    });
  });
}); 