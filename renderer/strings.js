// Alle tekster i AI Copilot Mapper på 7 sprog. Bruges både af brugerfladen
// (som <script>) og af hovedprocessen (via require). Nøglerne er de samme som
// i PureBasic-versionens .lng-filer, så oversættelserne kunne flyttes direkte.
(function (root, factory) {
  const m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else root.I18N = m;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LANGS = { da: 'Dansk', en: 'English', de: 'Deutsch', fr: 'Français', it: 'Italiano', es: 'Español', sv: 'Svenska' };

  const S = {
    // ---------- Fra PureBasic-versionens .lng-filer ----------
    MenuOpenAI: { da: "Åbn AI View", en: "Open AI View", de: "KI-Ansicht öffnen", fr: "Ouvrir la vue IA", it: "Apri visualizzazione IA", es: "Abrir vista de IA", sv: "Öppna AI-vy" },
    MenuPause: { da: "Pause mapping", en: "Pause mapping", de: "Zuordnung pausieren", fr: "Mettre le mappage en pause", it: "Metti in pausa mappatura", es: "Pausar reasignación", sv: "Pausa mappning" },
    MenuSettings: { da: "Indstillinger...", en: "Settings...", de: "Einstellungen...", fr: "Paramètres...", it: "Impostazioni...", es: "Configuración...", sv: "Inställningar..." },
    MenuAbout: { da: "Om programmet", en: "About", de: "Über", fr: "À propos", it: "Informazioni", es: "Acerca de", sv: "Om programmet" },
    MenuExit: { da: "Afslut", en: "Exit", de: "Beenden", fr: "Quitter", it: "Esci", es: "Salir", sv: "Avsluta" },
    MenuLanguage: { da: "Sprog", en: "Language", de: "Sprache", fr: "Langue", it: "Lingua", es: "Idioma", sv: "Språk" },
    MenuAutoStart: { da: "Start med Windows", en: "Start with Windows", de: "Mit Windows starten", fr: "Démarrer avec Windows", it: "Avvia con Windows", es: "Iniciar con Windows", sv: "Starta med Windows" },
    FrameAI: { da: "AI Tjeneste", en: "AI Service", de: "KI-Dienst", fr: "Service IA", it: "Servizio IA", es: "Servicio de IA", sv: "AI-tjänst" },
    FrameHotkey: { da: "Genvejstast og Funktion", en: "Hotkey and Function", de: "Tastenkombination und Funktion", fr: "Touche de raccourci et fonction", it: "Tasto di scelta rapida e funzione", es: "Tecla de acceso rápido y función", sv: "Kortkommando och funktion" },
    BtnAddCustom: { da: "Tilføj Custom", en: "Add Custom", de: "Eigene hinzufügen", fr: "Ajouter personnalisée", it: "Aggiungi personalizzata", es: "Añadir personalizada", sv: "Lägg till anpassad" },
    BtnClose: { da: "Luk", en: "Close", de: "Schließen", fr: "Fermer", it: "Chiudi", es: "Cerrar", sv: "Stäng" },
    BtnRecord: { da: "Optag...", en: "Record...", de: "Aufnehmen...", fr: "Enregistrer...", it: "Registra...", es: "Grabar...", sv: "Spela in..." },
    BtnReset: { da: "Nulstil", en: "Reset", de: "Zurücksetzen", fr: "Réinitialiser", it: "Ripristina", es: "Restablecer", sv: "Återställ" },
    HotkeyCurrent: { da: "Aktiv genvej:", en: "Active hotkey:", de: "Aktuelle Tastenkombination:", fr: "Raccourci actif :", it: "Scorciatoia attiva:", es: "Atajo activo:", sv: "Aktivt kortkommando:" },
    HotkeyPrompt: { da: "Tryk på den ønskede tastekombination nu...", en: "Press your desired key combination now...", de: "Drücken Sie jetzt die gewünschte Tastenkombination...", fr: "Appuyez sur la combinaison de touches souhaitée maintenant...", it: "Premi ora la combinazione di tasti desiderata...", es: "Presiona la combinación de teclas deseada ahora...", sv: "Tryck på önskad tangentkombination nu..." },
    HotkeyWaiting: { da: "Venter på tastetryk...", en: "Waiting for key press...", de: "Warte auf Tastendruck...", fr: "En attente d'une touche...", it: "In attesa della pressione di un tasto...", es: "Esperando pulsación de tecla...", sv: "Väntar på tangenttryckning..." },
    HotkeyCancel: { da: "Annuller", en: "Cancel", de: "Abbrechen", fr: "Annuler", it: "Annulla", es: "Cancelar", sv: "Avbryt" },
    CopilotKey: { da: "Copilot-tast", en: "Copilot key", de: "Copilot-Taste", fr: "Touche Copilot", it: "Tasto Copilot", es: "Tecla Copilot", sv: "Copilot-tangent" },
    TrayPaused: { da: "Status: På pause", en: "Status: Paused", de: "Status: Pausiert", fr: "État : En pause", it: "Stato: In pausa", es: "Estado: En pausa", sv: "Status: Pausad" },
    // ---------- Nye i Node-udgaven ----------
    AboutText: { da: "Åbner din foretrukne AI-tjeneste med Copilot-tasten eller din egen genvejstast – i et indbygget vindue eller din browser. Understøtter egne AI-tjenester, også lokale.", en: "Opens your favorite AI service with the Copilot key or your own hotkey, in a built-in window or your browser. Supports custom AI services, including local ones.", de: "Öffnet Ihren bevorzugten KI-Dienst mit der Copilot-Taste oder Ihrer eigenen Tastenkombination – im integrierten Fenster oder im Browser. Unterstützt eigene KI-Dienste, auch lokale.", fr: "Ouvre votre service d'IA préféré avec la touche Copilot ou votre propre raccourci, dans une fenêtre intégrée ou votre navigateur. Prend en charge les services d'IA personnalisés, y compris locaux.", it: "Apre il tuo servizio di IA preferito con il tasto Copilot o una tua scorciatoia, in una finestra integrata o nel browser. Supporta servizi di IA personalizzati, anche locali.", es: "Abre tu servicio de IA favorito con la tecla Copilot o tu propio atajo, en una ventana integrada o en tu navegador. Admite servicios de IA personalizados, también locales.", sv: "Öppnar din favorit-AI-tjänst med Copilot-tangenten eller ditt eget kortkommando, i ett inbyggt fönster eller din webbläsare. Stöder egna AI-tjänster, även lokala." },
    AboutWritten: { da: "Bygget med Electron.", en: "Built with Electron.", de: "Erstellt mit Electron.", fr: "Conçu avec Electron.", it: "Realizzato con Electron.", es: "Hecho con Electron.", sv: "Byggt med Electron." },
    AINew: { da: "Ny AI-tjeneste", en: "New AI service", de: "Neuer KI-Dienst", fr: "Nouveau service d'IA", it: "Nuovo servizio IA", es: "Nuevo servicio de IA", sv: "Ny AI-tjänst" },
    AIEdit: { da: "Rediger AI-tjeneste", en: "Edit AI service", de: "KI-Dienst bearbeiten", fr: "Modifier le service d'IA", it: "Modifica servizio IA", es: "Editar servicio de IA", sv: "Redigera AI-tjänst" },
    FieldName: { da: "Navn", en: "Name", de: "Name", fr: "Nom", it: "Nome", es: "Nombre", sv: "Namn" },
    FieldURL: { da: "URL", en: "URL", de: "URL", fr: "URL", it: "URL", es: "URL", sv: "URL" },
    BtnSave: { da: "Gem", en: "Save", de: "Speichern", fr: "Enregistrer", it: "Salva", es: "Guardar", sv: "Spara" },
    BtnDelete: { da: "Slet", en: "Delete", de: "Löschen", fr: "Supprimer", it: "Elimina", es: "Eliminar", sv: "Ta bort" },
    BtnEdit: { da: "Rediger", en: "Edit", de: "Bearbeiten", fr: "Modifier", it: "Modifica", es: "Editar", sv: "Redigera" },
    ConfirmDelete: { da: "Slet {x}?", en: "Delete {x}?", de: "{x} löschen?", fr: "Supprimer {x} ?", it: "Eliminare {x}?", es: "¿Eliminar {x}?", sv: "Ta bort {x}?" },
    MsgFillNameUrl: { da: "Udfyld et navn og en gyldig URL.", en: "Enter a name and a valid URL.", de: "Bitte einen Namen und eine gültige URL eingeben.", fr: "Saisissez un nom et une URL valide.", it: "Inserisci un nome e un URL valido.", es: "Introduce un nombre y una URL válida.", sv: "Ange ett namn och en giltig URL." },
    HotkeyTaken: { da: "Genvejen kunne ikke registreres. Den bruges måske af et andet program.", en: "The hotkey could not be registered. It may be in use by another program.", de: "Die Tastenkombination konnte nicht registriert werden. Sie wird möglicherweise von einem anderen Programm verwendet.", fr: "Le raccourci n'a pas pu être enregistré. Il est peut-être utilisé par un autre programme.", it: "Impossibile registrare la scorciatoia. Potrebbe essere usata da un altro programma.", es: "No se pudo registrar el atajo. Puede que lo use otro programa.", sv: "Kortkommandot kunde inte registreras. Det kanske används av ett annat program." },
    HotkeyNeedsModifier: { da: "Brug en kombination med Ctrl, Alt, Shift eller Win – eller en F-tast.", en: "Use a combination with Ctrl, Alt, Shift or Win, or an F key.", de: "Verwenden Sie eine Kombination mit Strg, Alt, Umschalt oder Win oder eine F-Taste.", fr: "Utilisez une combinaison avec Ctrl, Alt, Maj ou Win, ou une touche F.", it: "Usa una combinazione con Ctrl, Alt, Maiusc o Win, oppure un tasto F.", es: "Usa una combinación con Ctrl, Alt, Mayús o Win, o una tecla F.", sv: "Använd en kombination med Ctrl, Alt, Skift eller Win, eller en F-tangent." },
    OpenEmbedded: { da: "Åbn i det indbyggede vindue (ellers i standardbrowseren)", en: "Open in the built-in window (otherwise in the default browser)", de: "Im integrierten Fenster öffnen (sonst im Standardbrowser)", fr: "Ouvrir dans la fenêtre intégrée (sinon dans le navigateur par défaut)", it: "Apri nella finestra integrata (altrimenti nel browser predefinito)", es: "Abrir en la ventana integrada (si no, en el navegador predeterminado)", sv: "Öppna i det inbyggda fönstret (annars i standardwebbläsaren)" },
    TipSidebar: { da: "Vis/skjul sidepanel", en: "Show/hide sidebar", de: "Seitenleiste ein/aus", fr: "Afficher/masquer le panneau latéral", it: "Mostra/nascondi barra laterale", es: "Mostrar/ocultar barra lateral", sv: "Visa/dölj sidopanel" },
    TipBack: { da: "Tilbage", en: "Back", de: "Zurück", fr: "Précédent", it: "Indietro", es: "Atrás", sv: "Bakåt" },
    TipForward: { da: "Frem", en: "Forward", de: "Vorwärts", fr: "Suivant", it: "Avanti", es: "Adelante", sv: "Framåt" },
    TipReload: { da: "Genindlæs", en: "Reload", de: "Neu laden", fr: "Recharger", it: "Ricarica", es: "Recargar", sv: "Läs in igen" },
    TipExternal: { da: "Åbn i browser", en: "Open in browser", de: "Im Browser öffnen", fr: "Ouvrir dans le navigateur", it: "Apri nel browser", es: "Abrir en el navegador", sv: "Öppna i webbläsare" },
    AlwaysExternal: { da: "Åbn altid i browseren", en: "Always open in browser", de: "Immer im Browser öffnen", fr: "Toujours ouvrir dans le navigateur", it: "Apri sempre nel browser", es: "Abrir siempre en el navegador", sv: "Öppna alltid i webbläsaren" },
    OpensInBrowser: { da: "{x} åbnes i din standardbrowser.", en: "{x} opens in your default browser.", de: "{x} wird im Standardbrowser geöffnet.", fr: "{x} s'ouvre dans votre navigateur par défaut.", it: "{x} si apre nel browser predefinito.", es: "{x} se abre en tu navegador predeterminado.", sv: "{x} öppnas i din standardwebbläsare." },
  };

  let lang = 'en';
  function detect(pref) {
    const code = String(pref || '').slice(0, 2).toLowerCase();
    return LANGS[code] ? code : 'en';
  }
  function t(key, vars = {}) {
    const e = S[key];
    const s = e ? (e[lang] ?? e.en) : key;
    return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  }
  // Menutekst uden "..." og etiket uden ":" til brug i den nye brugerflade
  const plain = (s) => s.replace(/\s*(\.\.\.|…|:)\s*$/, '');
  return {
    LANGS, t, detect, plain,
    get lang() { return lang; },
    setLang(l) { lang = LANGS[l] ? l : 'en'; },
  };
});
