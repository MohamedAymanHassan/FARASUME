import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  try {
    console.log("Starting chat test...");
    const chat = ai.chats.create({
      model: 'gemini-3.1-pro-preview',
      config: {
        systemInstruction: 'You are a test assistant.',
        temperature: 0.7
      }
    });
    console.log("Chat created, sending message...");
    const stream = await chat.sendMessageStream({ message: 'Hello' });
    console.log("Got stream, reading chunks...");
    for await (const chunk of stream) {
      console.log('Chunk text:', chunk.text);
    }
    console.log("Done reading chunks");
  } catch (e) {
    console.error('ERROR OBJECT:', JSON.stringify(e, Object.getOwnPropertyNames(e)));
    console.error('ERROR MESSAGE:', e.message);
  }
}
test();
