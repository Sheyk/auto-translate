
import * as fs from 'fs';
import * as path from 'path';
import { parseCodeBaseTranslations } from '../../src/index';
import { Settings } from '../../src/settingsReader';
import { addMissingTranslations } from '../../src/translationsParser';
import { Language, Translations, readAllTranslations, writeLanguageFiles } from '../../src/translationsReader';
import { prompt } from '../../src/openaiClient';

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
const I18N_DIR = path.join(FIXTURES_DIR, 'i18n');
const EN_FILE = path.join(I18N_DIR, 'en.json');
const FR_FILE = path.join(I18N_DIR, 'fr.json');

const settings: Settings = {
  default: 'en',
  supported: ['en', 'fr'],
  openai: {
    model: 'gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY || ''
  },
};

describe('E2E - Vue Translation', () => {
  beforeEach(() => {
    if (fs.existsSync(I18N_DIR)) {
      fs.rmSync(I18N_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(I18N_DIR)) {
      fs.rmSync(I18N_DIR, { recursive: true, force: true });
    }
  });

  it('should translate a Vue file', async () => {
    if (!settings.openai.apiKey) {
      console.warn('OPENAI_API_KEY not found in environment variables. Skipping E2E test.');
      return;
    }

    const originalCwd = process.cwd();
    process.chdir(FIXTURES_DIR);

    try {
        await parseCodeBaseTranslations(settings);

        await addMissingTranslations(settings.default, {
            reader: () => Promise.resolve(readAllTranslations(settings.supported)),
            writer: (translations: Record<Language, Translations>) => writeLanguageFiles(translations, { append: true}),
            translator: (text: string) => prompt(text, settings.openai.model, settings.openai.apiKey)
        })

        expect(fs.existsSync(EN_FILE)).toBe(true);
        expect(fs.existsSync(FR_FILE)).toBe(true);
  
        const enTranslations = JSON.parse(fs.readFileSync(EN_FILE, 'utf-8'));
        const frTranslations = JSON.parse(fs.readFileSync(FR_FILE, 'utf-8'));
  
        expect(enTranslations).toEqual({
          'hello-world': 'Hello World',
          'this-is-a-test': 'This is a test.',
        });
  
        expect(frTranslations).toHaveProperty('hello-world');
        expect(frTranslations).toHaveProperty('this-is-a-test');
        expect(frTranslations['hello-world']).not.toBe('Hello World');
        expect(frTranslations['this-is-a-test']).not.toBe('This is a test.');
        // A simple check to see if it's likely French
        expect(frTranslations['hello-world'].toLowerCase()).toContain('monde');

    } finally {
      process.chdir(originalCwd);
    }
  });
}); 