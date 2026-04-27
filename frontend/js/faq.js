// Donnees statiques de la FAQ (Kiro v3 - PR8) adaptees a GoudAI Chat
// (architecture serveur + OAuth Google + Sheets, differente de Kiro client-only).

const FAQ_CATEGORIES = [
    { id: 'general', label: 'Général' },
    { id: 'usage',   label: 'Usage' },
    { id: 'troubleshoot', label: 'Problèmes' }
];

const FAQ_DATA = [
    // ============== GÉNÉRAL ==============
    {
        category: 'general',
        question: "Qu'est-ce que GoudAI Chat ?",
        answer: "GoudAI Chat est une <strong>interface unifiée pour 7 providers IA</strong> (OpenAI, Anthropic, Google, Mistral, xAI, DeepSeek, Perplexity) sans abonnement SaaS. Vos conversations sont stockées sur le serveur GoudAI, vos clés API sont chiffrées AES-256-GCM dans une Google Sheet privée. Vous payez uniquement vos appels API directement aux providers."
    },
    {
        category: 'general',
        question: "Comment mes clés API sont-elles protégées ?",
        answer: "Chaque clé API que vous saisissez est <strong>chiffrée en AES-256-GCM côté serveur</strong> avant d'être stockée dans votre ligne de la Google Sheet utilisateurs. Le serveur déchiffre uniquement à la demande pour vous les renvoyer en mémoire JS — elles ne touchent jamais le localStorage en clair. Les appels IA partent directement de votre navigateur vers les providers (le serveur GoudAI n'est PAS un proxy IA)."
    },
    {
        category: 'general',
        question: "Quels modèles sont disponibles ?",
        answer: "GoudAI propose <strong>plus de 25 modèles</strong> à jour : Claude Opus 4.7 / Sonnet 4.5 / Haiku 4.5, GPT-5.4 (+ Mini, Nano), Gemini 3.1 Pro, Mistral Large 3, DeepSeek V3.2, Grok 4.20, GLM-5/5.1 (Zhipu), Gemma 4 31B (gratuit). Pour la génération d'images : Nano Banana Pro/2, GPT Image 1.5/Mini, Flux 2 (Klein/Pro/Flex/Max via OpenRouter)."

    },
    // ============== USAGE ==============
    {
        category: 'usage',
        question: "Comment activer la recherche web ?",
        answer: "Sélectionnez un modèle compatible (OpenAI, Claude, ou Gemini) puis cliquez sur l'<strong>icône globe</strong> à côté du bouton + dans la zone de saisie. L'icône devient orange quand activée. Le coût supplémentaire (≈ 0,01 $ / requête) est ajouté au compteur en bas du chat."
    },
    {
        category: 'usage',
        question: "Comment régler la température et autres paramètres ?",
        answer: "Ouvrez le <strong>panneau de réglages à droite</strong> (icône engrenage en haut à droite). Onglet <strong>Général</strong> : sliders pour température, top-p, max tokens, frequency / presence penalty + sélecteur d'effort de raisonnement (pour les modèles compatibles : Claude, GPT-5, Gemini, DeepSeek, GLM). Chaque paramètre a son toggle d'activation — décoché, il n'est pas envoyé à l'API."
    },
    {
        category: 'usage',
        question: "Puis-je définir un budget mensuel ?",
        answer: "Oui. Modale Configuration (icône engrenage en sidebar) → onglet <strong>Budget</strong>. Activez le toggle, choisissez période (jour/semaine/mois) et montant. Une <strong>alerte plein écran</strong> s'affiche dès que le total cumulé dépasse votre limite. Vos réglages budget sont chiffrés dans <code>preferences_enc</code> et synchronisés sur tous vos appareils."
    },
    // ============== PROBLÈMES ==============
    {
        category: 'troubleshoot',
        question: "« Clé API X invalide » — que faire ?",
        answer: "1) Vérifiez que la clé n'a pas expiré dans le dashboard du provider (OpenAI, Anthropic, etc.). 2) Re-saisissez-la dans Configuration → onglet Clés API : un copier-coller propre élimine 90 % des erreurs invisibles (espaces, saut de ligne). 3) Pour Google Gemini, assurez-vous d'avoir activé l'API Generative Language dans votre projet GCP."
    },
    {
        category: 'troubleshoot',
        question: "Mes conversations ont disparu après une connexion sur un autre appareil",
        answer: "Vos conversations sont stockées <strong>uniquement sur le serveur</strong> dans <code>data/conversations/</code>. Elles devraient suivre votre compte. Si elles ne s'affichent pas : 1) Forcez un rechargement (Ctrl+F5). 2) Vérifiez que vous êtes connecté avec <strong>la même adresse Google</strong> que votre compte d'origine. 3) En dernier recours, contactez l'admin pour vérifier que le volume <code>data/conversations/</code> n'a pas été perdu lors d'un redéploiement."
    }
];
