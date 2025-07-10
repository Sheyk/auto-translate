# Auto Translate

🌍 **Automatic internationalization (i18n) tool** that scans your codebase for translation calls and uses OpenAI to automatically translate missing translations into multiple languages.

## ✨ Features

- **🔍 Code Scanning**: Automatically finds `t('...')` translation calls in your codebase
- **🤖 AI-Powered Translation**: Uses OpenAI GPT models to translate missing strings
- **📁 Multi-Language Support**: Supports JavaScript, TypeScript, Vue, Svelte, and more
- **⚙️ Configurable**: Flexible settings for languages, file patterns, and output directories
- **📊 Smart Management**: Only translates missing keys, preserves existing translations
- **🔧 CLI & Library**: Use as a command-line tool or integrate into your build process

## 📦 Installation

### Global Installation (CLI)

```bash
npm install -g auto-translatr
```

### Local Installation (Project)

```bash
npm install auto-translatr
# or
yarn add auto-translatr
# or
pnpm add auto-translatr
```

## 🚀 Quick Start

1. **Set your OpenAI API Key**:

   ```bash
   export OPENAI_API_KEY="your-openai-api-key-here"
   ```

2. **Run the tool**:

   ```bash
   # If installed globally
   auto-translatr

   # If installed locally
   npx auto-translatr
   ```

3. **Follow the prompts** to configure your languages (first run only)

4. **View your translations** in the generated `i18n/` directory

## 🔧 How It Works

### 1. Code Scanning

The tool scans your codebase looking for translation function calls:

```javascript
// JavaScript/TypeScript
const message = t('Hello, world!')
const greeting = t("Welcome to our app")

// Vue.js
<template>
  <h1>{{ t('Page Title') }}</h1>
  <p>{{ t("Description text") }}</p>
</template>

// React/JSX
<button>{t('Click me')}</button>
<div>{t("Error message")}</div>
```

### 2. Translation File Generation

Creates JSON files for each language:

```
i18n/
├── en.json          # Default language (extracted from code)
├── fr.json          # French translations (AI-generated)
├── de.json          # German translations (AI-generated)
└── ...
```

### 3. AI Translation

Uses OpenAI to translate missing keys:

```json
// en.json (source)
{
  "Hello, world!": "Hello, world!",
  "Welcome to our app": "Welcome to our app"
}

// fr.json (auto-translated)
{
  "Hello, world!": "Bonjour le monde!",
  "Welcome to our app": "Bienvenue dans notre application"
}
```

## 📖 Integration with i18n Libraries

Auto Translate works seamlessly with popular i18n libraries. The key is configuring the `output` directory in your `auto-translatr.settings.json` to match where your i18n library expects translation files.

### 🔵 Nuxt.js + @nuxtjs/i18n (Complete Example)

#### 1. Install @nuxtjs/i18n

```bash
npm install @nuxtjs/i18n@8
```

#### 2. Configure Auto Translate Settings

Create `auto-translatr.settings.json`:

```json
{
  "default": "en",
  "supported": ["en", "fr", "ar", "es", "de", "it", "pt", "ru", "zh", "ja"],
  "output": "i18n",
  "include": [".vue", ".js", ".ts"],
  "ignore": ["node_modules", ".nuxt", "dist", ".output"],
  "openai": {
    "model": "gpt-4o-mini",
    "apiKey": ""
  }
}
```

#### 3. Configure Nuxt

```javascript
// nuxt.config.js
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],

  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'fr', name: 'Français', file: 'fr.json' },
      { code: 'ar', name: 'العربية', file: 'ar.json' },
      { code: 'es', name: 'Español', file: 'es.json' },
      { code: 'de', name: 'Deutsch', file: 'de.json' },
      { code: 'it', name: 'Italiano', file: 'it.json' },
      { code: 'pt', name: 'Português', file: 'pt.json' },
      { code: 'ru', name: 'Русский', file: 'ru.json' },
      { code: 'zh', name: '中文', file: 'zh.json' },
      { code: 'ja', name: '日本語', file: 'ja.json' }
    ],
    defaultLocale: 'en',
    lazy: true,
    langDir: 'i18n/', // This matches auto-translatr output directory
    strategy: 'prefix_except_default',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root'
    }
  }
})
```

#### 4. Use in Nuxt Components

```vue
<template>
  <div class="app-container">
    <h1>{{ t('Hello, welcome to my website') }}</h1>

    <p>{{ t('This is a test of the auto-translatr package.') }}</p>
    <p>{{ t('This text will be translated automatically using an LLM after using `npx auto-translatr`.') }}</p>
    <p>{{ t('Then it will be stored as i18n json files in a ./i18n folder.') }}</p>

    <div>
      <button @click="locale = 'en'">{{ t('English') }}</button>
      <button @click="locale = 'fr'">{{ t('French') }}</button>
      <button @click="locale = 'ar'">{{ t('Arabic') }}</button>
      <button @click="locale = 'es'">{{ t('Spanish') }}</button>
      <button @click="locale = 'de'">{{ t('German') }}</button>
      <!-- Add more language buttons -->
    </div>
  </div>
</template>

<script setup>
const { t, locale } = useI18n()
</script>
```

### 🟢 Vue.js + Vue I18n

Follow the [Vue I18n official documentation](https://vue-i18n.intlify.dev/) for setup, then configure auto-translatr's `output` to match your locale files directory (typically `src/locales/`).

### 🔴 React.js + react-i18next

Follow the [react-i18next documentation](https://react.i18next.com/) for setup, then configure auto-translatr's `output` to match your locale files directory (typically `src/locales/`).

### ⚫ Next.js + next-i18next

Follow the [next-i18next documentation](https://github.com/i18next/next-i18next) for setup, then configure auto-translatr's `output` to `public/locales/` to match Next.js conventions.

### 🔄 Complete Workflow

1. **Setup**: Install your preferred i18n library and configure it to read from the auto-translatr output directory

2. **Code**: Write your application using `t('Your text here')` calls

3. **Generate**: Run `npx auto-translatr` to scan your code and generate translation files

4. **Verify**: Check the generated translation files in your output directory

5. **Deploy**: Your application now has automatic translations!

### 📁 Expected File Structure

After running auto-translatr with any of the above setups:

```
your-project/
├── auto-translatr.settings.json
├── [output-directory]/          # i18n/, src/locales/, or public/locales/
│   ├── en.json                  # Source language (extracted from code)
│   ├── fr.json                  # Auto-translated French
│   ├── de.json                  # Auto-translated German
│   └── ...                      # Other languages
├── src/
│   └── components/
│       └── YourComponent.vue    # Contains: t('Your text')
└── package.json
```

### 💡 Pro Tips

- **Consistent Function Name**: Always use `t()` as your translation function name across your project
- **Meaningful Keys**: Use descriptive text as keys (e.g., `t('Welcome message')` instead of `t('msg1')`)
- **Review Translations**: Always review AI-generated translations for accuracy
- **Incremental Updates**: Auto-translatr only adds missing translations, preserving your manual edits

## ⚙️ Configuration

### Settings File: `auto-translatr.settings.json`

The tool uses a settings file to configure its behavior. On first run, it will create this file and prompt you about language preferences.

#### Default Settings (Copy & Paste Ready)

```json
{
  "default": "en",
  "supported": ["en", "fr", "de"],
  "output": "i18n",
  "include": [".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte"],
  "ignore": ["node_modules", ".git", "dist", "build", ".next", "coverage"],
  "openai": {
    "model": "gpt-4o-mini",
    "apiKey": ""
  }
}
```

#### Settings Explanation

| Field           | Type       | Description                                 | Example                    |
| --------------- | ---------- | ------------------------------------------- | -------------------------- |
| `default`       | `string`   | Default/source language code                | `"en"`                     |
| `supported`     | `string[]` | Array of language codes to support          | `["en", "fr", "de", "es"]` |
| `output`        | `string`   | Directory where translation files are saved | `"i18n"` or `"locales"`    |
| `include`       | `string[]` | File extensions to scan for translations    | `[".js", ".ts", ".vue"]`   |
| `ignore`        | `string[]` | Directories/files to skip during scanning   | `["node_modules", "dist"]` |
| `openai.model`  | `string`   | OpenAI model to use for translations        | `"gpt-4o-mini"`            |
| `openai.apiKey` | `string`   | OpenAI API key (leave empty, use env var)   | `""`                       |

### Environment Variables

For security, set your OpenAI API key as an environment variable:

```bash
# Linux/macOS
export OPENAI_API_KEY="sk-your-api-key-here"

# Windows (Command Prompt)
set OPENAI_API_KEY=sk-your-api-key-here

# Windows (PowerShell)
$env:OPENAI_API_KEY="sk-your-api-key-here"

# .env file (if your project supports it)
OPENAI_API_KEY=sk-your-api-key-here
```

## 🌍 Supported Languages

Auto Translate supports any language code. Common examples:

| Code | Language   | Code | Language |
| ---- | ---------- | ---- | -------- |
| `en` | English    | `fr` | French   |
| `es` | Spanish    | `de` | German   |
| `pt` | Portuguese | `it` | Italian  |
| `ja` | Japanese   | `ko` | Korean   |
| `zh` | Chinese    | `ru` | Russian  |
| `ar` | Arabic     | `hi` | Hindi    |

## 📂 File Structure After Running

```
your-project/
├── auto-translatr.settings.json    # Configuration file
├── i18n/                          # Translation files directory
│   ├── en.json                    # Default language
│   ├── fr.json                    # French translations
│   ├── de.json                    # German translations
│   └── ...
├── src/                           # Your source code
│   ├── components/
│   │   └── Button.jsx             # Contains: t('Click me')
│   └── pages/
│       └── Home.tsx               # Contains: t('Welcome')
└── package.json
```

## 🔄 Workflow Integration

### NPM Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "translate": "auto-translatr",
    "translate:check": "auto-translatr --dry-run",
    "build": "auto-translatr && next build"
  }
}
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Generate Translations
  run: |
    export OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}
    npm run translate
```

## 🐛 Troubleshooting

### Common Issues

1. **"OpenAI API key not found"**
   - Set the `OPENAI_API_KEY` environment variable
   - Or add it to your settings file (not recommended for security)

2. **"No translation calls found"**
   - Ensure your code uses `t('...')` function calls
   - Check that file extensions are included in settings
   - Verify directories aren't in the ignore list

3. **"Settings file not found"**
   - Run the tool once to generate the default settings file
   - Or create one manually using the template above

4. **Translation quality issues**
   - Try using a different OpenAI model (e.g., `gpt-4` instead of `gpt-4o-mini`)
   - Provide more context in your translation strings
   - Review and manually edit generated translations

### Debug Mode

For more verbose output, set the debug environment variable:

```bash
DEBUG=auto-translatr* auto-translatr
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

```bash
git clone https://github.com/Sheyk/auto-translatr.git
cd auto-translatr
npm install
npm run test
npm run build
```

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Repository**: [https://github.com/Sheyk/auto-translatr](https://github.com/Sheyk/auto-translatr)
- **Issues**: [https://github.com/Sheyk/auto-translatr/issues](https://github.com/Sheyk/auto-translatr)
- **NPM Package**: [https://www.npmjs.com/package/auto-translatr](https://www.npmjs.com/package/auto-translatr)

---

Made with ❤️ by [Sheyk](https://github.com/Sheyk)
