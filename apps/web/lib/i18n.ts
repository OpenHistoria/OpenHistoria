import { Result } from "better-result"

import type { OpenRouterError } from "@/lib/openrouter"

/**
 * Client-side i18n. The locale is a browser preference (like the map
 * projection), persisted in localStorage and defaulting to the browser
 * language. Components read it through the useI18n hook, which subscribes
 * to LOCALE_CHANGED_EVENT.
 */

export type Locale = "en" | "fr"

export const LOCALES: Locale[] = ["en", "fr"]

const LOCALE_STORAGE_KEY = "openhistoria:locale"

/** Fired on window whenever the locale changes in this tab. */
export const LOCALE_CHANGED_EVENT = "openhistoria:locale-changed"

const isLocale = (value: unknown): value is Locale =>
  value === "en" || value === "fr"

// localStorage throws in Safari private mode and when storage is blocked;
// the locale preference is best-effort, so swallow those failures.
export const getLocale = (): Locale => {
  const stored = Result.try(() =>
    window.localStorage.getItem(LOCALE_STORAGE_KEY)
  ).unwrapOr(null)
  if (isLocale(stored)) return stored
  return navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en"
}

export const setLocale = (locale: Locale) => {
  Result.try(() => window.localStorage.setItem(LOCALE_STORAGE_KEY, locale))
  document.documentElement.lang = locale
  window.dispatchEvent(new Event(LOCALE_CHANGED_EVENT))
}

export const subscribeToLocale = (onChange: () => void) => {
  window.addEventListener(LOCALE_CHANGED_EVENT, onChange)
  // Picks up a locale switch done in another tab.
  window.addEventListener("storage", onChange)
  return () => {
    window.removeEventListener(LOCALE_CHANGED_EVENT, onChange)
    window.removeEventListener("storage", onChange)
  }
}

export interface Messages {
  home: {
    connectAi: string
    aiReady: string
  }
  map: {
    globe: string
    flat: string
  }
  newGame: {
    buttonLabel: string
    title: string
    description: string
    searchPlaceholder: string
    noMatch: (query: string) => string
    selectedLabel: string
    startYearLabel: string
    startYearHint: (min: number, max: number) => string
    cancel: string
    start: string
    starting: string
    createFailedTitle: string
    createFailed: string
  }
  openrouter: {
    titleConnect: string
    titleConnected: string
    descriptionConnect: string
    descriptionConnected: string
    steps: { title: string; detail: string }[]
    privacyTitle: string
    privacyBody: string
    defaultKeyLabel: string
    usageUncapped: (usage: string) => string
    usageCapped: (usage: string, limit: string) => string
    usageUnavailable: string
    usageChecking: string
    connectedBadge: string
    freeTierNote: string
    keyCheckErrorTitle: string
    managePrefix: string
    dashboardLinkLabel: string
    manageSuffix: string
    notNow: string
    connect: string
    redirecting: string
    disconnect: string
    openDashboard: string
  }
  callback: {
    titleConnecting: string
    titleSuccess: string
    titleError: string
    descriptionConnecting: string
    descriptionSuccess: string
    descriptionError: string
    exchanging: string
    success: string
    errorTitle: string
    backToMap: string
    tryAgain: string
    loadingFallback: string
  }
  errors: {
    missingCode: string
    authExpired: string
    exchangeFailed: (status: number) => string
    noKeyReturned: string
    network: string
    requestFailed: (status: number) => string
  }
}

const en: Messages = {
  home: {
    connectAi: "Connect AI",
    aiReady: "AI ready",
  },
  map: {
    globe: "Globe",
    flat: "Flat",
  },
  newGame: {
    buttonLabel: "New game",
    title: "Start a new game",
    description:
      "Choose any country in the world and the year history diverges. You take charge from there.",
    searchPlaceholder: "Search countries...",
    noMatch: (query) => `No country matches "${query}".`,
    selectedLabel: "selected",
    startYearLabel: "Start year",
    startYearHint: (min, max) =>
      `Anywhere from ${min} to ${max}. The simulation runs from your start year to today.`,
    cancel: "Cancel",
    start: "Start game",
    starting: "Creating world...",
    createFailedTitle: "Could not start the game",
    createFailed:
      "The game could not be saved in this browser. Check that storage is allowed and try again.",
  },
  openrouter: {
    titleConnect: "Connect your OpenRouter account",
    titleConnected: "OpenRouter connected",
    descriptionConnect:
      "Open Historia uses AI to simulate world leaders, diplomacy, and historical events. You bring your own OpenRouter account, so the AI runs on your credits and stays under your control.",
    descriptionConnected:
      "Open Historia is powered by your own OpenRouter account. AI features are ready.",
    steps: [
      {
        title: "Sign in on openrouter.ai",
        detail:
          "We send you to OpenRouter, where you log in (or create a free account) and approve Open Historia.",
      },
      {
        title: "Come straight back",
        detail:
          "OpenRouter redirects you here and hands this browser a key that only works for Open Historia.",
      },
      {
        title: "Play with AI on your terms",
        detail:
          "AI requests run on your OpenRouter credits. Cap or revoke the key anytime from your dashboard.",
      },
    ],
    privacyTitle: "Your key stays in this browser",
    privacyBody:
      "The key is stored locally and sent only to OpenRouter, never to our servers. We never see your password or your other keys.",
    defaultKeyLabel: "Open Historia key",
    usageUncapped: (usage) => `${usage} used, no spending cap`,
    usageCapped: (usage, limit) => `${usage} of ${limit} used`,
    usageUnavailable: "Usage unavailable",
    usageChecking: "Checking usage...",
    connectedBadge: "Connected",
    freeTierNote:
      "You are on the OpenRouter free tier. Free models work, but adding a few credits unlocks stronger ones.",
    keyCheckErrorTitle: "Could not check your key",
    managePrefix: "Manage spending limits or revoke this key from your ",
    dashboardLinkLabel: "OpenRouter dashboard",
    manageSuffix: ". Disconnecting only forgets the key in this browser.",
    notNow: "Not now",
    connect: "Connect OpenRouter",
    redirecting: "Heading to OpenRouter...",
    disconnect: "Disconnect",
    openDashboard: "Open dashboard",
  },
  callback: {
    titleConnecting: "Connecting to OpenRouter",
    titleSuccess: "Account connected",
    titleError: "Connection failed",
    descriptionConnecting:
      "Finishing the secure handshake with OpenRouter. This only takes a moment.",
    descriptionSuccess:
      "Your OpenRouter account now powers the AI in Open Historia. Taking you back to the map.",
    descriptionError: "Your OpenRouter account was not connected.",
    exchanging: "Exchanging the authorization code for your app key...",
    success: "Key received and stored in this browser only.",
    errorTitle: "What happened",
    backToMap: "Back to the map",
    tryAgain: "Try again",
    loadingFallback: "Connecting to OpenRouter...",
  },
  errors: {
    missingCode:
      "OpenRouter did not send back an authorization code. Start the connection again from the map.",
    authExpired:
      "This sign-in attempt has expired. Start the connection again from the map.",
    exchangeFailed: (status) =>
      `OpenRouter rejected the authorization code (HTTP ${status}). Please try connecting again.`,
    noKeyReturned: "OpenRouter did not return an API key. Please try again.",
    network: "Could not reach OpenRouter. Check your connection and try again.",
    requestFailed: (status) => `Could not reach OpenRouter (HTTP ${status}).`,
  },
}

const fr: Messages = {
  home: {
    connectAi: "Connecter l'IA",
    aiReady: "IA prête",
  },
  map: {
    globe: "Globe",
    flat: "Plat",
  },
  newGame: {
    buttonLabel: "Nouvelle partie",
    title: "Commencer une nouvelle partie",
    description:
      "Choisissez n'importe quel pays du monde et l'année où l'histoire diverge. Vous prenez les commandes à partir de là.",
    searchPlaceholder: "Rechercher un pays...",
    noMatch: (query) => `Aucun pays ne correspond à « ${query} ».`,
    selectedLabel: "sélectionné",
    startYearLabel: "Année de départ",
    startYearHint: (min, max) =>
      `De ${min} à ${max}. La simulation court de votre année de départ à aujourd'hui.`,
    cancel: "Annuler",
    start: "Lancer la partie",
    starting: "Création du monde...",
    createFailedTitle: "Impossible de lancer la partie",
    createFailed:
      "La partie n'a pas pu être enregistrée dans ce navigateur. Vérifiez que le stockage est autorisé et réessayez.",
  },
  openrouter: {
    titleConnect: "Connectez votre compte OpenRouter",
    titleConnected: "OpenRouter connecté",
    descriptionConnect:
      "Open Historia utilise l'IA pour simuler les dirigeants, la diplomatie et les événements historiques. Vous utilisez votre propre compte OpenRouter : l'IA fonctionne avec vos crédits et reste sous votre contrôle.",
    descriptionConnected:
      "Open Historia fonctionne avec votre propre compte OpenRouter. Les fonctionnalités IA sont prêtes.",
    steps: [
      {
        title: "Connectez-vous sur openrouter.ai",
        detail:
          "Nous vous envoyons sur OpenRouter, où vous vous connectez (ou créez un compte gratuit) et autorisez Open Historia.",
      },
      {
        title: "Revenez directement ici",
        detail:
          "OpenRouter vous redirige ici et confie à ce navigateur une clé qui ne fonctionne que pour Open Historia.",
      },
      {
        title: "Jouez avec l'IA selon vos règles",
        detail:
          "Les requêtes IA utilisent vos crédits OpenRouter. Plafonnez ou révoquez la clé à tout moment depuis votre tableau de bord.",
      },
    ],
    privacyTitle: "Votre clé reste dans ce navigateur",
    privacyBody:
      "La clé est stockée localement et envoyée uniquement à OpenRouter, jamais à nos serveurs. Nous ne voyons jamais votre mot de passe ni vos autres clés.",
    defaultKeyLabel: "Clé Open Historia",
    usageUncapped: (usage) => `${usage} utilisés, sans plafond de dépenses`,
    usageCapped: (usage, limit) => `${usage} utilisés sur ${limit}`,
    usageUnavailable: "Consommation indisponible",
    usageChecking: "Vérification de la consommation...",
    connectedBadge: "Connecté",
    freeTierNote:
      "Vous êtes sur l'offre gratuite d'OpenRouter. Les modèles gratuits fonctionnent, mais quelques crédits débloquent des modèles plus puissants.",
    keyCheckErrorTitle: "Impossible de vérifier votre clé",
    managePrefix:
      "Gérez les plafonds de dépenses ou révoquez cette clé depuis votre ",
    dashboardLinkLabel: "tableau de bord OpenRouter",
    manageSuffix: ". Se déconnecter efface seulement la clé de ce navigateur.",
    notNow: "Plus tard",
    connect: "Connecter OpenRouter",
    redirecting: "Redirection vers OpenRouter...",
    disconnect: "Déconnecter",
    openDashboard: "Ouvrir le tableau de bord",
  },
  callback: {
    titleConnecting: "Connexion à OpenRouter",
    titleSuccess: "Compte connecté",
    titleError: "Échec de la connexion",
    descriptionConnecting:
      "Finalisation de l'échange sécurisé avec OpenRouter. Cela ne prend qu'un instant.",
    descriptionSuccess:
      "Votre compte OpenRouter alimente désormais l'IA d'Open Historia. Retour à la carte.",
    descriptionError: "Votre compte OpenRouter n'a pas été connecté.",
    exchanging: "Échange du code d'autorisation contre votre clé...",
    success: "Clé reçue et stockée uniquement dans ce navigateur.",
    errorTitle: "Ce qui s'est passé",
    backToMap: "Retour à la carte",
    tryAgain: "Réessayer",
    loadingFallback: "Connexion à OpenRouter...",
  },
  errors: {
    missingCode:
      "OpenRouter n'a pas renvoyé de code d'autorisation. Relancez la connexion depuis la carte.",
    authExpired:
      "Cette tentative de connexion a expiré. Relancez la connexion depuis la carte.",
    exchangeFailed: (status) =>
      `OpenRouter a rejeté le code d'autorisation (HTTP ${status}). Veuillez réessayer.`,
    noKeyReturned: "OpenRouter n'a pas renvoyé de clé API. Veuillez réessayer.",
    network:
      "Impossible de joindre OpenRouter. Vérifiez votre connexion et réessayez.",
    requestFailed: (status) =>
      `Impossible de joindre OpenRouter (HTTP ${status}).`,
  },
}

export const MESSAGES: Record<Locale, Messages> = { en, fr }

/** Maps a tagged OpenRouter error to a localized, user-presentable message. */
export const formatOpenRouterError = (
  messages: Messages,
  error: OpenRouterError
): string => {
  switch (error._tag) {
    case "OpenRouterAuthExpired":
      return messages.errors.authExpired
    case "OpenRouterExchangeFailed":
      return messages.errors.exchangeFailed(error.status)
    case "OpenRouterNoKeyReturned":
      return messages.errors.noKeyReturned
    case "OpenRouterNetworkError":
      return messages.errors.network
    case "OpenRouterRequestFailed":
      return messages.errors.requestFailed(error.status)
  }
}
