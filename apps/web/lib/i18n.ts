import { Result } from "better-result"

import type { AdvanceTimeError, EventKind } from "@workspace/engine"

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

/**
 * English name of a locale's language (e.g. "French"), used to tell the model
 * which language to generate game content in.
 */
export const localeLanguageName = (locale: Locale): string =>
  new Intl.DisplayNames(["en"], { type: "language" }).of(locale) ?? "English"

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
    next: string
    back: string
    countryStepTitle: string
    countryStepDescription: string
    setupStepTitle: string
    setupStepDescription: (country: string) => string
    howItWorks: { title: string; body: string }[]
    modelLabel: string
    modelSearchPlaceholder: string
    modelLoading: string
    modelLoadError: string
    modelNoMatch: (query: string) => string
    modelDefaultBadge: string
    modelBestFree: string
    modelRotateFree: string
    modelRotateFreeHint: string
    modelFree: string
    modelPrice: (input: number, output: number) => string
  }
  menu: {
    open: string
    settings: string
    settingsTitle: string
    settingsSubtitle: string
    title: string
    subtitle: string
    resume: string
    briefing: string
    language: string
    aiAccount: string
    connect: string
    manage: string
    model: string
    changeModel: string
    modelDialogTitle: string
    apply: string
    exportSave: string
    importSave: string
    importFailed: string
    exitGame: string
    exitConfirmTitle: string
    exitConfirmBody: string
    exitConfirm: string
    cancel: string
    escHint: string
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
  game: {
    statusActive: string
    statusCompleted: string
    completedNote: string
    exit: string
    briefingTitle: string
    advanceYear: string
    advancing: string
    pause: string
    play: string
    speed: string
    step: string
    nextEventLabel: string
    eventProgress: string
    eventCountries: string
    decisionBadge: string
    decisionDismiss: string
    directivesTitle: string
    directivesHint: string
    directivesPlaceholder: string
    directivesAdd: string
    directivesEmpty: string
    directivesRemove: string
    directivesPickLocation: string
    directivesPicking: string
    directivesClearLocation: string
    narrationHeading: string
    emptyFeed: string
    turnFailedTitle: string
    kinds: Record<EventKind, string>
    errors: {
      missingApiKey: string
      gameCompleted: string
      invalidOutput: string
      network: string
      requestFailed: (status: number, message?: string) => string
      rateLimited: string
      empty: string
      storage: string
      generic: string
    }
  }
  common: {
    close: string
    theme: string
    themeSystem: string
    themeLight: string
    themeDark: string
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
      `Anywhere from ${min} to ${max}. The simulation plays forward from there into an alternate future.`,
    cancel: "Cancel",
    start: "Start game",
    starting: "Creating world...",
    createFailedTitle: "Could not start the game",
    createFailed:
      "The game could not be saved in this browser. Check that storage is allowed and try again.",
    next: "Next",
    back: "Back",
    countryStepTitle: "Welcome to Open Historia",
    countryStepDescription:
      "Choose any country in the world. History diverges from the year you pick, and you take charge from there.",
    setupStepTitle: "Set the stage",
    setupStepDescription: (country) =>
      `You take the helm of ${country}. Choose where history begins.`,
    howItWorks: [
      {
        title: "Advance time, one year at a time",
        body: "Each turn the AI simulates a year: it narrates what unfolds and emits concrete events across the world.",
      },
      {
        title: "Steer with directives",
        body: "Before each year you can issue directives in plain language. The simulation weighs them as it plays the period out.",
      },
      {
        title: "Bring your own AI",
        body: "Turns run on your connected OpenRouter account, on your credits and under your control.",
      },
    ],
    modelLabel: "AI model",
    modelSearchPlaceholder: "Search models...",
    modelLoading: "Loading models...",
    modelLoadError:
      "Could not load the model list; the default model will be used.",
    modelNoMatch: (query) => `No model matches "${query}".`,
    modelDefaultBadge: "Default",
    modelBestFree: "Best free model",
    modelRotateFree: "Rotate free models",
    modelRotateFreeHint:
      "Spreads each turn across the best free models to dodge rate limits.",
    modelFree: "Free",
    modelPrice: (input, output) =>
      `$${input} in · $${output} out / 1M tokens`,
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
  game: {
    statusActive: "In progress",
    statusCompleted: "Game over",
    completedNote: "The simulation has reached its final year.",
    exit: "Exit game",
    briefingTitle: "Briefing",
    advanceYear: "Advance one month",
    advancing: "Simulating...",
    pause: "Pause",
    play: "Play",
    speed: "Speed",
    step: "Advance one month",
    nextEventLabel: "Next",
    eventProgress: "Progress",
    eventCountries: "Countries involved",
    decisionBadge: "Decision",
    decisionDismiss: "Decide later",
    directivesTitle: "Directives",
    directivesHint: "These orders steer the next month you simulate. Add as many as you like.",
    directivesPlaceholder: "Add an order, then press Enter...",
    directivesAdd: "Add",
    directivesEmpty: "No directives yet.",
    directivesRemove: "Remove directive",
    directivesPickLocation: "Pick a location on the map (optional)",
    directivesPicking: "Click the map to set this directive's location...",
    directivesClearLocation: "Clear location",
    narrationHeading: "This month",
    emptyFeed: "No events yet. Advance time to set history in motion.",
    turnFailedTitle: "Could not advance the year",
    kinds: {
      political: "Political",
      military: "Military",
      economic: "Economic",
      diplomatic: "Diplomatic",
      social: "Social",
      scientific: "Scientific",
      disaster: "Disaster",
    },
    errors: {
      missingApiKey:
        "Connect your OpenRouter account first to let the AI run the simulation.",
      gameCompleted: "This game has already reached its final year.",
      invalidOutput:
        "The AI returned an unexpected response. Try advancing again.",
      network: "Could not reach OpenRouter. Check your connection and try again.",
      requestFailed: (status, message) =>
        message
          ? `OpenRouter rejected the request (HTTP ${status}): ${message}`
          : `OpenRouter rejected the request (HTTP ${status}). Check your key, credits, and selected model.`,
      rateLimited:
        "The model provider is rate-limiting requests (free models are heavily limited). Wait a moment, lower the speed, switch model, or add OpenRouter credits.",
      empty: "The AI returned an empty response. Try again.",
      storage: "The game state could not be saved. Try again.",
      generic: "Something went wrong advancing the year. Try again.",
    },
  },
  menu: {
    open: "Menu",
    settings: "Settings",
    settingsTitle: "Settings",
    settingsSubtitle: "Choose your language and connect AI.",
    title: "Paused",
    subtitle: "Manage your game or head back to it.",
    resume: "Resume",
    briefing: "Briefing",
    language: "Language",
    aiAccount: "AI account",
    connect: "Connect",
    manage: "Manage",
    model: "AI model",
    changeModel: "Change",
    modelDialogTitle: "Choose AI model",
    apply: "Apply",
    exportSave: "Export save",
    importSave: "Import save",
    importFailed: "That file is not a valid Open Historia save.",
    exitGame: "Exit to map",
    exitConfirmTitle: "Exit this game?",
    exitConfirmBody:
      "Your progress stays saved and you can resume it later. You will return to the world map.",
    exitConfirm: "Exit to map",
    cancel: "Cancel",
    escHint: "Press Esc to open or close this menu.",
  },
  common: {
    close: "Close",
    theme: "Theme",
    themeSystem: "System theme",
    themeLight: "Light theme",
    themeDark: "Dark theme",
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
      `De ${min} à ${max}. La simulation se déroule ensuite vers un futur alternatif.`,
    cancel: "Annuler",
    start: "Lancer la partie",
    starting: "Création du monde...",
    createFailedTitle: "Impossible de lancer la partie",
    createFailed:
      "La partie n'a pas pu être enregistrée dans ce navigateur. Vérifiez que le stockage est autorisé et réessayez.",
    next: "Suivant",
    back: "Retour",
    countryStepTitle: "Bienvenue dans Open Historia",
    countryStepDescription:
      "Choisissez n'importe quel pays du monde. L'histoire diverge à partir de l'année choisie, et vous prenez les commandes.",
    setupStepTitle: "Plantez le décor",
    setupStepDescription: (country) =>
      `Vous prenez la tête de ${country}. Choisissez le point de départ de l'histoire.`,
    howItWorks: [
      {
        title: "Avancez le temps, année par année",
        body: "À chaque tour, l'IA simule une année : elle raconte ce qui se passe et génère des événements concrets à travers le monde.",
      },
      {
        title: "Orientez avec des directives",
        body: "Avant chaque année, vous pouvez donner des directives en langage naturel. La simulation en tient compte pour dérouler la période.",
      },
      {
        title: "Utilisez votre propre IA",
        body: "Les tours fonctionnent avec votre compte OpenRouter, sur vos crédits et sous votre contrôle.",
      },
    ],
    modelLabel: "Modèle d'IA",
    modelSearchPlaceholder: "Rechercher un modèle...",
    modelLoading: "Chargement des modèles...",
    modelLoadError:
      "Impossible de charger la liste des modèles ; le modèle par défaut sera utilisé.",
    modelNoMatch: (query) => `Aucun modèle ne correspond à « ${query} ».`,
    modelDefaultBadge: "Défaut",
    modelBestFree: "Meilleur modèle gratuit",
    modelRotateFree: "Alterner les modèles gratuits",
    modelRotateFreeHint:
      "Répartit chaque tour sur les meilleurs modèles gratuits pour éviter les limites.",
    modelFree: "Gratuit",
    modelPrice: (input, output) =>
      `${input} $ entrée · ${output} $ sortie / 1M tokens`,
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
  game: {
    statusActive: "En cours",
    statusCompleted: "Partie terminée",
    completedNote: "La simulation a atteint sa dernière année.",
    exit: "Quitter la partie",
    briefingTitle: "Briefing",
    advanceYear: "Avancer d'un mois",
    advancing: "Simulation...",
    pause: "Pause",
    play: "Lecture",
    speed: "Vitesse",
    step: "Avancer d'un mois",
    nextEventLabel: "À venir",
    eventProgress: "Avancement",
    eventCountries: "Pays impliqués",
    decisionBadge: "Décision",
    decisionDismiss: "Décider plus tard",
    directivesTitle: "Directives",
    directivesHint: "Ces ordres orientent le mois suivant. Ajoutez-en autant que vous voulez.",
    directivesPlaceholder: "Ajoutez un ordre, puis Entrée...",
    directivesAdd: "Ajouter",
    directivesEmpty: "Aucune directive.",
    directivesRemove: "Retirer la directive",
    directivesPickLocation: "Choisir un lieu sur la carte (facultatif)",
    directivesPicking: "Cliquez sur la carte pour situer cette directive...",
    directivesClearLocation: "Effacer le lieu",
    narrationHeading: "Ce mois-ci",
    emptyFeed:
      "Aucun événement pour l'instant. Avancez le temps pour lancer l'histoire.",
    turnFailedTitle: "Impossible d'avancer dans le temps",
    kinds: {
      political: "Politique",
      military: "Militaire",
      economic: "Économique",
      diplomatic: "Diplomatique",
      social: "Social",
      scientific: "Scientifique",
      disaster: "Catastrophe",
    },
    errors: {
      missingApiKey:
        "Connectez d'abord votre compte OpenRouter pour laisser l'IA piloter la simulation.",
      gameCompleted: "Cette partie a déjà atteint sa dernière année.",
      invalidOutput:
        "L'IA a renvoyé une réponse inattendue. Réessayez d'avancer.",
      network:
        "Impossible de joindre OpenRouter. Vérifiez votre connexion et réessayez.",
      requestFailed: (status, message) =>
        message
          ? `OpenRouter a rejeté la requête (HTTP ${status}) : ${message}`
          : `OpenRouter a rejeté la requête (HTTP ${status}). Vérifiez votre clé, vos crédits et le modèle choisi.`,
      rateLimited:
        "Le fournisseur du modèle limite les requêtes (les modèles gratuits sont très limités). Patientez un instant, réduisez la vitesse, changez de modèle ou ajoutez des crédits OpenRouter.",
      empty: "L'IA a renvoyé une réponse vide. Réessayez.",
      storage: "L'état de la partie n'a pas pu être enregistré. Réessayez.",
      generic: "Une erreur est survenue en avançant dans le temps. Réessayez.",
    },
  },
  menu: {
    open: "Menu",
    settings: "Paramètres",
    settingsTitle: "Paramètres",
    settingsSubtitle: "Choisissez votre langue et connectez l'IA.",
    title: "En pause",
    subtitle: "Gérez votre partie ou reprenez-la.",
    resume: "Reprendre",
    briefing: "Briefing",
    language: "Langue",
    aiAccount: "Compte IA",
    connect: "Connecter",
    manage: "Gérer",
    model: "Modèle d'IA",
    changeModel: "Changer",
    modelDialogTitle: "Choisir le modèle d'IA",
    apply: "Appliquer",
    exportSave: "Exporter la sauvegarde",
    importSave: "Importer une sauvegarde",
    importFailed: "Ce fichier n'est pas une sauvegarde Open Historia valide.",
    exitGame: "Retour à la carte",
    exitConfirmTitle: "Quitter cette partie ?",
    exitConfirmBody:
      "Votre progression reste enregistrée et vous pourrez la reprendre plus tard. Vous reviendrez à la carte du monde.",
    exitConfirm: "Retour à la carte",
    cancel: "Annuler",
    escHint: "Appuyez sur Échap pour ouvrir ou fermer ce menu.",
  },
  common: {
    close: "Fermer",
    theme: "Thème",
    themeSystem: "Thème système",
    themeLight: "Thème clair",
    themeDark: "Thème sombre",
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

/** Maps an advanceTime failure to a localized, user-presentable message. */
export const formatTurnError = (
  messages: Messages,
  error: AdvanceTimeError
): string => {
  const e = messages.game.errors
  switch (error._tag) {
    case "MissingApiKey":
      return e.missingApiKey
    case "GameCompleted":
      return e.gameCompleted
    case "InvalidTurnOutput":
      return e.invalidOutput
    case "CompletionNetworkError":
      return e.network
    case "CompletionRequestFailed":
      return error.status === 429
        ? e.rateLimited
        : e.requestFailed(error.status, error.message)
    case "CompletionEmpty":
      return e.empty
    case "StoreReadError":
    case "StoreWriteError":
      return e.storage
    default:
      return e.generic
  }
}
