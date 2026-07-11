import Anthropic from '@anthropic-ai/sdk';

export interface LLMResponse {
  text: string;
  toolCalls: {
    id: string;
    name: string;
    input: any;
  }[];
}

let anthropicInstance: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicInstance) {
    anthropicInstance = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicInstance;
}

/**
 * Route request to LLM provider (Anthropic or Ollama) based on env variable LLM_PROVIDER
 * and return response in a unified format.
 *
 * @param systemPrompt System instructions for the LLM.
 * @param userMessage Message content from the user.
 * @param tools Array of Anthropic tool definitions.
 * @returns Unified response containing text and tool calls.
 */
export async function callLLM(
  systemPrompt: string,
  userMessage: string,
  tools: Anthropic.Tool[],
  toolChoice?: any
): Promise<LLMResponse> {
  const provider = (process.env.LLM_PROVIDER || 'anthropic').toLowerCase();

  if (provider === 'anthropic') {
    const params: Anthropic.MessageCreateParams = {
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    };

    if (tools && tools.length > 0) {
      params.tools = tools;
      if (toolChoice) {
        params.tool_choice = toolChoice;
      }
    }

    const response = await getAnthropicClient().messages.create(params);

    let text = '';
    const toolCalls: LLMResponse['toolCalls'] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        text += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input,
        });
      }
    }

    return { text, toolCalls };
  } else if (provider === 'ollama') {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:latest';

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    const body: any = {
      model: ollamaModel,
      messages: messages,
      stream: false,
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      }));
    }

    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Ollama API error: ${res.statusText} - ${errorText}`);
    }

    const data = await res.json();

    const text = data.message?.content || '';
    const toolCalls: LLMResponse['toolCalls'] = [];

    if (data.message?.tool_calls) {
      for (const [index, tc] of data.message.tool_calls.entries()) {
        if (tc.function) {
          let args = tc.function.arguments;
          if (typeof args === 'string') {
            try {
              args = JSON.parse(args);
            } catch (e) {
              console.error('Failed to parse Ollama tool arguments:', args);
            }
          }
          toolCalls.push({
            id: tc.id || `ollama-tc-${index}-${Date.now()}`,
            name: tc.function.name,
            input: args,
          });
        }
      }
    }

    return { text, toolCalls };
  } else {
    throw new Error(`Unsupported LLM provider: ${provider}. Supported providers: 'anthropic', 'ollama'.`);
  }
}
