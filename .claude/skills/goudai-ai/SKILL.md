---
name: goudai-ai
description: "Rôle Spécialiste IA pour GoudAI Chat. Adopte ce rôle pour tout ce qui touche aux modèles IA : intégrer un nouveau provider, modifier le streaming, calculer les coûts, ajouter un modèle dans models.js, implémenter le thinking, modifier api.js. Déclenche sur : 'ajouter un nouveau modèle', 'modifier un appel API IA', 'le streaming ne fonctionne pas', 'ajouter le support thinking', 'nouveau provider', 'coût des tokens', 'modifier api.js ou models.js'."
---

# Rôle : Spécialiste IA — GoudAI Chat

## Architecture réelle des appels IA

Tous les appels IA se font **directement depuis le navigateur** via `frontend/js/api.js`. Les clés API sont dans `localStorage` (+ sync serveur pour 4 providers). Le serveur Node.js n'est PAS un proxy pour les APIs IA.

```
Utilisateur → app.js (sendMessage) 
           → api.js (streamModel → dispatcher)
           → Provider IA (fetch direct depuis navigateur)
           → onChunk callbacks → affichage en temps réel
```

**Sync serveur des clés** : seuls `openai`, `anthropic`, `google`, `perplexity` sont sauvegardés serveur-side via `PUT /api/user/keys`. Les clés `mistral`, `grok`, `deepseek` restent en `localStorage` uniquement.

---

## Structure de models.js — format exact

```javascript
const MODELS_DATA = {
  "text": [
    {
      "id": "claude-sonnet-4-5",        // ID exact pour l'API
      "label": "Claude Sonnet 4.5",     // Affiché dans le dropdown
      "description": "...",             // Tooltip au survol
      "editeur": "anthropic",           // Clé provider (voir EDITEURS ci-dessous)
      "inputPer1M": 3,                  // $/1M tokens input
      "outputPer1M": 15                 // $/1M tokens output
    }
  ],
  "image": [ /* id, label, editeur, inputPer1M, outputPer1M, imageOutput */ ],
  "tts":   [ /* id, label, editeur, prix (string affiché) */ ],
  "stt":   [ /* id, label, editeur, prix (string affiché) */ ],
  "search":[ /* id, label, editeur, inputPer1M, outputPer1M */ ]
}
```

**Editeurs reconnus** (utilisés comme clés dans `API_KEYS`) :
`openai`, `anthropic`, `google`, `perplexity`, `mistral`, `grok`, `deepseek`

**Ajouter un modèle** : modifier `models.js` uniquement. Les sélecteurs se remplissent automatiquement via `loadModels()` dans `api.js`.

---

## Providers — endpoints et spécificités réelles

### OpenAI — `streamOpenAI()`
- **Endpoint** : `https://api.openai.com/v1/responses` (Responses API, pas `/chat/completions`)
- **Stream** : SSE standard, `data: [DONE]` pour terminer
- **Vision** : supportée via `content` array avec `image_url`

### Anthropic — `streamAnthropic()`
- **Endpoint** : `https://api.anthropic.com/v1/messages`
- **Headers requis** : `anthropic-version: 2023-06-01`, `x-api-key: <clé>`
- **Stream events** : `content_block_delta` (texte), `message_delta` (usage tokens), `message_stop`
- **Thinking** : les blocs `thinking` arrivent avant le texte — parser séparément et passer à `onThinkingChunk`

### Google Gemini — `streamGoogle()`
- **Endpoint** : `https://generativelanguage.googleapis.com/v1beta/models/{id}:streamGenerateContent?key={apiKey}`
- **Stream** : JSON newline-delimited (pas SSE standard), à parser chunk par chunk
- **Vision** : `parts` peut contenir `inlineData` en base64

### Perplexity — `streamPerplexity()`
- **Endpoint** : `https://api.perplexity.ai/chat/completions`
- **Format** : OpenAI-compatible
- **Spécificité** : retourne `citations` dans la réponse → passer à `onDone` pour affichage sources

### Mistral / Grok / DeepSeek — `streamOpenAICompat()`
Fonction partagée pour les 3 providers compatibles OpenAI :
```javascript
// Appel
streamOpenAICompat(modelId, baseUrl, apiKey, conversationHistory, 
                   onChunk, onDone, onError, systemPrompt, 
                   onThinkingChunk, signal, hasThinkTags)
```
- **Mistral** : `https://api.mistral.ai/v1/chat/completions`
- **Grok (xAI)** : `https://api.x.ai/v1/chat/completions`
- **DeepSeek** : `https://api.deepseek.com/v1/chat/completions`
- **DeepSeek R1** (`deepseek-reasoner`) : retourne `<think>...</think>` tags → `hasThinkTags: true` → parser et envoyer à `onThinkingChunk`

---

## Génération d'images — `generateImage()`

Dispatcher vers :
- **OpenAI** (`generateImageOpenAI`) : Responses API ou `/v1/images/generations` selon le modèle
- **Gemini** (`generateImageGemini`) : `generateContent` avec `responseModalities: ['IMAGE']`

---

## Audio (TTS / STT)

### TTS — `ttsSpeak()`
- **OpenAI TTS** : `POST https://api.openai.com/v1/audio/speech` → retourne buffer audio MP3
- **Google TTS** (gemini-2.5-flash-preview-tts) : via Gemini API

### STT — `transcribeAudio()`
- **Whisper** (`whisper-1`) : `POST https://api.openai.com/v1/audio/transcriptions` (multipart/form-data)
- **Voxtral** (Mistral) : `POST https://api.mistral.ai/v1/audio/transcriptions`

---

## Callbacks streaming — interface standard

Toutes les fonctions `stream*` partagent la même interface :
```javascript
streamXxx(modelId, conversationHistory, 
          onChunk,         // (text) → appelé à chaque fragment de texte
          onDone,          // (fullText, inputTokens, outputTokens, citations?) → fin
          onError,         // (error) → erreur
          systemPrompt,    // string ou null
          webSearch,       // boolean
          onThinkingChunk, // (text) → fragments de thinking/reasoning
          signal)          // AbortSignal pour annuler
```

---

## Calcul des coûts

```javascript
// Dans app.js — fonction updateTokenDisplay()
const tarif = getTarif(currentModel);  // depuis api.js
const cost = (inputTokens * tarif.inputPer1M / 1_000_000) 
           + (outputTokens * tarif.outputPer1M / 1_000_000);
```

`addCostForModel(modelId, inputTokens, outputTokens, cost)` est appelée après chaque réponse pour alimenter le dashboard stats.

---

## Gestion des erreurs provider

Ne jamais afficher les messages d'erreur bruts à l'utilisateur :

| Situation | Message utilisateur |
|-----------|-------------------|
| 401 | "Clé API [provider] invalide — vérifiez votre configuration" |
| 429 | "Limite atteinte chez [provider] — réessayez dans quelques instants" |
| Réseau | "Connexion interrompue — vérifiez votre connexion" |
| 500 provider | "Le service [provider] est temporairement indisponible" |

---

## Ajouter un nouveau provider — checklist

1. Ajouter les modèles dans `models.js` (section appropriée)
2. Ajouter la clé dans `API_KEYS` dans `api.js` et dans la modale config (`app.js`)
3. Implémenter `streamXxx()` dans `api.js` (ou réutiliser `streamOpenAICompat` si compatible)
4. Ajouter le cas dans le dispatcher `streamModel()` dans `api.js`
5. **Si le provider doit être sauvegardé serveur-side** : ajouter dans `PUT /api/user/keys` (`server/routes/user.js`) — actuellement limité à `{openai, anthropic, google, perplexity}`. Les providers Mistral/Grok/DeepSeek restent en localStorage uniquement.
6. Tester le streaming manuellement sur 2-3 modèles
7. Vérifier l'affichage du coût en temps réel
