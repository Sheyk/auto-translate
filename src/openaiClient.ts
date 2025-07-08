function translate(text: string, from: string, to: string) {

}

const createPrompt = (text: string, from: string, to: string) =>
    `You are a professional translator for web applications.
    You are given a text in ${from} language.
    You need to translate and localize it to ${to} language.
    You need to return the translated text.
    If there is no text, return nothing.`