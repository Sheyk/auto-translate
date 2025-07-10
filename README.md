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
npm install -g auto-translate
```

### Local Installation (Project)

```bash
npm install auto-translate
# or
yarn add auto-translate
# or
pnpm add auto-translate
```

## 🚀 Quick Start

1. **Set your OpenAI API Key**:

   ```bash
   export OPENAI_API_KEY="your-openai-api-key-here"
   ```

2. **Run the tool**:

   ```bash
   # If installed globally
   auto-translate

   # If installed locally
   npx auto-translate
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

## ⚙️ Configuration

### Settings File: `auto-translate.settings.json`

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

## 📚 Usage Examples

### Basic CLI Usage

```bash
# Run with default settings
auto-translate

# Run with specific settings file location
auto-translate --config ./my-settings.json
```

### Programmatic Usage

```javascript
import { run } from 'auto-translate'

// Run with default settings
await run()

// Or configure programmatically
import { parseCodeBaseTranslations } from 'auto-translate'

const settings = {
  default: 'en',
  supported: ['en', 'es', 'pt'],
  output: 'translations',
  include: ['.js', '.ts'],
  ignore: ['node_modules'],
  openai: {
    model: 'gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY
  }
}

await parseCodeBaseTranslations(settings)
```

### Different Translation Function Names

The tool currently looks for `t('...')` calls. If you use a different function name, you can:

1. **Wrapper Function** (Recommended):

   ```javascript
   // Your existing translation function
   const translate = (key) => {
     /* your logic */
   }

   // Add a wrapper for auto-translate to find
   const t = (key) => translate(key)
   ```

2. **Alias Your Function**:

   ```javascript
   import { useTranslation } from 'react-i18next'

   const MyComponent = () => {
     const { t: translate } = useTranslation()
     const t = translate // Alias for auto-translate

     return <div>{t('Hello')}</div>
   }
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
├── auto-translate.settings.json    # Configuration file
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
    "translate": "auto-translate",
    "translate:check": "auto-translate --dry-run",
    "build": "auto-translate && next build"
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
DEBUG=auto-translate* auto-translate
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

```bash
git clone https://github.com/Sheyk/auto-translate.git
cd auto-translate
npm install
npm run test
npm run build
```

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Repository**: [https://github.com/Sheyk/auto-translate](https://github.com/Sheyk/auto-translate)
- **Issues**: [https://github.com/Sheyk/auto-translate/issues](https://github.com/Sheyk/auto-translate/issues)
- **NPM Package**: [https://www.npmjs.com/package/auto-translate](https://www.npmjs.com/package/auto-translate)

---

Made with ❤️ by [Sheyk](https://github.com/Sheyk)
