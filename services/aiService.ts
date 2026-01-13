
import { GoogleGenAI, Modality } from "@google/genai";
import { decodeBase64, decodeAudioData } from "./audioUtils";
import { AppSettings } from "../types";
import { logger } from "./logService";

// Helper for retry logic
async function withRetry<T>(operation: () => Promise<T>, retries = 1, delay = 1000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const isNetworkError = error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('network'));
    const isServerError = error.status && (error.status >= 500 && error.status < 600);
    
    if (retries > 0 && (isNetworkError || isServerError)) {
      logger.warn(`API call failed, retrying... (${retries} attempts left)`, { error: error.message });
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

// --- Management Functions ---

export const fetchModelsFromProvider = async (settings: AppSettings): Promise<string[]> => {
  const { provider, apiKey, baseUrl } = settings.llm;
  logger.info(`Fetching LLM models`, { provider, baseUrl });

  if (!apiKey) {
    logger.warn("LLM API Key missing during fetchModels");
    throw new Error(settings.language === 'zh-CN' ? "请先填写 API Key" : "API Key is required");
  }

  if (provider === 'openai') {
    const url = baseUrl ? `${baseUrl.replace(/\/$/, '')}/models` : 'https://api.openai.com/v1/models';
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      
      if (!res.ok) {
        const errText = await res.text();
        logger.warn(`LLM fetch models failed`, { status: res.status, body: errText });
        // Fallback for LLM models if list fails
        return ['gpt-3.5-turbo', 'gpt-4o', 'deepseek-chat', 'deepseek-ai/DeepSeek-V3']; 
      }

      const data = await res.json();
      if (Array.isArray(data.data)) {
        const models = data.data.map((m: any) => m.id).sort();
        logger.info(`Fetched ${models.length} LLM models`);
        return models;
      } else {
        throw new Error("Invalid response format");
      }
    } catch (e: any) {
      logger.error("Fetch LLM Models Error, using fallbacks", e);
      return ['gpt-3.5-turbo', 'gpt-4o', 'deepseek-chat', 'deepseek-ai/DeepSeek-V3'];
    }
  } 
  
  if (provider === 'gemini') {
    return [
      'gemini-3-flash-preview',
      'gemini-3-pro-preview',
      'gemini-2.5-flash-latest',
      'gemini-2.5-flash-image'
    ];
  }

  return [];
};

export const fetchTTSModels = async (settings: AppSettings): Promise<string[]> => {
  const { provider, apiKey, baseUrl } = settings.tts;
  logger.info(`Fetching TTS models`, { provider, baseUrl });
  
  let effectiveKey = apiKey;
  if (!effectiveKey && settings.llm.provider === provider) {
      effectiveKey = settings.llm.apiKey;
  }

  if (provider === 'gemini') {
      return ['gemini-2.5-flash-preview-tts'];
  }

  if (provider === 'openai') {
      const fallbackModels = ['tts-1', 'tts-1-hd', 'fish-speech-1.5', 'fish-speech-1.4', 'fish-speech-1.2'];

      if (!effectiveKey && !baseUrl) return fallbackModels;
      
      const cleanBaseUrl = baseUrl ? baseUrl.replace(/\/$/, '') : 'https://api.openai.com/v1';
      const url = `${cleanBaseUrl}/models`;

      try {
        const res = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${effectiveKey}` }
        });
        
        if (!res.ok) {
            const errText = await res.text();
            logger.warn(`Fetch TTS models failed`, { status: res.status, body: errText });
            return fallbackModels;
        }
        
        const data = await res.json();
        if (Array.isArray(data.data)) {
            const models = data.data.map((m: any) => m.id).filter((id: string) => 
                id.toLowerCase().includes('tts') || 
                id.toLowerCase().includes('speech') || 
                id.toLowerCase().includes('audio') ||
                id.toLowerCase().includes('fish')
            ).sort();
            logger.info(`Fetched ${models.length} TTS models`);
            return models.length > 0 ? models : fallbackModels;
        }
        return fallbackModels;
      } catch (e: any) {
          logger.warn("Fetch TTS Models Network Error, using fallbacks", e);
          return fallbackModels;
      }
  }

  return [];
};

export const fetchTTSVoices = async (settings: AppSettings): Promise<string[]> => {
    logger.info("Fetching TTS Voices", { provider: settings.tts.provider });
    if (settings.tts.provider === 'gemini') {
        return ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];
    }
    
    // Robust defaults for OpenAI/SiliconFlow including typical Fish Audio voices
    // Expanded to include full IDs for providers like SiliconFlow/CosyVoice
    const defaultVoices = [
        'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', // OpenAI
        // Fish Audio (Full IDs)
        'fishaudio/fish-speech-1.5:alex',
        'fishaudio/fish-speech-1.5:anna',
        'fishaudio/fish-speech-1.5:bella',
        'fishaudio/fish-speech-1.5:benjamin',
        'fishaudio/fish-speech-1.5:charles',
        'fishaudio/fish-speech-1.5:claire',
        'fishaudio/fish-speech-1.5:david',
        'fishaudio/fish-speech-1.5:dinah',
        // CosyVoice (Full IDs)
        'FunAudioLLM/CosyVoice2-0.5B:anna',
        'FunAudioLLM/CosyVoice2-0.5B:isabella',
        'FunAudioLLM/CosyVoice2-0.5B:ralph',
        'FunAudioLLM/CosyVoice2-0.5B:benjamin',
        // Short names fallback
        'alex', 'anna', 'bella', 'benjamin', 'charles', 'claire', 'david', 'dinah'
    ];

    if (settings.tts.provider === 'openai') {
        const { baseUrl, apiKey } = settings.tts;
        const effectiveKey = apiKey || (settings.llm.provider === 'openai' ? settings.llm.apiKey : '');
        
        if (baseUrl && effectiveKey) {
            const cleanBase = baseUrl.replace(/\/$/, '');
            // Try various standard and non-standard voice endpoints
            const endpoints = [
                `${cleanBase}/audio/voices`, 
                `${cleanBase}/voices`, 
                `${cleanBase}/v1/audio/voices`,
                `${cleanBase}/v1/voices` 
            ];
            
            for (const url of endpoints) {
                try {
                    const res = await fetch(url, {
                        headers: { 'Authorization': `Bearer ${effectiveKey}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        let voices: any[] = [];
                        
                        if (Array.isArray(data)) voices = data;
                        else if (data && Array.isArray(data.voices)) voices = data.voices;
                        else if (data && Array.isArray(data.data)) voices = data.data;

                        if (voices.length > 0) {
                            const found = voices.map((v: any) => {
                                if (typeof v === 'string') return v;
                                return v.id || v.name; 
                            }).filter(Boolean);
                            logger.info(`Fetched ${found.length} voices from ${url}`);
                            return found;
                        }
                    }
                } catch (e) {
                    // Ignore individual endpoint failures
                }
            }
        }
        logger.warn("Could not fetch voices remotely, using defaults");
        return defaultVoices;
    }
    return [];
};

export const testLLMConnection = async (settings: AppSettings): Promise<string> => {
   const { provider, apiKey, baseUrl, model } = settings.llm;
   logger.info("Testing LLM Connection", { provider, model, baseUrl });

   if (!apiKey) throw new Error("API Key Missing");

   const testPrompt = "Hello";

   if (provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: model || 'gemini-3-flash-preview',
        contents: testPrompt,
      });
      return response.text || "OK";
   } else if (provider === 'openai') {
      const url = baseUrl ? `${baseUrl.replace(/\/$/, '')}/chat/completions` : 'https://api.openai.com/v1/chat/completions';
      const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'gpt-3.5-turbo',
            messages: [{ role: "user", content: testPrompt }],
            max_tokens: 5
          })
      });
      if (!res.ok) {
         const err = await res.json().catch(() => ({}));
         const errMsg = `HTTP ${res.status}: ${err.error?.message || res.statusText}`;
         logger.error("LLM Connection Test Failed", { status: res.status, error: err });
         throw new Error(errMsg);
      }
      return "OK";
   }
   return "Unknown Provider";
}

export const testTTSConnection = async (settings: AppSettings): Promise<string> => {
    const { provider, apiKey, baseUrl, model, voice } = settings.tts;
    logger.info("Testing TTS Connection", { provider, model, voice, baseUrl });

    const effectiveKey = apiKey || settings.llm.apiKey;
    if (!effectiveKey) throw new Error("API Key Missing");

    if (provider === 'gemini') {
        try {
            const ai = new GoogleGenAI({ apiKey: effectiveKey });
            const response = await ai.models.generateContent({
                model: model || "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: "Test" }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voice || 'Kore' }, 
                        },
                    },
                },
            });
            const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!data) throw new Error("No audio returned");
            return "OK";
        } catch (e: any) {
             logger.error("Gemini TTS Test Failed", e);
             throw e;
        }
    } 
    else if (provider === 'openai') {
        const url = baseUrl ? `${baseUrl.replace(/\/$/, '')}/audio/speech` : 'https://api.openai.com/v1/audio/speech';
        const body = {
            model: model || 'tts-1',
            input: 'Hello',
            voice: voice || 'alloy'
        };
        logger.info("Sending TTS Request", { url, body });

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${effectiveKey}`
            },
            body: JSON.stringify(body)
        });
        
        if (!res.ok) {
            const errText = await res.text();
            let errMsg = errText.substring(0, 200);
            let jsonErr: any = {};
            
            try {
                jsonErr = JSON.parse(errText);
                if (jsonErr.error?.message) errMsg = jsonErr.error.message;
                // Specific handling for SiliconFlow/FishAudio invalid voice
                if (jsonErr.code === 20047 || (jsonErr.message && jsonErr.message.includes("Invalid voice"))) {
                    errMsg = `Invalid Voice: '${voice}' is not supported by model '${model}'. Try: alex, anna, bella, etc.`;
                }
            } catch {}
            
            // Limit raw error length to avoid issues
            logger.error("TTS Test Failed", { 
                status: res.status, 
                response: jsonErr, 
                raw: errText.length > 500 ? errText.substring(0, 500) + '...' : errText 
            });
            throw new Error(errMsg);
        }
        
        const blob = await res.blob();
        if (blob.size === 0) throw new Error("Empty audio received");
        return "OK";
    }
    return "Unknown Provider";
};

// --- Text Summarization ---

export const summarizeArticles = async (text: string, settings: AppSettings): Promise<string> => {
  const { provider, apiKey, baseUrl, model } = settings.llm;
  logger.info("Starting Summary Generation", { provider, model, inputLength: text.length });

  if (!apiKey) throw new Error(settings.language === 'zh-CN' ? "请在设置中配置文本生成 API Key" : "Please configure LLM API Key in settings");

  const systemPrompt = settings.language === 'zh-CN' 
    ? `你是一位资深科技主编。请启动【深度解构模式】，将输入内容转化为一份详尽的【深度分析报告】，供专业广播播报使用。

核心原则：
1. 【零开场白】严禁使用“好的”、“收到”、“这是一份...”或“根据您的要求...”等任何开场白或客套话。必须直接开始输出正文内容。
2. 【深度还原】彻底放弃“摘要”或“概括”的思维。你的任务是提取并重组原文中所有的关键事实、具体数据指标、技术细节、背景逻辑和人物观点。
3. 【严禁精简】禁止为了篇幅而删除细节。如果原文提到了具体的参数（如 3.5GHz）、金额（如 100亿美元）、时间线或特定名词，必须在报告中完整呈现，不得模糊处理。
4. 【逻辑重构】不要简单罗列。要将碎片化的信息串联成一条逻辑严密、深度递进的叙事链条，像一篇深度特稿一样引人入胜。
5. 【广播风格】输出必须是适合朗读的口语化文稿。虽然内容硬核，但语言要流畅自然，避免生硬的翻译腔或过度书面化的表达。
6. 【拒绝套话】严禁使用“总而言之”、“综上所述”、“即使...也...”等陈词滥调来强行总结。报告应自然结束于最后一个关键信息的呈现。
7. 【统一语言】无论原文是何种语言，必须输出简体中文。
8. 【重点高亮】请识别文本中最重要、最震撼、或最具洞察力的词语和短句（大约占全文的 10%），并用 Markdown 的粗体语法（即用 ** 包裹）将它们标记出来。注意：不要改变原文的段落结构，保持文章的自然流畅阅读感。

目标：输出一篇信息密度极高、逻辑严密且细节丰富的深度报道，而非简报。`
    : `You are a professional news anchor. Summarize the following text into a coherent, engaging script suitable for oral broadcasting.
       Requirements: 
       1. Start directly with the content. Do NOT use introductory phrases like "Okay", "Here is", or "Sure".
       2. Identify the most important, shocking, or insightful words and short phrases (about 10% of the total text) and mark them using Markdown bold syntax (**text**).
       3. Maintain a professional yet friendly tone, like a radio host.
       4. Please dynamically adjust the length of the summary based on the total word count and information density of the input text. If the input article is long and detailed, provide a comprehensive summary covering all key points; if the input is short, provide a concise summary. The goal is to retain the most value while ensuring a natural flow.`;

  if (provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey });
    try {
      return await withRetry(async () => {
        const response = await ai.models.generateContent({
          model: model || 'gemini-3-flash-preview',
          contents: `${systemPrompt}\n\n输入文本/Input Text:\n${text}`,
          config: { temperature: 0.7 }
        });
        logger.info("Gemini Summary Success");
        return response.text || "";
      });
    } catch (e: any) {
      logger.error("Gemini LLM Error", e);
      throw new Error(`Gemini Error: ${e.message}`);
    }
  } 
  
  else if (provider === 'openai') {
    const url = baseUrl ? `${baseUrl.replace(/\/$/, '')}/chat/completions` : 'https://api.openai.com/v1/chat/completions';
    
    try {
      return await withRetry(async () => {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'gpt-3.5-turbo',
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: text }
            ],
            temperature: 0.7,
            stream: false
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          logger.error("LLM Generation Failed", { status: res.status, error: errData });
          throw new Error(`API Error ${res.status}: ${errData.error?.message || res.statusText}`);
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || "";
        logger.info("LLM Generation Success", { resultLength: content.length });
        return content;
      });
    } catch (e: any) {
      logger.error("OpenAI/SiliconFlow LLM Error", e);
      throw new Error(`API Error: ${e.message}`);
    }
  }

  throw new Error("Unknown provider");
};

// --- Speech Generation ---

export const generateSpeech = async (text: string, audioContext: AudioContext, settings: AppSettings): Promise<AudioBuffer> => {
  logger.info("Starting Speech Generation", { provider: settings.tts.provider, model: settings.tts.model, voice: settings.tts.voice });

  if (settings.tts.provider === 'browser') {
    return new Promise((resolve, reject) => {
      reject("浏览器原生语音暂不支持波形可视化，请使用 Gemini TTS 获得最佳体验。");
    });
  }

  const effectiveKey = settings.tts.apiKey || settings.llm.apiKey;
  if (!effectiveKey) throw new Error(settings.language === 'zh-CN' ? "请配置 TTS API Key" : "Please configure TTS API Key");

  // Safety truncation
  const MAX_CHARS = 4096;
  if (text.length > MAX_CHARS) {
     logger.warn(`Input text too long (${text.length} chars), truncating to ${MAX_CHARS}`);
     text = text.substring(0, MAX_CHARS);
  }

  if (settings.tts.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: effectiveKey });

    try {
      const response = await withRetry(async () => {
        return await ai.models.generateContent({
          model: settings.tts.model || "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: text }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: settings.tts.voice || 'Kore' }, 
              },
            },
          },
        });
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio data received");

      const audioBytes = decodeBase64(base64Audio);
      return await decodeAudioData(audioBytes, audioContext, 24000, 1);
      
    } catch (error: any) {
      logger.error("Gemini TTS Error", error);
      throw new Error(`Gemini TTS Error: ${error.message}`);
    }
  }

  if (settings.tts.provider === 'openai') {
     const url = settings.tts.baseUrl 
        ? `${settings.tts.baseUrl.replace(/\/$/, '')}/audio/speech` 
        : 'https://api.openai.com/v1/audio/speech';
     
     try {
        const response = await withRetry(async () => {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${effectiveKey}`
                },
                body: JSON.stringify({
                    model: settings.tts.model || 'tts-1',
                    input: text,
                    voice: settings.tts.voice || 'alloy'
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                let errMsg = errText;
                try {
                   const json = JSON.parse(errText);
                   if (json.error?.message) errMsg = json.error.message;
                   // Handle specific 400 Invalid voice
                   if (json.code === 20047 || (json.message && json.message.includes("Invalid voice"))) {
                       errMsg = `Invalid Voice: '${settings.tts.voice}'. Valid examples: alex, anna, bella, claire, david...`;
                   }
                } catch {}
                
                logger.error("OpenAI TTS Failed", { status: res.status, body: errText });
                throw new Error(errMsg);
            }
            return res;
        });

        const arrayBuffer = await response.arrayBuffer();
        return await audioContext.decodeAudioData(arrayBuffer);

     } catch (error: any) {
         logger.error("TTS Execution Error", error);
         throw new Error(`TTS API Error: ${error.message}`);
     }
  }

  throw new Error("Unknown TTS Provider");
};
