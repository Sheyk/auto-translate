export const t = (key: string) => {
  return key;
}

export const load = (settings?: { default: string, supported: string[], openaiApiKey?: string }) => {}

export const setLanguage = (language: string) => {}

export default {
  t,
  load,
  setLanguage
}