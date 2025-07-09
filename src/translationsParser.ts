import { Language, Translations } from './translationsReader';
import { createTranslator } from './translate';
import { Either, isLeft, left, liftAsync, right } from './utils';

export const readTranslations = async (reader: () => Promise<Record<Language, Translations>>): Promise<Either<Error, Record<Language, Translations>>> => {
     try {
          const translations = await reader()
          return right(translations)
     } catch (error) {
          return left(error as Error)
     }
}

export const getMissingTranslations = (defaultTranslations: Translations, targetTranslations: Translations) : Translations => {
     const missingTranslationKeys = Object.keys(defaultTranslations).filter(key => !targetTranslations[key])
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
     return translations.others.map(other => ({
          language: other.language as Language,
          translations: getMissingTranslations(translations.default.translations, other.translations)
     }))
}

export const addTranslator = (defaultLanguage: Language, translator: (text: string) => Promise<string>) => 
     (translation: TranslationWithLanguageCode): TranslationWithTranslator => ({ 
          ...translation, 
          translate: createTranslator(translation.language, defaultLanguage, translator) 
     })

export const translate = (translation: TranslationWithTranslator) : Promise<Either<Error, TranslationWithLanguageCode>> => {
     const { translations, translate } = translation

     return new Promise(async (resolve, reject) => {
          try {
               const translated = {} as Translations

               for (const key of Object.keys(translations)) {
                    const translatedText = await translate(translations[key])
                    translated[key] = translatedText
               }
               resolve(right({ language: translation.language, translations: translated }))
          } catch (error) {
               reject(error as Error)
          }
     })
}

export const addMissingTranslations = async (defaultLanguage: Language, dependencies: TranslationsParserDependencies) : Promise<void> => {
     const result = await liftAsync(() => readTranslations(dependencies.reader))
          .map(translations => extractDefaultAndOthers(defaultLanguage, translations))
          .map(extractMissingTranslations)
          .map(missingTranslations => missingTranslations.map(addTranslator(defaultLanguage, dependencies.translator)))
          .flatMapAll(missingTranslationsWithTranslator => missingTranslationsWithTranslator.map(translate))
          .flatMapAllVoid(translatedTranslations => 
               translatedTranslations.map(t =>  dependencies.writer({ [t.language]: t.translations })))
          .result()

     if (isLeft(result))
          console.error(result.value)
}

export type TranslationsParserDependencies = {
     reader: () => Promise<Record<Language, Translations>>
     writer: (translations: Record<Language, Translations>) => Promise<Either<Error, void>>
     translator: (text: string) => Promise<string>
}

export type TranslationWithLanguageCode = { language: Language, translations: Translations }

export type TranslationWithTranslator = TranslationWithLanguageCode & { translate: (text: string) => Promise<string> }