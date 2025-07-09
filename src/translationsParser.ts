import { Language, Translations } from './translationsReader';
import { createTranslator } from './createTranslator';
import { Either, isLeft, left, liftAsync, right } from './utils';

export const readTranslations = async (reader: () => Promise<Either<Error, Record<Language, Translations>>>): Promise<Either<Error, Record<Language, Translations>>> => {
     try {
          console.log('📖 Reading translations...');
          const result = await reader();
          if (isLeft(result)) {
               console.log('❌ Failed to read translations:', result.value.message);
          } else {
               const languageCount = Object.keys(result.value).length;
               console.log(`✅ Successfully read translations for ${languageCount} languages`);
          }
          return result;
     } catch (error) {
          console.log('❌ Error reading translations:', (error as Error).message);
          return left(error as Error)
     }
}

export const getMissingTranslations = (defaultTranslations: Translations, targetTranslations: Translations) : Translations => {
     const missingTranslationKeys = Object.keys(defaultTranslations).filter(key => !targetTranslations[key])
     console.log(`🔍 Found ${missingTranslationKeys.length} missing translation keys`);
     return missingTranslationKeys.reduce((acc, key) => {
          acc[key] = defaultTranslations[key]
          return acc
     }, {} as Translations)
}

export const extractDefaultAndOthers = (defaultLanguage: Language, translations: Record<Language, Translations>) => ({
     default: { language: defaultLanguage, translations: translations[defaultLanguage] },
     others: Object.keys(translations)
          .filter(language => language !== defaultLanguage)
          .map(language => ({ language, translations: translations[language] }))
})

export const extractMissingTranslations = (translations: { default: TranslationWithLanguageCode, others: TranslationWithLanguageCode[] }) : TranslationWithLanguageCode[] => {
     console.log(`🎯 Extracting missing translations for ${translations.others.length} target languages`);
     return translations.others.map(other => {
          const missing = getMissingTranslations(translations.default.translations, other.translations);
          console.log(`📝 Language '${other.language}': ${Object.keys(missing).length} missing translations`);
          return {
               language: other.language as Language,
               translations: missing
          };
     })
}

export const addTranslator = (defaultLanguage: Language, translator: (text: string) => Promise<string>) => 
     (translation: TranslationWithLanguageCode): TranslationWithTranslator => ({ 
          ...translation, 
          translate: createTranslator(defaultLanguage, translation.language, translator) 
     })

export const translate = (translation: TranslationWithTranslator) : Promise<Either<Error, TranslationWithLanguageCode>> => {
     const { translations, translate } = translation
     const totalKeys = Object.keys(translations).length;
     console.log(`🌐 Starting translation for '${translation.language}' (${totalKeys} keys)`);

     return new Promise(async (resolve, reject) => {
          try {
               const translated = {} as Translations
               let completedKeys = 0;

               for (const key of Object.keys(translations)) {
                    const translatedText = await translate(translations[key])
                    translated[key] = translatedText
                    completedKeys++;
               }
               console.log(`🎉 Finished translating '${translation.language}' (${completedKeys} keys completed)`);
               resolve(right({ language: translation.language, translations: translated }))
          } catch (error) {
               console.log(`❌ Translation failed for '${translation.language}':`, (error as Error).message);
               reject(error as Error)
          }
     })
}

export const addMissingTranslations = async (defaultLanguage: Language, dependencies: TranslationsParserDependencies) : Promise<void> => {
     console.log(`🚀 Starting translation process with default language: '${defaultLanguage}'`);
     
     const result = await liftAsync(() => readTranslations(dependencies.reader))
          .map(translations => extractDefaultAndOthers(defaultLanguage, translations))
          .map(extractMissingTranslations)
          .map(missingTranslations => missingTranslations.map(addTranslator(defaultLanguage, dependencies.translator)))
          .flatMapAll(missingTranslationsWithTranslator => missingTranslationsWithTranslator.map(translate))
          .flatMapAllVoid(translatedTranslations => 
               translatedTranslations.map(t =>  dependencies.writer({ [t.language]: t.translations })))
          .result()

     if (isLeft(result)) {
          console.error('💥 Translation process failed:', result.value);
     } else {
          console.log('🎊 Translation process completed successfully!');
     }
}

export type TranslationsParserDependencies = {
     reader: () => Promise<Either<Error, Record<Language, Translations>>>
     writer: (translations: Record<Language, Translations>) => Promise<Either<Error, void>>
     translator: (text: string) => Promise<string>
}

export type TranslationWithLanguageCode = { language: Language, translations: Translations }

export type TranslationWithTranslator = TranslationWithLanguageCode & { translate: (text: string) => Promise<string> }