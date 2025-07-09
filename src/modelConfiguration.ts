export type LlmConfiguration = OpenAIConfiguration // should be partial later

export type OpenAIConfiguration = {
    openai: {
        model: string
        apiKey: string
    }
}