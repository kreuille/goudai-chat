const MODELS_DATA = {
  "text": [
    { "id": "gpt-4.1-2025-04-14", "description": "Modèle phare OpenAI, excellent en codage et suivi d'instructions complexes.",         "label": "GPT-4.1",           "editeur": "openai",    "inputPer1M": 2,    "outputPer1M": 8 },
    { "id": "gpt-5-mini-2025-08-07", "description": "Petit modèle rapide et économique, idéal pour les tâches simples.",       "label": "GPT-5 Mini",        "editeur": "openai",    "inputPer1M": 0.25, "outputPer1M": 2 },
    { "id": "gpt-5.2-2025-12-11", "description": "Modèle avancé avec raisonnement amélioré et large fenêtre de contexte.",          "label": "GPT-5.2",           "editeur": "openai",    "inputPer1M": 1.75, "outputPer1M": 14 },
    { "id": "gpt-5.4-2026-03-05", "description": "Dernière génération OpenAI, performances de pointe en raisonnement.",          "label": "GPT-5.4",           "editeur": "openai",    "inputPer1M": 2.5, "outputPer1M": 15 },
    { "id": "claude-opus-4-5", "description": "Modèle le plus puissant d'Anthropic, excelle en analyse et tâches complexes.",             "label": "Claude Opus 4.6",   "editeur": "anthropic", "inputPer1M": 5,    "outputPer1M": 25 },
    { "id": "claude-sonnet-4-5", "description": "Équilibre optimal performance/coût, très bon en rédaction et codage.",  "label": "Claude Sonnet 4.5", "editeur": "anthropic", "inputPer1M": 3,    "outputPer1M": 15 },
    { "id": "claude-haiku-4-5", "description": "Modèle rapide et abordable, parfait pour les réponses courtes.",   "label": "Claude Haiku 4.5",  "editeur": "anthropic", "inputPer1M": 1,    "outputPer1M": 5 },
    { "id": "gemini-3.1-pro-preview", "description": "Dernier modèle Pro de Google, performant en raisonnement multimodal.",      "label": "Gemini 3.1 Pro",    "editeur": "google",    "inputPer1M": 2,    "outputPer1M": 12 },
    { "id": "gemini-2.5-pro", "description": "Modèle Pro de Google avec large fenêtre de contexte.",              "label": "Gemini 2.5 Pro",    "editeur": "google",    "inputPer1M": 1.25, "outputPer1M": 10 },
    { "id": "mistral-large-latest", "description": "Le modèle phare et le plus performant de Mistral. Cocorico.",  "label": "Mistral Large",  "editeur": "mistral",  "inputPer1M": 2,    "outputPer1M": 6 },
    { "id": "mistral-small-latest", "description": "Petit modèle Mistral, extrêmement rapide et économique.",  "label": "Mistral Small",  "editeur": "mistral",  "inputPer1M": 0.1,  "outputPer1M": 0.3 },
    { "id": "codestral-latest", "description": "Modèle Mistral spécialisé dans la génération de code.",      "label": "Codestral",      "editeur": "mistral",  "inputPer1M": 0.2,  "outputPer1M": 0.6 },
    { "id": "grok-3", "description": "Modèle phare de xAI, excellent en raisonnement.",                "label": "Grok 3",         "editeur": "grok",     "inputPer1M": 3,    "outputPer1M": 15 },
    { "id": "grok-3-mini", "description": "Version légère de Grok 3, rapide et économique.",           "label": "Grok 3 Mini",    "editeur": "grok",     "inputPer1M": 0.3,  "outputPer1M": 0.5 },
    { "id": "deepseek-chat", "description": "DeepSeek V3 : excellent rapport qualité/prix, performant en codage.",         "label": "DeepSeek V3",    "editeur": "deepseek", "inputPer1M": 0.27, "outputPer1M": 1.1 },
    { "id": "deepseek-reasoner",     "label": "DeepSeek R1",    "editeur": "deepseek", "inputPer1M": 0.55, "outputPer1M": 2.19 },
    { "id": "gemini-2.5-flash", "description": "Modèle ultra-rapide et économique de Google.",            "label": "Gemini 2.5 Flash",  "editeur": "google",    "inputPer1M": 0.3,  "outputPer1M": 2.5 }
  ],
  "image": [
    { "id": "gemini-3-pro-image-preview",    "label": "Nano Banana Pro", "editeur": "google", "inputPer1M": 2,   "outputPer1M": 12, "imageOutput": 0.134 },
    { "id": "gemini-3.1-flash-image-preview", "label": "Nano Banana 2",  "editeur": "google", "inputPer1M": 0.5, "outputPer1M": 3,  "imageOutput": 0.134 },
    { "id": "gpt-image-1.5",                 "label": "GPT Image 1.5",  "editeur": "openai", "inputPer1M": 5,   "outputPer1M": 10, "imageOutput": 0.2 }
  ],
  "tts": [
    { "id": "gpt-4o-mini-tts", "label": "OpenAI TTS", "editeur": "openai", "prix": "$12/1M car." },
    { "id": "gemini-2.5-flash-preview-tts", "label": "Google TTS", "editeur": "google", "prix": "$0.25/$1.5" }
  ],
  "stt": [
    { "id": "whisper-1", "label": "OpenAI Whisper", "editeur": "openai", "prix": "$0.006/min" },
    { "id": "voxtral-mini-latest", "label": "Mistral Voxtral", "editeur": "mistral", "prix": "$0.003/min" }
  ],
  "search": [
    { "id": "sonar-pro", "description": "Recherche web avancée avec synthèse de sources et citations.",            "label": "Sonar Pro",            "editeur": "perplexity", "inputPer1M": 3, "outputPer1M": 15 },
    { "id": "sonar-reasoning-pro", "description": "Recherche web avec raisonnement approfondi.",  "label": "Sonar Reasoning Pro",  "editeur": "perplexity", "inputPer1M": 2, "outputPer1M": 8 }
  ]
};
