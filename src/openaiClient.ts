export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

export async function prompt(text: string, model: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: text,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error: ${response.status} ${response.statusText}. ${
        errorData.error?.message || 'Unknown error'
      }`
    );
  }

  const data: OpenAIResponse = await response.json();
  
  if (data.error) {
    throw new Error(`OpenAI API error: ${data.error.message}`);
  }

  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from OpenAI API');
  }

  return data.choices[0].message.content;
}

