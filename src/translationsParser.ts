import { Language, TranslationKey, Translations } from './translationsReader';
import { Either, isLeft, left, right } from './utils';

const readTranslations = async (reader: () => Promise<Record<Language, Translations>>): Promise<Either<Error, Record<Language, Translations>>> => {
     try {
          const translations = await reader()
          return right(translations)
     } catch (error) {
          return left(error as Error)
     }
}

const getMissingTranslations = (defaultTranslations: Translations, targetTranslations: Translations) : Translations => {
     const missingTranslationKeys = Object.keys(defaultTranslations).filter(key => !targetTranslations[key])
     return missingTranslationKeys.reduce((acc, key) => {
          acc[key] = defaultTranslations[key]
          return acc
     }, {} as Translations)
}


const execute = async (defaultLanguage: Language, dependencies: Dependencies) => {
     const translations = await readTranslations(dependencies.reader)
     if(isLeft(translations)) return
     
     const defaultTranslations = translations.value[defaultLanguage]
}

type Dependencies = {
     reader: () => Promise<Record<Language, Translations>>
}