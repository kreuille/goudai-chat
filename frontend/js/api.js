// Clés API — déclarées ici (var pour éviter les conflits cross-scripts)
// Chargées depuis localStorage, configurables via la modale Config
var API_KEYS = {
    openai: '',
    anthropic: '',
    google: '',
    perplexity: '',
    mistral: '',
    grok: '',
    deepseek: '',
    zai: '',         // Zhipu AI (GLM-5/5.1/4.7) — endpoint OpenAI-compatible
    openrouter: ''   // OpenRouter (Flux 2 image models) — wiring image dans une PR ulterieure
};

// Modèles et tarifs — chargés depuis models.json par loadModels()
let MODELS = [];
let SEARCH_MODELS = [];
let IMAGE_MODELS = [];
let TARIFS = {};
let IMAGE_TARIFS = {};
let SEARCH_TARIFS = {};

function getSearchTarif(model) {
    return SEARCH_TARIFS[model] || null;
}

function getSearchModelEditeur(modelId) {
    const m = SEARCH_MODELS.find(m => m.id === modelId);
    return m ? m.editeur : null;
}

function getImageTarif(model) {
    return IMAGE_TARIFS[model] || null;
}

function getImageModelEditeur(modelId) {
    const m = IMAGE_MODELS.find(m => m.id === modelId);
    return m ? m.editeur : null;
}


function loadApiKeys() {
    try {
        const stored = localStorage.getItem('goudai-apikeys');
        if (stored) {
            const parsed = JSON.parse(stored);
            Object.assign(API_KEYS, parsed);
        }
    } catch (e) {}
}

function saveApiKeys(keys) {
    Object.assign(API_KEYS, keys);
    localStorage.setItem('goudai-apikeys', JSON.stringify(API_KEYS));
    // Sync serveur (async, non bloquant)
    if (typeof saveApiKeysRemote === 'function') {
        saveApiKeysRemote(keys).catch(() => {});
    }
}

function loadModels() {
    const data = MODELS_DATA;
    // Modèles texte
    if (data.text) {
        MODELS = data.text.map(m => ({ id: m.id, label: m.label, editeur: m.editeur }));
        for (const m of data.text) {
            TARIFS[m.id] = { editeur: m.editeur, inputPer1M: m.inputPer1M, outputPer1M: m.outputPer1M };
        }
    }
    // Modèles image
    if (data.image) {
        IMAGE_MODELS = data.image.map(m => ({ id: m.id, label: m.label, editeur: m.editeur }));
        for (const m of data.image) {
            IMAGE_TARIFS[m.id] = { editeur: m.editeur, inputPer1M: m.inputPer1M, outputPer1M: m.outputPer1M, imageOutput: m.imageOutput };
        }
    }
    // Modèles recherche
    if (data.search) {
        SEARCH_MODELS = data.search.map(m => ({ id: m.id, label: m.label, editeur: m.editeur }));
        for (const m of data.search) {
            SEARCH_TARIFS[m.id] = { editeur: m.editeur, inputPer1M: m.inputPer1M, outputPer1M: m.outputPer1M };
        }
    }
}

function getTarif(model) {
    return TARIFS[model] || null;
}

function getModelEditeur(modelId) {
    const m = MODELS.find(m => m.id === modelId);
    return m ? m.editeur : null;
}

async function initConfig() {
    loadApiKeys();
    loadModels();
}

// --- Convertir les messages internes vers le format de chaque provider ---
function formatMessagesForProvider(conversationHistory, editeur) {
    return conversationHistory.filter(m => m.role !== 'system').map(msg => {
        // Message texte simple
        if (typeof msg.content === 'string') {
            if (editeur === 'google') {
                return {
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                };
            }
            if (editeur === 'openai') {
                const textType = msg.role === 'assistant' ? 'output_text' : 'input_text';
                return {
                    role: msg.role,
                    content: [{ type: textType, text: msg.content }]
                };
            }
            // anthropic
            return { role: msg.role, content: msg.content };
        }

        // Message multimodal (array)
        if (Array.isArray(msg.content)) {
            if (editeur === 'openai' || editeur === 'perplexity') {
                const textType = msg.role === 'assistant' ? 'output_text' : 'input_text';
                const content = [];
                for (const part of msg.content) {
                    if (part.type === 'text') {
                        content.push({ type: textType, text: part.text });
                    } else if (part.type === 'image') {
                        const dataUrl = part.dataUrl || `data:${part.mimeType};base64,${part.data}`;
                        content.push({ type: 'input_image', image_url: dataUrl });
                    } else if (part.type === 'file') {
                        const fileText = part.textContent || '';
                        content.push({ type: textType, text: `--- Contenu du fichier joint : ${part.name} ---\n${fileText}\n--- Fin du fichier ---` });
                    }
                }
                return { role: msg.role, content };
            }

            if (editeur === 'anthropic') {
                const content = [];
                for (const part of msg.content) {
                    if (part.type === 'text') {
                        content.push({ type: 'text', text: part.text });
                    } else if (part.type === 'image') {
                        content.push({
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: part.mimeType,
                                data: part.data
                            }
                        });
                    } else if (part.type === 'file') {
                        if (part.mimeType === 'application/pdf') {
                            content.push({
                                type: 'document',
                                source: {
                                    type: 'base64',
                                    media_type: 'application/pdf',
                                    data: part.data
                                }
                            });
                        } else {
                            content.push({ type: 'text', text: `--- Contenu du fichier joint : ${part.name} ---\n${part.textContent || ''}\n--- Fin du fichier ---` });
                        }
                    }
                }
                return { role: msg.role, content };
            }

            if (editeur === 'google') {
                const parts = [];
                for (const part of msg.content) {
                    if (part.type === 'text') {
                        parts.push({ text: part.text });
                    } else if (part.type === 'image') {
                        parts.push({
                            inline_data: {
                                mime_type: part.mimeType,
                                data: part.data
                            }
                        });
                    } else if (part.type === 'file') {
                        if (part.mimeType === 'application/pdf') {
                            parts.push({
                                inline_data: {
                                    mime_type: 'application/pdf',
                                    data: part.data
                                }
                            });
                        } else {
                            parts.push({ text: `--- Contenu du fichier joint : ${part.name} ---\n${part.textContent || ''}\n--- Fin du fichier ---` });
                        }
                    }
                }
                return {
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts
                };
            }
        }

        // Fallback
        return { role: msg.role, content: msg.content };
    });
}

// --- Parser <think>...</think> (Kiro v3 - PR2) ---
// Factory reutilisable : extrait les blocs <think>...</think> du flux streame
// (DeepSeek R1, GLM-5/5.1, certains Mistral/Perplexity). Renvoie 2 fonctions :
//   process(delta) -> { text, events: [{type:'thinking'|'chunk', data}] }
//   flush()        -> events residuels (a appeler en fin de stream)
// Note PR2 : la fonction est definie ici pour usage futur (PR de refactor des
// parsers inline dans streamPerplexity/streamOpenAICompat). Pas de call-site
// modifie dans cette PR pour eviter tout changement de comportement.
function createThinkTagParser() {
    let inThinkBlock = false;
    let thinkBuffer = '';
    function process(delta) {
        const events = [];
        let text = '';
        thinkBuffer += delta;
        while (thinkBuffer.length > 0) {
            if (inThinkBlock) {
                const endIdx = thinkBuffer.indexOf('</think>');
                if (endIdx !== -1) {
                    events.push({ type: 'thinking', data: thinkBuffer.substring(0, endIdx) });
                    thinkBuffer = thinkBuffer.substring(endIdx + 8);
                    inThinkBlock = false;
                } else {
                    if (thinkBuffer.length > 8) {
                        events.push({ type: 'thinking', data: thinkBuffer.substring(0, thinkBuffer.length - 8) });
                        thinkBuffer = thinkBuffer.substring(thinkBuffer.length - 8);
                    }
                    break;
                }
            } else {
                const startIdx = thinkBuffer.indexOf('<think>');
                if (startIdx !== -1) {
                    if (startIdx > 0) text += thinkBuffer.substring(0, startIdx);
                    thinkBuffer = thinkBuffer.substring(startIdx + 7);
                    inThinkBlock = true;
                } else {
                    if (thinkBuffer.length > 7) {
                        text += thinkBuffer.substring(0, thinkBuffer.length - 7);
                        thinkBuffer = thinkBuffer.substring(thinkBuffer.length - 7);
                    }
                    break;
                }
            }
        }
        return { text, events };
    }
    function flush() {
        const events = [];
        if (thinkBuffer && !inThinkBlock) events.push({ type: 'chunk', data: thinkBuffer });
        thinkBuffer = '';
        return events;
    }
    return { process, flush };
}

// --- Reasoning effort utilities (Kiro v3 - PR2) ---
// Identifie quels modeles supportent un parametre 'reasoning_effort' et donne
// les niveaux disponibles. Utilises par PR4 (UI selecteur) et les PRs ulterieures
// qui wireront effectivement le parametre dans les requetes API par provider.
function supportsReasoningEffort(modelId) {
    if (!modelId) return false;
    // OpenAI : famille o1/o3/o4 + GPT-5
    if (/^(o1|o3|o4|gpt-5)/.test(modelId)) return true;
    // Anthropic : Claude Opus / Sonnet (adaptive thinking sur Opus 4.7+)
    if (/^claude-(opus|sonnet)/.test(modelId)) return true;
    // Google : Gemini Pro/Flash + Gemma 4
    if (/^(gemini-(?:pro|.*-pro|.*-flash)|gemma-4)/.test(modelId)) return true;
    // DeepSeek (toggle binaire : effort=high swap vers deepseek-reasoner)
    if (/^deepseek-(chat|reasoner)/.test(modelId)) return true;
    // Grok 4.20 reasoning (toggle binaire)
    if (/^grok-4\.20.*reasoning/.test(modelId)) return true;
    // GLM-5 / 5.1 (toggle binaire)
    if (/^glm-5(\.|$)/.test(modelId)) return true;
    return false;
}
function getEffortLevels(modelId) {
    if (!supportsReasoningEffort(modelId)) return [];
    // Toggle binaire (haut/bas) pour DeepSeek/Grok/GLM (pas de granularite intermediaire native)
    if (/^(deepseek|grok|glm-5)/.test(modelId)) return ['low', 'high'];
    // Anthropic, OpenAI, Google : niveaux pleins
    return ['minimal', 'low', 'medium', 'high'];
}

// --- Dispatcher : appeler le bon provider selon le modèle ---
// Signature etendue (Kiro v3 - PR2) : modelParams (optional) accepte les options
// avancees comme reasoning_effort, temperature, top_p... Pour l'instant les
// providers ne lisent pas encore modelParams (sera wired par PRs ulterieures).
function streamModel(modelId, conversationHistory, onChunk, onDone, onError, systemPrompt, webSearch, onThinkingChunk, signal, modelParams) {
    const editeur = getModelEditeur(modelId) || getSearchModelEditeur(modelId);
    switch (editeur) {
        case 'openai':
            return streamOpenAI(modelId, conversationHistory, onChunk, onDone, onError, systemPrompt, webSearch, onThinkingChunk, signal, modelParams);
        case 'anthropic':
            return streamAnthropic(modelId, conversationHistory, onChunk, onDone, onError, systemPrompt, webSearch, onThinkingChunk, signal, modelParams);
        case 'google':
            return streamGoogle(modelId, conversationHistory, onChunk, onDone, onError, systemPrompt, webSearch, onThinkingChunk, signal, modelParams);
        case 'perplexity':
            return streamPerplexity(modelId, conversationHistory, onChunk, onDone, onError, systemPrompt, onThinkingChunk, signal, modelParams);
        case 'mistral':
            return streamOpenAICompat(modelId, 'https://api.mistral.ai/v1/chat/completions', API_KEYS.mistral, conversationHistory, onChunk, onDone, onError, systemPrompt, onThinkingChunk, signal, false, modelParams);
        case 'grok':
            return streamOpenAICompat(modelId, 'https://api.x.ai/v1/chat/completions', API_KEYS.grok, conversationHistory, onChunk, onDone, onError, systemPrompt, onThinkingChunk, signal, false, modelParams);
        case 'deepseek':
            return streamOpenAICompat(modelId, 'https://api.deepseek.com/v1/chat/completions', API_KEYS.deepseek, conversationHistory, onChunk, onDone, onError, systemPrompt, onThinkingChunk, signal, true, modelParams);
        case 'zai':
            // Zhipu AI (GLM family). Compatible OpenAI Chat Completions.
            // hasThinkTags=true: les modeles GLM-5/5.1 emettent <think>...</think> en mode raisonnement.
            return streamOpenAICompat(modelId, 'https://api.z.ai/api/paas/v4/chat/completions', API_KEYS.zai, conversationHistory, onChunk, onDone, onError, systemPrompt, onThinkingChunk, signal, true, modelParams);
        default:
            onError(new Error(`Éditeur inconnu pour le modèle ${modelId}`));
    }
}

// ===================== OpenAI (API Responses) =====================
async function streamOpenAI(modelId, conversationHistory, onChunk, onDone, onError, systemPrompt, webSearch, onThinkingChunk, signal) {
    try {
        const input = formatMessagesForProvider(conversationHistory, 'openai');

        const body = {
            model: modelId,
            input,
            stream: true
        };
        if (systemPrompt) body.instructions = systemPrompt;
        if (webSearch) body.tools = [{ type: 'web_search_preview' }];
        // Activer le raisonnement : o-series et GPT-5.x
        if (modelId.startsWith('o3') || modelId.startsWith('o4') || modelId.startsWith('o1')) {
            body.reasoning = { summary: 'auto' };
        } else if (modelId.startsWith('gpt-5')) {
            body.reasoning = { effort: 'medium', summary: 'auto' };
        }

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEYS.openai}`
            },
            body: JSON.stringify(body),
            signal
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenAI API error ${response.status}: ${err}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let usage = null;
        let citations = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') { onDone(usage, citations); return; }
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.type === 'response.output_text.delta') onChunk(parsed.delta);
                    if (parsed.type === 'response.reasoning_summary_text.delta' && parsed.delta && onThinkingChunk) {
                        onThinkingChunk(parsed.delta);
                    }
                    if (parsed.type === 'response.completed' && parsed.response) {
                        if (parsed.response.usage) {
                            usage = {
                                input_tokens: parsed.response.usage.input_tokens || 0,
                                output_tokens: parsed.response.usage.output_tokens || 0
                            };
                        }
                        // Extraire les citations des annotations web_search
                        const output = parsed.response.output || [];
                        for (const item of output) {
                            const content = item.content || [];
                            for (const c of content) {
                                if (c.annotations) {
                                    for (const ann of c.annotations) {
                                        if (ann.type === 'url_citation' && ann.url) {
                                            if (!citations.some(ci => ci.url === ann.url)) {
                                                citations.push({ url: ann.url, title: ann.title || '' });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {}
            }
        }
        onDone(usage, citations);
    } catch (err) {
        if (err.name === 'AbortError') { onDone(null, []); return; }
        onError(err);
    }
}

// ===================== Anthropic (Messages API) =====================
async function streamAnthropic(modelId, conversationHistory, onChunk, onDone, onError, systemPrompt, webSearch, onThinkingChunk, signal) {
    try {
        const messages = formatMessagesForProvider(conversationHistory, 'anthropic');

        // Activer l'extended thinking pour Claude Opus et Sonnet
        const isThinkingModel = modelId.includes('opus') || modelId.includes('sonnet');
        const body = {
            model: modelId,
            max_tokens: isThinkingModel ? 16000 : 8192,
            messages,
            stream: true
        };
        if (isThinkingModel) {
            body.thinking = { type: 'enabled', budget_tokens: 10000 };
        }
        if (systemPrompt) body.system = systemPrompt;
        if (webSearch) body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEYS.anthropic,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify(body),
            signal
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Anthropic API error ${response.status}: ${err}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let usage = { input_tokens: 0, output_tokens: 0 };
        let citations = [];
        let currentBlockType = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                try {
                    const parsed = JSON.parse(data);
                    // Tracker le type de bloc courant
                    if (parsed.type === 'content_block_start') {
                        currentBlockType = parsed.content_block?.type || null;
                    }
                    if (parsed.type === 'content_block_delta') {
                        if (currentBlockType === 'thinking' && parsed.delta?.thinking && onThinkingChunk) {
                            onThinkingChunk(parsed.delta.thinking);
                        } else if (parsed.delta?.text) {
                            onChunk(parsed.delta.text);
                        }
                    }
                    // Extraire les citations des résultats web_search
                    if (parsed.type === 'content_block_start' && parsed.content_block?.type === 'web_search_tool_result') {
                        const results = parsed.content_block.content || [];
                        for (const r of results) {
                            if (r.type === 'web_search_result' && r.url) {
                                citations.push({ url: r.url, title: r.title || '' });
                            }
                        }
                    }
                    if (parsed.type === 'message_start' && parsed.message?.usage) {
                        usage.input_tokens = parsed.message.usage.input_tokens || 0;
                    }
                    if (parsed.type === 'message_delta' && parsed.usage) {
                        usage.output_tokens = parsed.usage.output_tokens || 0;
                    }
                } catch (e) {}
            }
        }
        onDone(usage, citations);
    } catch (err) {
        if (err.name === 'AbortError') { onDone(null, []); return; }
        onError(err);
    }
}

// ===================== Google Gemini (generateContent streaming) =====================
async function streamGoogle(modelId, conversationHistory, onChunk, onDone, onError, systemPrompt, webSearch, onThinkingChunk, signal) {
    try {
        const contents = formatMessagesForProvider(conversationHistory, 'google');

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${API_KEYS.google}`;

        const body = { contents };
        if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };
        if (webSearch) body.tools = [{ google_search: {} }];
        // Activer le thinking pour les modèles Pro
        if (modelId.includes('pro') || modelId.includes('flash')) {
            body.generationConfig = body.generationConfig || {};
            body.generationConfig.thinkingConfig = { includeThoughts: true };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Gemini API error ${response.status}: ${err}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let usage = { input_tokens: 0, output_tokens: 0 };
        let citations = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                try {
                    const parsed = JSON.parse(data);
                    // Extraire le texte et le thinking
                    const parts = parsed.candidates?.[0]?.content?.parts || [];
                    for (const part of parts) {
                        if (part.thought && part.text && onThinkingChunk) {
                            onThinkingChunk(part.text);
                        } else if (part.text) {
                            onChunk(part.text);
                        }
                    }
                    // Extraire l'usage
                    if (parsed.usageMetadata) {
                        if (parsed.usageMetadata.promptTokenCount)
                            usage.input_tokens = parsed.usageMetadata.promptTokenCount;
                        if (parsed.usageMetadata.candidatesTokenCount)
                            usage.output_tokens = parsed.usageMetadata.candidatesTokenCount;
                    }
                    // Extraire les citations du groundingMetadata
                    const grounding = parsed.candidates?.[0]?.groundingMetadata;
                    if (grounding?.groundingChunks) {
                        for (const chunk of grounding.groundingChunks) {
                            if (chunk.web?.uri) {
                                if (!citations.some(c => c.url === chunk.web.uri)) {
                                    citations.push({ url: chunk.web.uri, title: chunk.web.title || '' });
                                }
                            }
                        }
                    }
                } catch (e) {}
            }
        }
        onDone(usage, citations);
    } catch (err) {
        if (err.name === 'AbortError') { onDone(null, []); return; }
        onError(err);
    }
}

// ===================== Perplexity (Chat Completions API) =====================
async function streamPerplexity(modelId, conversationHistory, onChunk, onDone, onError, systemPrompt, onThinkingChunk, signal) {
    try {
        const messages = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        for (const msg of conversationHistory) {
            if (msg.role === 'system') continue;
            const text = typeof msg.content === 'string' ? msg.content
                : Array.isArray(msg.content) ? msg.content.map(p => {
                    if (p.type === 'text') return p.text;
                    if (p.type === 'file') return `--- Contenu du fichier joint : ${p.name} ---\n${p.textContent || ''}\n--- Fin du fichier ---`;
                    return '';
                }).filter(Boolean).join('\n') : '';
            messages.push({ role: msg.role, content: text });
        }

        const body = {
            model: modelId,
            messages,
            stream: true,
            return_citations: true
        };

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEYS.perplexity}`
            },
            body: JSON.stringify(body),
            signal
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Perplexity API error ${response.status}: ${err}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let usage = { input_tokens: 0, output_tokens: 0 };
        let citations = [];
        let inThinkBlock = false;
        let thinkBuffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') {
                    // Vider le thinkBuffer résiduel
                    if (thinkBuffer && !inThinkBlock) onChunk(thinkBuffer);
                    thinkBuffer = '';
                    onDone(usage, citations); return;
                }
                try {
                    const parsed = JSON.parse(data);
                    let delta = parsed.choices?.[0]?.delta?.content;
                    if (delta) {
                        // Parser les balises <think>...</think>
                        if (onThinkingChunk) {
                            thinkBuffer += delta;
                            delta = '';
                            while (thinkBuffer.length > 0) {
                                if (inThinkBlock) {
                                    const endIdx = thinkBuffer.indexOf('</think>');
                                    if (endIdx !== -1) {
                                        onThinkingChunk(thinkBuffer.substring(0, endIdx));
                                        thinkBuffer = thinkBuffer.substring(endIdx + 8);
                                        inThinkBlock = false;
                                    } else {
                                        // Garder les derniers caractères au cas où </think> est coupé
                                        if (thinkBuffer.length > 8) {
                                            onThinkingChunk(thinkBuffer.substring(0, thinkBuffer.length - 8));
                                            thinkBuffer = thinkBuffer.substring(thinkBuffer.length - 8);
                                        }
                                        break;
                                    }
                                } else {
                                    const startIdx = thinkBuffer.indexOf('<think>');
                                    if (startIdx !== -1) {
                                        if (startIdx > 0) delta += thinkBuffer.substring(0, startIdx);
                                        thinkBuffer = thinkBuffer.substring(startIdx + 7);
                                        inThinkBlock = true;
                                    } else {
                                        // Garder les derniers caractères au cas où <think> est coupé
                                        if (thinkBuffer.length > 7) {
                                            delta += thinkBuffer.substring(0, thinkBuffer.length - 7);
                                            thinkBuffer = thinkBuffer.substring(thinkBuffer.length - 7);
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                        if (delta) onChunk(delta);
                    }
                    if (parsed.citations && parsed.citations.length > 0) {
                        citations = parsed.citations;
                    }
                    if (parsed.usage) {
                        usage.input_tokens = parsed.usage.prompt_tokens || 0;
                        usage.output_tokens = parsed.usage.completion_tokens || 0;
                    }
                } catch (e) {}
            }
        }
        // Vider le thinkBuffer résiduel
        if (thinkBuffer && !inThinkBlock) onChunk(thinkBuffer);
        thinkBuffer = '';
        onDone(usage, citations);
    } catch (err) {
        if (err.name === 'AbortError') { onDone(null, []); return; }
        onError(err);
    }
}


// ── OpenAI-Compatible : Mistral / Grok / DeepSeek ────────────────
async function streamOpenAICompat(modelId, baseUrl, apiKey, conversationHistory, onChunk, onDone, onError, systemPrompt, onThinkingChunk, signal, hasThinkTags = false) {
    try {
        const messages = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        for (const msg of conversationHistory) {
            if (msg.role === 'system') continue;
            const text = typeof msg.content === 'string' ? msg.content
                : Array.isArray(msg.content) ? msg.content.map(p => p.type === 'text' ? p.text : '').filter(Boolean).join('\n') : '';
            messages.push({ role: msg.role, content: text });
        }
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
            body: JSON.stringify({ model: modelId, messages, stream: true }),
            signal
        });
        if (!response.ok) { const err = await response.text(); throw new Error('API error ' + response.status + ': ' + err); }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '', usage = { input_tokens: 0, output_tokens: 0 };
        let thinkBuffer = '', inThinkBlock = false;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n'); buffer = lines.pop();
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') { if (thinkBuffer && !inThinkBlock) onChunk(thinkBuffer); onDone(usage, []); return; }
                try {
                    const parsed = JSON.parse(data);
                    const reasoning = parsed.choices?.[0]?.delta?.reasoning_content;
                    if (reasoning && onThinkingChunk) onThinkingChunk(reasoning);
                    let delta = parsed.choices?.[0]?.delta?.content;
                    if (delta) {
                        if (hasThinkTags && onThinkingChunk) {
                            thinkBuffer += delta; delta = '';
                            while (thinkBuffer.length > 0) {
                                if (inThinkBlock) {
                                    const end = thinkBuffer.indexOf('</think>');
                                    if (end !== -1) { onThinkingChunk(thinkBuffer.substring(0, end)); thinkBuffer = thinkBuffer.substring(end + 8); inThinkBlock = false; }
                                    else { if (thinkBuffer.length > 8) { onThinkingChunk(thinkBuffer.substring(0, thinkBuffer.length - 8)); thinkBuffer = thinkBuffer.substring(thinkBuffer.length - 8); } break; }
                                } else {
                                    const start = thinkBuffer.indexOf('<think>');
                                    if (start !== -1) { if (start > 0) delta += thinkBuffer.substring(0, start); thinkBuffer = thinkBuffer.substring(start + 7); inThinkBlock = true; }
                                    else { if (thinkBuffer.length > 7) { delta += thinkBuffer.substring(0, thinkBuffer.length - 7); thinkBuffer = thinkBuffer.substring(thinkBuffer.length - 7); } break; }
                                }
                            }
                        }
                        if (delta) onChunk(delta);
                    }
                    if (parsed.usage) { usage.input_tokens = parsed.usage.prompt_tokens || 0; usage.output_tokens = parsed.usage.completion_tokens || 0; }
                } catch(e) {}
            }
        }
        if (thinkBuffer && !inThinkBlock) onChunk(thinkBuffer);
        onDone(usage, []);
    } catch(err) {
        if (err.name === 'AbortError') { onDone(null, []); return; }
        onError(err);
    }
}
// ===================== Génération d'images =====================

function generateImage(modelId, prompt, onDone, onError, referenceImages, signal, format) {
    const editeur = getImageModelEditeur(modelId);
    switch (editeur) {
        case 'openai':
            return generateImageOpenAI(modelId, prompt, onDone, onError, referenceImages, signal, format);
        case 'google':
            return generateImageGemini(modelId, prompt, onDone, onError, referenceImages, signal, format);
        default:
            onError(new Error(`Éditeur inconnu pour le modèle image ${modelId}`));
    }
}

async function generateImageOpenAI(modelId, prompt, onDone, onError, referenceImages, signal, format) {
    const sizeMap = { square: '1024x1024', vertical: '1024x1536', horizontal: '1536x1024' };
    const size = sizeMap[format] || '1024x1024';
    try {
        // S'il y a des images de référence, utiliser le Responses API (multimodal)
        if (referenceImages && referenceImages.length > 0) {
            const content = [];
            for (const img of referenceImages) {
                content.push({
                    type: 'input_image',
                    image_url: `data:${img.mimeType || 'image/png'};base64,${img.data}`
                });
            }
            content.push({ type: 'input_text', text: prompt });

            const response = await fetch('https://api.openai.com/v1/responses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEYS.openai}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    input: [{ role: 'user', content }],
                    tools: [{ type: 'image_generation', model: modelId, size }]
                }),
                signal
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`OpenAI Image API error ${response.status}: ${err}`);
            }

            const data = await response.json();
            const result = { text: '', images: [], usage: null, imageCount: 0 };

            if (data.usage) {
                result.usage = {
                    input_tokens: data.usage.input_tokens || 0,
                    output_tokens: data.usage.output_tokens || 0
                };
            }

            const output = data.output || [];
            for (const item of output) {
                // Résultat de l'outil image_generation (Responses API avec tools)
                if (item.type === 'image_generation_call' && item.result) {
                    result.images.push({ b64: item.result, mimeType: 'image/png' });
                    result.imageCount++;
                    continue;
                }
                // Réponse texte directe
                if (item.type === 'message') {
                    const itemContent = item.content || [];
                    for (const c of itemContent) {
                        if (c.type === 'output_text' && c.text) {
                            result.text += c.text;
                        }
                        if (c.type === 'image' && c.image_url) {
                            const match = c.image_url.match(/^data:([^;]+);base64,(.+)$/);
                            if (match) {
                                result.images.push({ b64: match[2], mimeType: match[1] });
                            } else {
                                result.images.push({ b64: c.image_url, mimeType: 'image/png' });
                            }
                            result.imageCount++;
                        }
                    }
                }
            }

            onDone(result);
        } else {
            // Pas d'images de référence : API Images classique
            const response = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEYS.openai}`
                },
                body: JSON.stringify({
                    model: modelId,
                    prompt: prompt,
                    quality: 'high',
                    output_format: 'png',
                    size
                }),
                signal
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`OpenAI Image API error ${response.status}: ${err}`);
            }

            const data = await response.json();
            const result = { text: '', images: [], usage: null, imageCount: 0 };

            for (const item of data.data) {
                if (item.revised_prompt && !result.text) result.text = item.revised_prompt;
                if (item.b64_json) {
                    result.images.push({ b64: item.b64_json, mimeType: 'image/png' });
                    result.imageCount++;
                }
            }

            onDone(result);
        }
    } catch (err) {
        if (err.name === 'AbortError') { onDone({ text: '', images: [], usage: null, imageCount: 0 }); return; }
        onError(err);
    }
}

async function generateImageGemini(modelId, prompt, onDone, onError, referenceImages, signal, format) {
    const aspectMap = { square: '1:1', vertical: '9:16', horizontal: '16:9' };
    const aspectRatio = aspectMap[format] || '1:1';
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${API_KEYS.google}`;

        const parts = [];
        if (referenceImages && referenceImages.length > 0) {
            for (const img of referenceImages) {
                parts.push({
                    inline_data: {
                        mime_type: img.mimeType || 'image/png',
                        data: img.data
                    }
                });
            }
        }
        parts.push({ text: prompt });

        const body = {
            contents: [{ role: 'user', parts }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio } }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Gemini Image API error ${response.status}: ${err}`);
        }

        const data = await response.json();
        const result = { text: '', images: [], usage: { input_tokens: 0, output_tokens: 0 }, imageCount: 0 };

        const responseParts = data.candidates?.[0]?.content?.parts || [];
        for (const part of responseParts) {
            if (part.text) result.text += part.text;
            const imgData = part.inline_data || part.inlineData;
            if (imgData) {
                result.images.push({
                    b64: imgData.data,
                    mimeType: imgData.mime_type || imgData.mimeType || 'image/png'
                });
                result.imageCount++;
            }
        }

        if (data.usageMetadata) {
            result.usage.input_tokens = data.usageMetadata.promptTokenCount || 0;
            result.usage.output_tokens = data.usageMetadata.candidatesTokenCount || 0;
        }

        onDone(result);
    } catch (err) {
        if (err.name === 'AbortError') { onDone({ text: '', images: [], usage: null, imageCount: 0 }); return; }
        onError(err);
    }
}

// ===================== OpenAI TTS (tts-1-hd) — $30/1M caractères =====================

async function ttsSpeak(text, onDone, onError) {
    try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEYS.openai}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini-tts',
                input: text,
                voice: 'coral',
                instructions: 'Parle en français de France, avec une prononciation native parfaite, sans aucun accent étranger. Ton naturel et fluide.'
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenAI TTS error ${response.status}: ${err}`);
        }

        const blob = await response.blob();
        onDone(blob, text.length);
    } catch (err) { onError(err); }
}

// ===================== STT — multi-provider (Whisper / Voxtral) =====================
// Provider choisi via AUDIO_SETTINGS.sttProvider (défaut: 'openai').
// Modèles déclarés dans MODELS_DATA.stt (frontend/models.js).

async function transcribeAudio(audioBlob, onDone, onError) {
    const provider = (typeof AUDIO_SETTINGS !== 'undefined' && AUDIO_SETTINGS.sttProvider) || 'openai';

    if (!API_KEYS[provider]) {
        return onError(new Error(`Clé API ${provider} manquante — configurez-la dans les réglages.`));
    }

    const sttModel = MODELS_DATA.stt.find(m => m.editeur === provider);
    if (!sttModel) {
        return onError(new Error(`Aucun modèle STT déclaré pour ${provider} dans models.js.`));
    }

    const ENDPOINTS = {
        openai:  'https://api.openai.com/v1/audio/transcriptions',
        mistral: 'https://api.mistral.ai/v1/audio/transcriptions'
    };
    const endpoint = ENDPOINTS[provider];
    if (!endpoint) {
        return onError(new Error(`Provider STT non supporté : ${provider}.`));
    }

    try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', sttModel.id);
        formData.append('language', 'fr');

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${API_KEYS[provider]}` },
            body: formData
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`STT ${provider} error ${response.status}: ${errBody}`);
        }

        const data = await response.json();
        onDone(data.text);
    } catch (err) { onError(err); }
}

// ===================== Amélioration de prompt (text + image) =====================
// Utilisé par le bouton "Améliorer le prompt" du composer.
// Stream de Kiro v3 : appelle streamModel() avec le modèle defini dans
// AUDIO_SETTINGS.enhanceModel et un template d'instruction qui demande
// au modèle de réécrire le prompt utilisateur.

const ENHANCE_PROMPT_TEMPLATE = `Tu es un expert en prompt engineering. Voici un prompt écrit par un utilisateur pour une IA conversationnelle :

---
{TEXT}
---

Améliore ce prompt pour obtenir un meilleur résultat de l'IA. Tu dois :
- Conserver fidèlement l'intention et le sens du prompt original
- Ne pas dénaturer ni changer le sujet ou la demande
- Compléter, reformuler, structurer et préciser le prompt
- Ajouter du contexte utile si nécessaire
- Rendre les instructions plus claires et sans ambiguïté

Réponds UNIQUEMENT avec le prompt amélioré. Pas d'introduction, pas de conclusion, pas de commentaire, pas de texte avant ou après. Ne commence pas par "Voici" ou toute autre phrase d'accroche. Retourne directement le contenu du prompt optimisé, rien d'autre.`;

const ENHANCE_IMAGE_PROMPT_TEMPLATE = `Tu es un expert en génération d'images par IA. Voici un prompt de génération d'image brut :

---
{TEXT}
---

Améliore ce prompt pour obtenir une meilleure image générée par IA. Tu dois :
- Conserver fidèlement l'intention et le sujet de l'image demandée
- Ajouter des détails visuels précis (éclairage, angle, style, couleurs, composition, ambiance)
- Préciser le style artistique si pertinent (photoréaliste, illustration, peinture, 3D, etc.)
- Structurer le prompt de manière optimale pour un modèle de génération d'image
- Rester en anglais pour une meilleure compatibilité avec les modèles d'image
- Ne jamais citer de personnages, œuvres, marques, logos ou noms protégés par le droit d'auteur ; reformuler en décrivant les caractéristiques visuelles à la place

Réponds UNIQUEMENT avec le prompt amélioré. Pas d'introduction, pas de conclusion, pas de commentaire, pas de texte avant ou après. Ne commence pas par "Voici" ou toute autre phrase d'accroche. Retourne directement le contenu du prompt optimisé, rien d'autre.`;

async function enhancePrompt(text, onDelta, onDone, onError, isImage = false) {
    const template = isImage ? ENHANCE_IMAGE_PROMPT_TEMPLATE : ENHANCE_PROMPT_TEMPLATE;
    const prompt = template.replace('{TEXT}', text);
    const modelId = (typeof AUDIO_SETTINGS !== 'undefined' && AUDIO_SETTINGS.enhanceModel) || 'gpt-4.1-2025-04-14';

    // Réutilise streamModel() existant (provider dispatch + streaming).
    streamModel(
        modelId,
        [{ role: 'user', content: prompt }],
        (chunk) => onDelta(chunk),                  // onChunk
        (fullText, inputTokens, outputTokens) => onDone(fullText), // onDone
        (err) => onError(err),                       // onError
        null,                                        // systemPrompt
        false,                                       // webSearch
        null,                                        // onThinkingChunk (ignoré pour enhance)
        null                                         // signal
    );
}
