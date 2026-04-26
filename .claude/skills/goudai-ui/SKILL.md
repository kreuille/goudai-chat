---
name: goudai-ui
description: "Rôle UI Designer pour GoudAI Chat. Adopte ce rôle pour tout ce qui touche à l'apparence visuelle : composants, couleurs, typographie, animations, dark/light mode, cohérence avec le design system KIRO, ou nouveau composant. Déclenche sur : 'améliore l'apparence', 'redesign ce composant', 'ajouter une animation', 'cohérence visuelle', 'dark mode', 'les couleurs', 'style CSS', 'nouveau composant visuel', 'typographie'."
---

# Rôle : UI Designer — GoudAI Chat

## Le design system : KIRO — Noir Aurique

GoudAI Chat utilise le design system **"KIRO — Noir Aurique"** : obsidian deep-dark × liquid gold × editorial typography.

**Philosophie** : luxueux, sombre, avec une touche d'or comme accent. Pas de couleurs primaires vives — tout est dans les nuances de noir/violet sombre et l'or.

---

## Typographie (Google Fonts, déjà chargées)

| Rôle | Police | Usage |
|------|--------|-------|
| Display / titres | Cormorant Garamond (400/500/600/700) | Grands titres, éléments éditoriaux |
| UI / interface | Outfit (300/400/500/600) | Tout le texte courant, labels, boutons |
| Code | JetBrains Mono (400/500) | Blocs de code, réponses techniques |

```css
font-family: 'Outfit', sans-serif;           /* UI par défaut */
font-family: 'Cormorant Garamond', serif;    /* Titres éditoriaux */
font-family: 'JetBrains Mono', monospace;   /* Code */
```

---

## Variables CSS — utiliser UNIQUEMENT ces variables

### Dark mode (défaut — classe `.dark` sur `body`)

```css
--bg:             #080709;      /* Fond principal — noir obsidienne */
--bg-sidebar:     #0c0b10;      /* Fond sidebar */
--bg-modal:       #100f14;      /* Fond modales */
--bg-input:       #0f0e13;      /* Fond zones de saisie */
--surface:        #141218;      /* Cartes, surfaces */
--surface-2:      #1c1a22;      /* Surface secondaire */
--text:           #ece7e0;      /* Texte principal — blanc chaud */
--text-secondary: #7c7180;      /* Texte secondaire */
--text-muted:     #3e3848;      /* Texte désactivé / très discret */
--border:         #201d28;      /* Bordures */
--border-input:   #2c2836;      /* Bordures champs */
--accent:         #c4881e;      /* Or — couleur principale d'accent */
--accent-bright:  #dfa040;      /* Or vif — hover sur accent */
--accent-soft:    rgba(196,136,30,.12); /* Or translucide — fond badge */
--accent-glow:    rgba(196,136,30,.22); /* Or translucide — glow */
--bg-msg-user:    #1c192a;      /* Bulle message utilisateur */
--bg-msg-assistant: #100f14;    /* Bulle message assistant */
--bg-hover:       #1a1820;      /* Hover sur éléments */
--bg-active:      #221f2a;      /* État actif / sélectionné */
--btn-bg:         #c4881e;      /* Fond bouton primaire */
--btn-text:       #08070a;      /* Texte bouton primaire (noir sur or) */
```

### Light mode (`body:not(.dark)`)

```css
--bg:             #f5f0e8;      /* Crème */
--accent:         #b07020;      /* Or plus sombre en light */
--btn-bg:         #b07020;
--btn-text:       #faf6ef;      /* Blanc sur or */
```

**Règle** : jamais de couleur en dur dans le CSS. Toujours `var(--nom-variable)`.

---

## Composants — patterns à respecter

### Boutons

```css
/* Primaire — action principale (or sur noir) */
.btn-primary {
  background: var(--btn-bg);
  color: var(--btn-text);
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-family: 'Outfit', sans-serif;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.1s ease;
}
.btn-primary:hover { opacity: 0.88; }
.btn-primary:active { transform: scale(0.97); }
.btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }

/* Ghost — action secondaire */
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  /* ... */
}
.btn-ghost:hover { background: var(--bg-hover); color: var(--text); }
```

### Messages du chat

Structure existante dans `app.js` (fonction `addMessage`) :
- `.message.user` → fond `--bg-msg-user`, aligné droite
- `.message.assistant` → fond `--bg-msg-assistant`
- `.thinking-block` → style discret (italique, `--text-secondary`), accordéon collapsé
- `.citation-block` → pour les résultats Perplexity avec sources

### Modales

Pattern existant : `overlay` + `modal-content`
- Fond overlay : `rgba(0,0,0,0.7)`
- Fond modal : `var(--bg-modal)`
- Border-radius : 12px
- Transition : fade in depuis le bas (`translateY(8px) → translateY(0)`)

---

## Animations — règles KIRO

Le design KIRO est subtil et sophistiqué — pas de flashy, pas d'exagéré :

- **Durées** : 150ms pour micro-interactions, 250ms pour apparitions, 300ms max
- **Easing préféré** : `cubic-bezier(0.4, 0, 0.2, 1)` (material ease)
- **Effet spin** (chargement) : classe `.spin` définie dans style.css
- **Grain overlay** : l'effet de texture grain est sur `body::before` — ne pas toucher

```css
/* Spinner réutilisable — classe déjà définie */
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Accessibilité — respecter ce media query */
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## Mobile — contexte spécifique GoudAI

Le mobile est géré avec des overrides CSS importants (`style.css` lignes 664+) :
- La sidebar est masquée par défaut sur mobile (< 768px) et s'ouvre en overlay
- L'overlay sidebar est géré en JS dans `app.js` (IIFE au début du fichier)
- `safe-area-inset-*` est géré pour iOS
- Le textarea s'auto-resize (géré en JS)

**Touch targets** : minimum 44×44px pour tout élément interactif mobile.

---

## Ce qu'on ne fait jamais

- Modifier les variables CSS en dark sans mettre à jour leur équivalent light
- Utiliser `!important` sauf pour les overrides mobile (déjà nombreux dans style.css — contexte justified)
- Ajouter des polices externes — les 3 polices KIRO suffisent
- Casser le grain overlay (`body::before`) — c'est une signature visuelle du design
- Dépasser `z-index: 100000` (la sidebar mobile est à 99999, la référence max du projet)
