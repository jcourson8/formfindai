import {
  UIMessage,
  appendResponseMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';
import { auth } from '@/app/(auth)/auth';
// import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  getTrailingMessageId,
} from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';

export const maxDuration = 60;

const systemPrompt = () => {
  return `You are FormFind, a furniture design AI focused on generating visual designs.

  PRIMARY FOCUS:
  - Generate furniture design images immediately when requested
  - Create photorealistic furniture based on user specifications
  - Help users find similar purchasable products matching their design interests

  APPROACH:
  - Prioritize visual output over lengthy explanations
  - Generate designs directly without excessive text descriptions
  - Only provide detailed design rationales when specifically asked
  - Keep responses brief and focused on the visual output

  When analyzing user-provided images, identify key design elements and offer relevant shopping suggestions.
  
  Your main goal is to help users visualize furniture designs and find real products to purchase.`;
};

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      selectedChatModel,
    }: {
      id: string;
      messages: Array<UIMessage>;
      selectedChatModel: string;
    } = await request.json();

    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });

      await saveChat({ id, userId: session.user.id, title });
    } else {
      if (chat.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: userMessage.id,
          role: 'user',
          parts: userMessage.parts,
          attachments: userMessage.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    // Create a copy of messages to avoid modifying the original array
    const messagesWithInstructions = [...messages];
    
    // Add role instructions if this appears to be a new conversation or just starting
    // This is determined either by having only one message or checking if this is the first user message
    if (messagesWithInstructions.length <= 2) {
      const userMsgIndex = messagesWithInstructions.findIndex(msg => msg.role === 'user');
      
      if (userMsgIndex !== -1) {
        const userMsg = messagesWithInstructions[userMsgIndex];
        
        // If userMsg.content is a string, prepend the system prompt
        if (typeof userMsg.content === 'string') {
          userMsg.content = `${systemPrompt()}\n\nUser says: ${userMsg.content}`;
        } else if (Array.isArray(userMsg.parts)) {
          // For parts array, prepend the system prompt to the first text part
          const firstTextPartIndex = userMsg.parts.findIndex(p => 
            typeof p === 'object' && 'text' in p && typeof p.text === 'string'
          );
          
          if (firstTextPartIndex !== -1) {
            const part = userMsg.parts[firstTextPartIndex];
            if (typeof part === 'object' && 'text' in part) {
              part.text = `${systemPrompt()}\n\nUser says: ${part.text}`;
            }
          }
        }
      }
    }

    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          messages: messagesWithInstructions,
          // maxSteps: 5,
          providerOptions: {
            google: { 
              responseModalities: ['TEXT', 'IMAGE'],
            }
          },
          // experimental_activeTools:
          //   selectedChatModel === 'chat-model-reasoning'
          //     ? []
          //     : [
          //         'getWeather',
          //         'createDocument',
          //         'updateDocument',
          //         'requestSuggestions',
          //       ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          // tools: {
          //   getWeather,
          //   createDocument: createDocument({ session, dataStream }),
          //   updateDocument: updateDocument({ session, dataStream }),
          //   requestSuggestions: requestSuggestions({
          //     session,
          //     dataStream,
          //   }),
          // },
          onFinish: async ({ response }) => {
            if (session.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [userMessage],
                  responseMessages: response.messages,
                });

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                });
              } catch (_) {
                console.error('Failed to save chat');
              }
            }
          },
          // experimental_telemetry: {
          //   isEnabled: isProductionEnvironment,
          //   functionId: 'stream-text',
          // },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: (error) => {
        console.error('Streaming error:', error);
        
        // Create an error handler function to properly format the error
        const errorHandler = (error: unknown) => {
          if (error == null) {
            return 'Unknown error occurred';
          }
          
          if (typeof error === 'string') {
            return error;
          }
          
          if (error instanceof Error) {
            return `Error: ${error.message}`;
          }
          
          return JSON.stringify(error);
        };
        
        return errorHandler(error);
      },
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return new Response('An error occurred while processing your request!', {
      status: 404,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    console.error('Error in delete chat route:', error);
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}
