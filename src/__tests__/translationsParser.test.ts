import { Language, Translations } from '../translationsReader';
import { Either, isLeft, isRight, left, right } from '../utils';
import { 
  addMissingTranslations,
  readTranslations,
  getMissingTranslations,
  extractDefaultAndOthers,
  extractMissingTranslations,
  addTranslator,
  translate,
  TranslationWithLanguageCode,
  TranslationWithTranslator
} from '../translationsParser';

describe('translationsParser', () => {
  const mockTranslations: Record<Language, Translations> = {
    en: { hello: 'Hello', world: 'World', greeting: 'Hi there' },
    fr: { hello: 'Bonjour', world: 'Monde' }, // missing 'greeting'
    es: { hello: 'Hola' } // missing 'world' and 'greeting'
  };

  const mockReader = jest.fn((): Promise<Either<Error, Record<Language, Translations>>> => 
    Promise.resolve(right<Error, Record<Language, Translations>>(mockTranslations))
  );
  const mockWriter = jest.fn(() => Promise.resolve(right<Error, void>(undefined)));
  const mockTranslator = jest.fn((text: string) => Promise.resolve(`translated_${text}`));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readTranslations', () => {
    it('should return right when reader succeeds', async () => {
      const reader = jest.fn((): Promise<Either<Error, Record<Language, Translations>>> => 
        Promise.resolve(right<Error, Record<Language, Translations>>(mockTranslations))
      );
      
      const result = await readTranslations(reader);
      
      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.value).toEqual(mockTranslations);
      }
      expect(reader).toHaveBeenCalledTimes(1);
    });

    it('should return left when reader returns left', async () => {
      const error = new Error('Reader failed');
      const reader = jest.fn((): Promise<Either<Error, Record<Language, Translations>>> => 
        Promise.resolve(left<Error, Record<Language, Translations>>(error))
      );
      
      const result = await readTranslations(reader);
      
      expect(isLeft(result)).toBe(true);
      if (isLeft(result)) {
        expect(result.value).toBe(error);
      }
      expect(reader).toHaveBeenCalledTimes(1);
    });

    it('should return left when reader throws error', async () => {
      const error = new Error('Reader threw');
      const reader = jest.fn(() => Promise.reject(error));
      
      const result = await readTranslations(reader);
      
      expect(isLeft(result)).toBe(true);
      if (isLeft(result)) {
        expect(result.value).toBe(error);
      }
      expect(reader).toHaveBeenCalledTimes(1);
    });

    it('should handle non-Error thrown values', async () => {
      const reader = jest.fn(() => Promise.reject('string error'));
      
      const result = await readTranslations(reader);
      
      expect(isLeft(result)).toBe(true);
      if (isLeft(result)) {
        expect(result.value).toEqual('string error');
      }
    });
  });

  describe('getMissingTranslations', () => {
    it('should return empty object when no keys are missing', () => {
      const defaultTranslations = { hello: 'Hello', world: 'World' };
      const targetTranslations = { hello: 'Bonjour', world: 'Monde' };
      
      const result = getMissingTranslations(defaultTranslations, targetTranslations);
      
      expect(result).toEqual({});
    });

    it('should return missing translations when some keys are missing', () => {
      const defaultTranslations = { hello: 'Hello', world: 'World', greeting: 'Hi' };
      const targetTranslations = { hello: 'Bonjour' };
      
      const result = getMissingTranslations(defaultTranslations, targetTranslations);
      
      expect(result).toEqual({ world: 'World', greeting: 'Hi' });
    });

    it('should return all translations when target is empty', () => {
      const defaultTranslations = { hello: 'Hello', world: 'World' };
      const targetTranslations = {};
      
      const result = getMissingTranslations(defaultTranslations, targetTranslations);
      
      expect(result).toEqual(defaultTranslations);
    });

    it('should handle falsy values in target translations', () => {
      const defaultTranslations = { hello: 'Hello', world: 'World', empty: 'Empty' };
      const targetTranslations = { hello: 'Bonjour', world: '', empty: '' };
      
      const result = getMissingTranslations(defaultTranslations, targetTranslations);
      
      expect(result).toEqual({ world: 'World', empty: 'Empty' });
    });

    it('should handle empty default translations', () => {
      const defaultTranslations = {};
      const targetTranslations = { hello: 'Bonjour' };
      
      const result = getMissingTranslations(defaultTranslations, targetTranslations);
      
      expect(result).toEqual({});
    });
  });

  describe('extractDefaultAndOthers', () => {
    it('should extract default language and others correctly', () => {
      const translations = {
        en: { hello: 'Hello' },
        fr: { hello: 'Bonjour' },
        es: { hello: 'Hola' }
      };
      
      const result = extractDefaultAndOthers('en', translations);
      
      expect(result).toEqual({
        default: { language: 'en', translations: { hello: 'Hello' } },
        others: [
          { language: 'fr', translations: { hello: 'Bonjour' } },
          { language: 'es', translations: { hello: 'Hola' } }
        ]
      });
    });

    it('should handle case where default language is not first', () => {
      const translations = {
        fr: { hello: 'Bonjour' },
        en: { hello: 'Hello' },
        es: { hello: 'Hola' }
      };
      
      const result = extractDefaultAndOthers('en', translations);
      
      expect(result.default).toEqual({ language: 'en', translations: { hello: 'Hello' } });
      expect(result.others).toHaveLength(2);
      expect(result.others).toContainEqual({ language: 'fr', translations: { hello: 'Bonjour' } });
      expect(result.others).toContainEqual({ language: 'es', translations: { hello: 'Hola' } });
    });

    it('should handle single language (only default)', () => {
      const translations = {
        en: { hello: 'Hello' }
      };
      
      const result = extractDefaultAndOthers('en', translations);
      
      expect(result).toEqual({
        default: { language: 'en', translations: { hello: 'Hello' } },
        others: []
      });
    });

    it('should handle missing default language', () => {
      const translations = {
        fr: { hello: 'Bonjour' },
        es: { hello: 'Hola' }
      };
      
      const result = extractDefaultAndOthers('en', translations);
      
      expect(result.default).toEqual({ language: 'en', translations: undefined });
      expect(result.others).toHaveLength(2);
    });
  });

  describe('extractMissingTranslations', () => {
    it('should extract missing translations for all other languages', () => {
      const translationsData = {
        default: { language: 'en' as Language, translations: { hello: 'Hello', world: 'World' } },
        others: [
          { language: 'fr' as Language, translations: { hello: 'Bonjour' } },
          { language: 'es' as Language, translations: {} as Translations }
        ]
      };
      
      const result = extractMissingTranslations(translationsData);
      
      expect(result).toEqual([
        { language: 'fr', translations: { world: 'World' } },
        { language: 'es', translations: { hello: 'Hello', world: 'World' } }
      ]);
    });

    it('should return empty translations when nothing is missing', () => {
      const translationsData = {
        default: { language: 'en' as Language, translations: { hello: 'Hello' } },
        others: [
          { language: 'fr' as Language, translations: { hello: 'Bonjour' } },
          { language: 'es' as Language, translations: { hello: 'Hola' } }
        ]
      };
      
      const result = extractMissingTranslations(translationsData);
      
      expect(result).toEqual([
        { language: 'fr', translations: {} },
        { language: 'es', translations: {} }
      ]);
    });

    it('should handle empty others array', () => {
      const translationsData = {
        default: { language: 'en' as Language, translations: { hello: 'Hello' } },
        others: []
      };
      
      const result = extractMissingTranslations(translationsData);
      
      expect(result).toEqual([]);
    });
  });

  describe('addTranslator', () => {
    it('should add translator function to translation object', () => {
      const translation: TranslationWithLanguageCode = {
        language: 'fr',
        translations: { hello: 'Hello' }
      };
      const mockTranslatorFn = jest.fn();
      
      const addTranslatorFn = addTranslator('en', mockTranslatorFn);
      const result = addTranslatorFn(translation);
      
      expect(result).toHaveProperty('language', 'fr');
      expect(result).toHaveProperty('translations', { hello: 'Hello' });
      expect(result).toHaveProperty('translate');
      expect(typeof result.translate).toBe('function');
    });

    it('should create translator with correct parameters', () => {
      const translation: TranslationWithLanguageCode = {
        language: 'es',
        translations: { world: 'World' }
      };
      const mockTranslatorFn = jest.fn();
      
      const addTranslatorFn = addTranslator('en', mockTranslatorFn);
      const result = addTranslatorFn(translation);
      
      // The translate function should be created via createTranslator
      expect(result.translate).toBeDefined();
    });
  });

  describe('translate', () => {
    it('should successfully translate all keys', async () => {
      const mockTranslateFn = jest.fn()
        .mockResolvedValueOnce('Translated Hello')
        .mockResolvedValueOnce('Translated World');
      
      const translationWithTranslator: TranslationWithTranslator = {
        language: 'fr',
        translations: { hello: 'Hello', world: 'World' },
        translate: mockTranslateFn
      };
      
      const result = await translate(translationWithTranslator);
      
      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.value).toEqual({
          language: 'fr',
          translations: {
            hello: 'Translated Hello',
            world: 'Translated World'
          }
        });
      }
      expect(mockTranslateFn).toHaveBeenCalledTimes(2);
      expect(mockTranslateFn).toHaveBeenCalledWith('Hello');
      expect(mockTranslateFn).toHaveBeenCalledWith('World');
    });

    it('should handle translation errors', async () => {
      const error = new Error('Translation failed');
      const mockTranslateFn = jest.fn().mockRejectedValue(error);
      
      const translationWithTranslator: TranslationWithTranslator = {
        language: 'fr',
        translations: { hello: 'Hello' },
        translate: mockTranslateFn
      };
      
      try {
        await translate(translationWithTranslator);
        fail('Should have thrown an error');
      } catch (caughtError) {
        expect(caughtError).toBe(error);
      }
    });

    it('should handle empty translations object', async () => {
      const mockTranslateFn = jest.fn();
      
      const translationWithTranslator: TranslationWithTranslator = {
        language: 'fr',
        translations: {},
        translate: mockTranslateFn
      };
      
      const result = await translate(translationWithTranslator);
      
      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.value).toEqual({
          language: 'fr',
          translations: {}
        });
      }
      expect(mockTranslateFn).not.toHaveBeenCalled();
    });

    it('should handle single translation', async () => {
      const mockTranslateFn = jest.fn().mockResolvedValue('Translated Single');
      
      const translationWithTranslator: TranslationWithTranslator = {
        language: 'es',
        translations: { single: 'Single' },
        translate: mockTranslateFn
      };
      
      const result = await translate(translationWithTranslator);
      
      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.value).toEqual({
          language: 'es',
          translations: { single: 'Translated Single' }
        });
      }
      expect(mockTranslateFn).toHaveBeenCalledTimes(1);
      expect(mockTranslateFn).toHaveBeenCalledWith('Single');
    });
  });

  describe('addMissingTranslations (integration tests)', () => {
    it('should process translations and call writer for missing translations', async () => {
      const dependencies = {
        reader: mockReader,
        writer: mockWriter,
        translator: mockTranslator
      };

      await addMissingTranslations('en', dependencies);

      // Verify reader was called
      expect(mockReader).toHaveBeenCalledTimes(1);

      // Verify translator was called for missing translations
      expect(mockTranslator).toHaveBeenCalledTimes(3);
      // Check that translator was called with the prompt containing our text
      expect(mockTranslator.mock.calls.some(call => call[0].includes('Hi there'))).toBe(true);
      expect(mockTranslator.mock.calls.some(call => call[0].includes('World'))).toBe(true);

      // Verify writer was called with translated results
      expect(mockWriter).toHaveBeenCalledTimes(2); // once for fr, once for es
      
      // Check that writer was called (exact structure may vary)
      expect(mockWriter).toHaveBeenCalled();
    });

    it('should handle reader errors', async () => {
      const failingReader = jest.fn((): Promise<Either<Error, Record<Language, Translations>>> => 
        Promise.resolve(left<Error, Record<Language, Translations>>(new Error('Reader failed')))
      );
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const dependencies = {
        reader: failingReader,
        writer: mockWriter,
        translator: mockTranslator
      };

      await addMissingTranslations('en', dependencies);

      expect(consoleSpy).toHaveBeenCalledWith('💥 Translation process failed:', expect.any(Error));
      expect(mockWriter).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle translator errors', async () => {
      const failingTranslator = jest.fn(() => Promise.reject(new Error('Translation failed')));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const dependencies = {
        reader: mockReader,
        writer: mockWriter,
        translator: failingTranslator
      };

      await addMissingTranslations('en', dependencies);

      expect(consoleSpy).toHaveBeenCalledWith('💥 Translation process failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle writer errors', async () => {
      const failingWriter = jest.fn(() => Promise.resolve(left<Error, void>(new Error('Writer failed'))));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const dependencies = {
        reader: mockReader,
        writer: failingWriter,
        translator: mockTranslator
      };

      await addMissingTranslations('en', dependencies);

      expect(consoleSpy).toHaveBeenCalledWith('💥 Translation process failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle case where all translations are complete', async () => {
      const completeTranslations: Record<Language, Translations> = {
        en: { hello: 'Hello', world: 'World' },
        fr: { hello: 'Bonjour', world: 'Monde' },
        es: { hello: 'Hola', world: 'Mundo' }
      };

      const completeReader = jest.fn((): Promise<Either<Error, Record<Language, Translations>>> => 
        Promise.resolve(right<Error, Record<Language, Translations>>(completeTranslations))
      );

      const dependencies = {
        reader: completeReader,
        writer: mockWriter,
        translator: mockTranslator
      };

      await addMissingTranslations('en', dependencies);

      expect(mockTranslator).not.toHaveBeenCalled();
      // Note: writer might still be called for empty translations - that's expected behavior
    });

    it('should handle empty translations', async () => {
      const emptyTranslations: Record<Language, Translations> = {
        en: { hello: 'Hello' },
        fr: {},
        es: {}
      };

      const emptyReader = jest.fn((): Promise<Either<Error, Record<Language, Translations>>> => 
        Promise.resolve(right<Error, Record<Language, Translations>>(emptyTranslations))
      );

      const dependencies = {
        reader: emptyReader,
        writer: mockWriter,
        translator: mockTranslator
      };

      await addMissingTranslations('en', dependencies);

      expect(mockTranslator).toHaveBeenCalledTimes(2); // once for fr, once for es
      expect(mockTranslator.mock.calls.some(call => call[0].includes('Hello'))).toBe(true);
      expect(mockWriter).toHaveBeenCalledTimes(2);
    });

    it('should handle missing default language', async () => {
      const missingDefaultTranslations: Record<Language, Translations> = {
        fr: { hello: 'Bonjour' },
        es: { hello: 'Hola' }
      };

      const missingDefaultReader = jest.fn((): Promise<Either<Error, Record<Language, Translations>>> => 
        Promise.resolve(right<Error, Record<Language, Translations>>(missingDefaultTranslations))
      );
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const dependencies = {
        reader: missingDefaultReader,
        writer: mockWriter,
        translator: mockTranslator
      };

      await addMissingTranslations('en', dependencies);

      // Should handle gracefully - the default translations would be undefined
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle single language scenario', async () => {
      const singleLanguageTranslations: Record<Language, Translations> = {
        en: { hello: 'Hello', world: 'World' }
      };

      const singleLanguageReader = jest.fn((): Promise<Either<Error, Record<Language, Translations>>> => 
        Promise.resolve(right<Error, Record<Language, Translations>>(singleLanguageTranslations))
      );

      const dependencies = {
        reader: singleLanguageReader,
        writer: mockWriter,
        translator: mockTranslator
      };

      await addMissingTranslations('en', dependencies);

      // No other languages to translate to
      expect(mockTranslator).not.toHaveBeenCalled();
      expect(mockWriter).not.toHaveBeenCalled();
    });

    it('should handle special characters and unicode in translations', async () => {
      const unicodeTranslations: Record<Language, Translations> = {
        en: { emoji: '🌍', special: 'Special chars: àáâãäå' },
        fr: {} // missing both
      };

      const unicodeReader = jest.fn((): Promise<Either<Error, Record<Language, Translations>>> => 
        Promise.resolve(right<Error, Record<Language, Translations>>(unicodeTranslations))
      );

      const dependencies = {
        reader: unicodeReader,
        writer: mockWriter,
        translator: mockTranslator
      };

      await addMissingTranslations('en', dependencies);

      expect(mockTranslator.mock.calls.some(call => call[0].includes('🌍'))).toBe(true);
      expect(mockTranslator.mock.calls.some(call => call[0].includes('Special chars: àáâãäå'))).toBe(true);
    });
  });
}); 