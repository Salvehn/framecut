(function (root) {
  'use strict';
  const dictionaries = {
    en: {
      appTag: 'PLAYER & TRIMMER', workspace: 'Workspace', player: 'Media player', recent: 'RECENT FILES',
      noRecent: 'Your recently opened videos will appear here.', localOnly: 'Your files stay on this device',
      language: 'Language', session: 'New session', openVideo: 'Open video', openAnother: 'Open another video',
      ready: 'Ready when you are', emptyTitle: 'Your video. The perfect cut.',
      emptySubtitle: 'Watch, find the moment, and keep the part that matters.',
      dropHint: 'or drop a video anywhere in this window', formatHint: 'MP4, MKV, MOV, AVI, WebM and more',
      shortcut: 'Shortcut', trimVideo: 'Trim video', trimSubtitle: 'A little less. Just right.',
      selection: 'SELECTION', start: 'Start', end: 'End', setStart: 'Set start at playhead (I)',
      setEnd: 'Set end at playhead (O)', selectedDuration: 'Clip duration', exportMode: 'EXPORT MODE',
      precise: 'Precise cut', preciseHint: 'Exact frame boundaries · MP4 (H.264)',
      fast: 'Fast cut', fastHint: 'Original quality · nearest keyframe',
      fastNote: 'The start may shift to a nearby keyframe. Choose Precise cut for an exact selection.',
      safeExport: 'Exports a new file. Your original stays intact.', saveClip: 'Export clip',
      timeline: 'Timeline', reset: 'Reset selection', preview: 'Preview clip', previewing: 'Stop preview',
      dragHandles: 'Drag the handles to choose your clip', inPoint: 'Start of selection', outPoint: 'End of selection',
      play: 'Play (Space)', pause: 'Pause (Space)', back: 'Back 5 seconds (←)', forward: 'Forward 5 seconds (→)',
      mute: 'Mute (M)', unmute: 'Unmute (M)', volume: 'Volume', speed: 'Playback speed', fullscreen: 'Full screen (F)',
      minimize: 'Minimize', maximize: 'Maximize / restore', close: 'Close', total: 'Total',
      loading: 'Opening video…', preparing: 'Preparing compatible preview…', preparingHint: 'This format needs a preview. The original file is used for export.',
      cancel: 'Cancel', exporting: 'Exporting clip…', exportHint: 'You can cancel at any time.',
      complete: 'Clip exported', completeHint: 'Your clip is ready.', reveal: 'Show in folder', done: 'Done',
      cancelled: 'Export cancelled', errorTitle: 'Something went wrong', errorGeneric: 'Could not process this video. Check the file and try again.',
      errorMissing: 'This file has moved or is no longer available.', errorVideo: 'This file does not contain a playable video.',
      errorDuration: 'The video duration could not be read.', errorRange: 'Choose a valid range of at least 0.04 seconds.',
      errorOverwrite: 'Choose a different filename to protect your original video.',
      errorBusy: 'Wait for the current operation to finish.', errorTimeout: 'The file took too long to open. Try a local video file.',
      playbackError: 'Could not play this video. Try another file.', preparingFailed: 'Could not prepare a preview for this format.',
      invalidTime: 'Use HH:MM:SS.mmm, MM:SS.mmm, or seconds.', openDialog: 'Open a video', saveDialog: 'Export video clip',
      videoFiles: 'Video files', allFiles: 'All files', closeExport: 'A clip is being exported. Cancel the export and close Framecut?',
      stay: 'Keep exporting', stopAndClose: 'Cancel and close', dropTitle: 'Drop to open', dropSubtitle: 'Let’s find your next great moment.',
      videoLoaded: 'Video loaded', selectionReady: 'Selection ready', frameStep: 'Previous / next frame: , / .',
      shortcuts: 'Keyboard shortcuts', keysHelp: 'Space — play/pause · ←/→ — 5 seconds · I/O — set boundaries · ,/. — frame · F — full screen · M — mute · Ctrl+O — open · Ctrl+S — export',
      audio: 'Audio', noAudio: 'No audio', original: 'Original', milliseconds: 'Time, including milliseconds',
      loadingFile: 'Opening {name}', footer: 'A simpler way to keep the good parts.', preparingProgress: 'Preparing preview · {percent}%',
      savingProgress: 'Exporting · {percent}%', fileSize: 'File size', version: 'Version {version}',
      errorExport: 'Could not export the clip. Check free disk space and write access. For an incompatible fast cut, try Precise cut.'
    },
    ru: {
      appTag: 'ПЛЕЕР И ОБРЕЗКА', workspace: 'Рабочая область', player: 'Медиаплеер', recent: 'НЕДАВНИЕ ФАЙЛЫ',
      noRecent: 'Здесь появятся недавно открытые видео.', localOnly: 'Ваши файлы остаются на устройстве',
      language: 'Язык', session: 'Новый сеанс', openVideo: 'Открыть видео', openAnother: 'Открыть другое видео',
      ready: 'Всё готово к просмотру', emptyTitle: 'Ваше видео. Нужный момент.',
      emptySubtitle: 'Смотрите, находите нужное и сохраняйте главное.',
      dropHint: 'или перетащите видео в окно', formatHint: 'MP4, MKV, MOV, AVI, WebM и другие',
      shortcut: 'Сочетание клавиш', trimVideo: 'Обрезать видео', trimSubtitle: 'Оставьте только нужное.',
      selection: 'ВЫБРАННЫЙ ФРАГМЕНТ', start: 'Начало', end: 'Конец', setStart: 'Начало в текущей позиции (I)',
      setEnd: 'Конец в текущей позиции (O)', selectedDuration: 'Длительность экспорта', exportMode: 'РЕЖИМ ЭКСПОРТА',
      precise: 'Точная обрезка', preciseHint: 'До нужного кадра · MP4 (H.264)',
      fast: 'Быстрая обрезка', fastHint: 'Без перекодирования · по ключевому кадру',
      fastNote: 'Начало может сместиться к ближайшему ключевому кадру. Для точных границ выберите точную обрезку.',
      safeExport: 'Новый файл. Оригинал останется целым.', saveClip: 'Экспортировать фрагмент',
      timeline: 'Шкала времени', reset: 'Сбросить выделение', preview: 'Просмотр фрагмента', previewing: 'Остановить просмотр',
      dragHandles: 'Перетащите границы, чтобы выбрать фрагмент', inPoint: 'Начало фрагмента', outPoint: 'Конец фрагмента',
      play: 'Воспроизвести (Пробел)', pause: 'Пауза (Пробел)', back: 'Назад на 5 секунд (←)', forward: 'Вперёд на 5 секунд (→)',
      mute: 'Выключить звук (M)', unmute: 'Включить звук (M)', volume: 'Громкость', speed: 'Скорость', fullscreen: 'Полный экран (F)',
      minimize: 'Свернуть', maximize: 'Развернуть / восстановить', close: 'Закрыть', total: 'Всего',
      loading: 'Открываем видео…', preparing: 'Подготовка совместимого просмотра…', preparingHint: 'Для этого формата нужен предпросмотр. Обрезка будет из оригинала.',
      cancel: 'Отмена', exporting: 'Экспортируем фрагмент…', exportHint: 'Экспорт можно отменить в любой момент.',
      complete: 'Фрагмент экспортирован', completeHint: 'Ваше видео готово.', reveal: 'Показать в папке', done: 'Готово',
      cancelled: 'Экспорт отменён', errorTitle: 'Не удалось выполнить действие', errorGeneric: 'Не удалось обработать видео. Проверьте файл и попробуйте снова.',
      errorMissing: 'Файл перемещён или больше недоступен.', errorVideo: 'В этом файле нет подходящего видеопотока.',
      errorDuration: 'Не удалось определить длительность видео.', errorRange: 'Выберите корректный фрагмент длительностью от 0,04 секунды.',
      errorOverwrite: 'Выберите другое имя, чтобы сохранить исходное видео.',
      errorBusy: 'Дождитесь завершения текущей операции.', errorTimeout: 'Открытие заняло слишком много времени. Попробуйте локальный файл.',
      playbackError: 'Не удалось воспроизвести видео. Попробуйте другой файл.', preparingFailed: 'Не удалось подготовить просмотр этого формата.',
      invalidTime: 'Формат: ЧЧ:ММ:СС.мс, ММ:СС.мс или секунды.', openDialog: 'Открыть видео', saveDialog: 'Экспортировать фрагмент видео',
      videoFiles: 'Видеофайлы', allFiles: 'Все файлы', closeExport: 'Фрагмент ещё экспортируется. Отменить экспорт и закрыть Framecut?',
      stay: 'Продолжить экспорт', stopAndClose: 'Отменить и закрыть', dropTitle: 'Отпустите, чтобы открыть', dropSubtitle: 'Найдём тот самый момент.',
      videoLoaded: 'Видео открыто', selectionReady: 'Фрагмент выбран', frameStep: 'Предыдущий / следующий кадр: , / .',
      shortcuts: 'Горячие клавиши', keysHelp: 'Пробел — пауза · ←/→ — 5 секунд · I/O — границы · ,/. — кадр · F — полный экран · M — звук · Ctrl+O — открыть · Ctrl+S — экспорт',
      audio: 'Со звуком', noAudio: 'Без звука', original: 'Оригинал', milliseconds: 'Время с точностью до миллисекунд',
      loadingFile: 'Открываем {name}', footer: 'Всё лишнее остаётся за кадром.', preparingProgress: 'Подготовка просмотра · {percent}%',
      savingProgress: 'Экспорт · {percent}%', fileSize: 'Размер файла', version: 'Версия {version}',
      errorExport: 'Не удалось экспортировать фрагмент. Проверьте место на диске и доступ к папке. Если быстрая обрезка несовместима с форматом, выберите точную.'
    },
    de: {
      appTag: 'PLAYER & VIDEOSCHNITT', workspace: 'Arbeitsbereich', player: 'Mediaplayer', recent: 'ZULETZT GEÖFFNET',
      noRecent: 'Zuletzt geöffnete Videos erscheinen hier.', localOnly: 'Deine Dateien bleiben auf diesem Gerät',
      language: 'Sprache', session: 'Neue Sitzung', openVideo: 'Video öffnen', openAnother: 'Anderes Video öffnen',
      ready: 'Bereit für dein Video', emptyTitle: 'Dein Video. Der perfekte Schnitt.',
      emptySubtitle: 'Ansehen, den Moment finden und das Beste behalten.',
      dropHint: 'oder ein Video in dieses Fenster ziehen', formatHint: 'MP4, MKV, MOV, AVI, WebM und mehr',
      shortcut: 'Tastenkürzel', trimVideo: 'Video kürzen', trimSubtitle: 'Genau der richtige Ausschnitt.',
      selection: 'AUSWAHL', start: 'Anfang', end: 'Ende', setStart: 'Anfang an Abspielposition setzen (I)',
      setEnd: 'Ende an Abspielposition setzen (O)', selectedDuration: 'Clipdauer', exportMode: 'EXPORTMODUS',
      precise: 'Präziser Schnitt', preciseHint: 'Bildgenau · MP4 (H.264)',
      fast: 'Schneller Schnitt', fastHint: 'Originalqualität · nächstes Schlüsselbild',
      fastNote: 'Der Anfang kann zum nächsten Schlüsselbild verschoben werden. Für exakte Grenzen den präzisen Schnitt wählen.',
      safeExport: 'Neue Datei. Das Original bleibt erhalten.', saveClip: 'Clip exportieren',
      timeline: 'Zeitleiste', reset: 'Auswahl zurücksetzen', preview: 'Clip ansehen', previewing: 'Vorschau beenden',
      dragHandles: 'Die Griffe ziehen, um den Clip auszuwählen', inPoint: 'Anfang der Auswahl', outPoint: 'Ende der Auswahl',
      play: 'Abspielen (Leertaste)', pause: 'Pause (Leertaste)', back: '5 Sekunden zurück (←)', forward: '5 Sekunden vor (→)',
      mute: 'Stummschalten (M)', unmute: 'Ton einschalten (M)', volume: 'Lautstärke', speed: 'Geschwindigkeit', fullscreen: 'Vollbild (F)',
      minimize: 'Minimieren', maximize: 'Maximieren / wiederherstellen', close: 'Schließen', total: 'Gesamt',
      loading: 'Video wird geöffnet…', preparing: 'Kompatible Vorschau wird erstellt…', preparingHint: 'Dieses Format benötigt eine Vorschau. Für den Export wird das Original verwendet.',
      cancel: 'Abbrechen', exporting: 'Clip wird exportiert…', exportHint: 'Du kannst jederzeit abbrechen.',
      complete: 'Clip exportiert', completeHint: 'Dein Clip ist fertig.', reveal: 'Im Ordner anzeigen', done: 'Fertig',
      cancelled: 'Export abgebrochen', errorTitle: 'Ein Fehler ist aufgetreten', errorGeneric: 'Das Video konnte nicht verarbeitet werden. Bitte die Datei prüfen und erneut versuchen.',
      errorMissing: 'Die Datei wurde verschoben oder ist nicht mehr verfügbar.', errorVideo: 'Diese Datei enthält kein abspielbares Video.',
      errorDuration: 'Die Videodauer konnte nicht gelesen werden.', errorRange: 'Einen gültigen Bereich von mindestens 0,04 Sekunden wählen.',
      errorOverwrite: 'Einen anderen Dateinamen wählen, um das Original zu schützen.',
      errorBusy: 'Bitte warten, bis der aktuelle Vorgang abgeschlossen ist.', errorTimeout: 'Das Öffnen dauert zu lange. Bitte eine lokale Videodatei versuchen.',
      playbackError: 'Das Video konnte nicht abgespielt werden. Bitte eine andere Datei versuchen.', preparingFailed: 'Für dieses Format konnte keine Vorschau erstellt werden.',
      invalidTime: 'Format: HH:MM:SS.mmm, MM:SS.mmm oder Sekunden.', openDialog: 'Video öffnen', saveDialog: 'Videoclip exportieren',
      videoFiles: 'Videodateien', allFiles: 'Alle Dateien', closeExport: 'Ein Clip wird exportiert. Export abbrechen und Framecut schließen?',
      stay: 'Weiter exportieren', stopAndClose: 'Abbrechen und schließen', dropTitle: 'Zum Öffnen ablegen', dropSubtitle: 'Finden wir deinen nächsten besonderen Moment.',
      videoLoaded: 'Video geöffnet', selectionReady: 'Auswahl bereit', frameStep: 'Vorheriges / nächstes Bild: , / .',
      shortcuts: 'Tastenkürzel', keysHelp: 'Leertaste — Pause · ←/→ — 5 Sekunden · I/O — Grenzen · ,/. — Bild · F — Vollbild · M — Ton · Strg+O — öffnen · Strg+S — exportieren',
      audio: 'Mit Ton', noAudio: 'Ohne Ton', original: 'Original', milliseconds: 'Zeit mit Millisekunden',
      loadingFile: '{name} wird geöffnet', footer: 'Das Beste einfach behalten.', preparingProgress: 'Vorschau erstellen · {percent}%',
      savingProgress: 'Exportieren · {percent}%', fileSize: 'Dateigröße', version: 'Version {version}',
      errorExport: 'Der Clip konnte nicht exportiert werden. Speicherplatz und Schreibrechte prüfen. Bei inkompatiblem schnellen Schnitt den präzisen Schnitt versuchen.'
    },
    es: {
      appTag: 'REPRODUCTOR Y RECORTE', workspace: 'Espacio de trabajo', player: 'Reproductor', recent: 'ARCHIVOS RECIENTES',
      noRecent: 'Aquí aparecerán los vídeos que abras.', localOnly: 'Tus archivos se quedan en este dispositivo',
      language: 'Idioma', session: 'Nueva sesión', openVideo: 'Abrir vídeo', openAnother: 'Abrir otro vídeo',
      ready: 'Todo listo para tu vídeo', emptyTitle: 'Tu vídeo. El corte perfecto.',
      emptySubtitle: 'Mira, encuentra el momento y quédate con lo mejor.',
      dropHint: 'o arrastra un vídeo a esta ventana', formatHint: 'MP4, MKV, MOV, AVI, WebM y más',
      shortcut: 'Atajo', trimVideo: 'Recortar vídeo', trimSubtitle: 'El fragmento justo.',
      selection: 'SELECCIÓN', start: 'Inicio', end: 'Final', setStart: 'Fijar inicio en la posición actual (I)',
      setEnd: 'Fijar final en la posición actual (O)', selectedDuration: 'Duración del clip', exportMode: 'MODO DE EXPORTACIÓN',
      precise: 'Corte preciso', preciseHint: 'Fotograma exacto · MP4 (H.264)',
      fast: 'Corte rápido', fastHint: 'Calidad original · fotograma clave cercano',
      fastNote: 'El inicio puede desplazarse al fotograma clave más cercano. Elige Corte preciso para límites exactos.',
      safeExport: 'Un archivo nuevo. El original queda intacto.', saveClip: 'Exportar clip',
      timeline: 'Línea de tiempo', reset: 'Restablecer selección', preview: 'Ver fragmento', previewing: 'Detener vista previa',
      dragHandles: 'Arrastra los extremos para elegir tu clip', inPoint: 'Inicio de la selección', outPoint: 'Final de la selección',
      play: 'Reproducir (Espacio)', pause: 'Pausa (Espacio)', back: 'Retroceder 5 segundos (←)', forward: 'Avanzar 5 segundos (→)',
      mute: 'Silenciar (M)', unmute: 'Activar sonido (M)', volume: 'Volumen', speed: 'Velocidad', fullscreen: 'Pantalla completa (F)',
      minimize: 'Minimizar', maximize: 'Maximizar / restaurar', close: 'Cerrar', total: 'Total',
      loading: 'Abriendo vídeo…', preparing: 'Preparando una vista previa compatible…', preparingHint: 'Este formato necesita una vista previa. El archivo original se usa para exportar.',
      cancel: 'Cancelar', exporting: 'Exportando clip…', exportHint: 'Puedes cancelar en cualquier momento.',
      complete: 'Clip exportado', completeHint: 'Tu clip está listo.', reveal: 'Mostrar en carpeta', done: 'Listo',
      cancelled: 'Exportación cancelada', errorTitle: 'Algo ha fallado', errorGeneric: 'No se pudo procesar el vídeo. Comprueba el archivo e inténtalo de nuevo.',
      errorMissing: 'El archivo se ha movido o ya no está disponible.', errorVideo: 'Este archivo no contiene un vídeo reproducible.',
      errorDuration: 'No se pudo leer la duración del vídeo.', errorRange: 'Elige un intervalo válido de al menos 0,04 segundos.',
      errorOverwrite: 'Elige otro nombre para proteger el vídeo original.',
      errorBusy: 'Espera a que termine la operación actual.', errorTimeout: 'El archivo tarda demasiado en abrirse. Prueba con un vídeo local.',
      playbackError: 'No se pudo reproducir este vídeo. Prueba con otro archivo.', preparingFailed: 'No se pudo preparar una vista previa de este formato.',
      invalidTime: 'Usa HH:MM:SS.mmm, MM:SS.mmm o segundos.', openDialog: 'Abrir un vídeo', saveDialog: 'Exportar fragmento de vídeo',
      videoFiles: 'Archivos de vídeo', allFiles: 'Todos los archivos', closeExport: 'Se está exportando un clip. ¿Cancelar la exportación y cerrar Framecut?',
      stay: 'Seguir exportando', stopAndClose: 'Cancelar y cerrar', dropTitle: 'Suelta para abrir', dropSubtitle: 'Vamos a encontrar tu próximo gran momento.',
      videoLoaded: 'Vídeo abierto', selectionReady: 'Selección lista', frameStep: 'Fotograma anterior / siguiente: , / .',
      shortcuts: 'Atajos de teclado', keysHelp: 'Espacio — pausa · ←/→ — 5 segundos · I/O — límites · ,/. — fotograma · F — pantalla completa · M — sonido · Ctrl+O — abrir · Ctrl+S — exportar',
      audio: 'Con audio', noAudio: 'Sin audio', original: 'Original', milliseconds: 'Tiempo con milisegundos',
      loadingFile: 'Abriendo {name}', footer: 'Una forma más sencilla de quedarte con lo mejor.', preparingProgress: 'Preparando vista previa · {percent}%',
      savingProgress: 'Exportando · {percent}%', fileSize: 'Tamaño', version: 'Versión {version}',
      errorExport: 'No se pudo exportar el clip. Comprueba el espacio libre y los permisos. Si el corte rápido es incompatible, prueba el corte preciso.'
    }
  };
  const updateStrings = {
    en: { checkUpdates: 'Check for updates', updateChecking: 'Checking…', updateAvailable: 'Version {version} available', downloadUpdate: 'Download update',
      updateDownloading: 'Downloading · {percent}%', installUpdate: 'Update and restart', updateCurrent: 'You are up to date', updateError: 'Could not check for updates. Try again.',
      updateReady: 'Verified and ready to install', updateIdle: 'Signed updates from GitHub', updatePortable: 'Download new version', cancelUpdate: 'Cancel download',
      updateRetry: 'Retry update', updateDev: 'Install the app to update automatically', updateInstalling: 'Installing…' },
    ru: { checkUpdates: 'Проверить обновления', updateChecking: 'Проверяем…', updateAvailable: 'Доступна версия {version}', downloadUpdate: 'Скачать обновление',
      updateDownloading: 'Загрузка · {percent}%', installUpdate: 'Обновить и перезапустить', updateCurrent: 'Установлена актуальная версия', updateError: 'Не удалось проверить обновления. Повторите попытку.',
      updateReady: 'Проверено, готово к установке', updateIdle: 'Подписанные обновления с GitHub', updatePortable: 'Скачать новую версию', cancelUpdate: 'Отменить загрузку',
      updateRetry: 'Повторить обновление', updateDev: 'Автообновление доступно после установки', updateInstalling: 'Устанавливаем…' },
    de: { checkUpdates: 'Updates suchen', updateChecking: 'Wird geprüft…', updateAvailable: 'Version {version} verfügbar', downloadUpdate: 'Update herunterladen',
      updateDownloading: 'Herunterladen · {percent}%', installUpdate: 'Aktualisieren und neu starten', updateCurrent: 'Du bist auf dem neuesten Stand', updateError: 'Updates konnten nicht geprüft werden. Bitte erneut versuchen.',
      updateReady: 'Geprüft und bereit zur Installation', updateIdle: 'Signierte Updates von GitHub', updatePortable: 'Neue Version herunterladen', cancelUpdate: 'Download abbrechen',
      updateRetry: 'Update erneut versuchen', updateDev: 'Für automatische Updates die App installieren', updateInstalling: 'Wird installiert…' },
    es: { checkUpdates: 'Buscar actualizaciones', updateChecking: 'Comprobando…', updateAvailable: 'Versión {version} disponible', downloadUpdate: 'Descargar actualización',
      updateDownloading: 'Descargando · {percent}%', installUpdate: 'Actualizar y reiniciar', updateCurrent: 'Tienes la última versión', updateError: 'No se pudieron buscar actualizaciones. Inténtalo de nuevo.',
      updateReady: 'Verificada y lista para instalar', updateIdle: 'Actualizaciones firmadas de GitHub', updatePortable: 'Descargar nueva versión', cancelUpdate: 'Cancelar descarga',
      updateRetry: 'Reintentar actualización', updateDev: 'Instala la aplicación para actualizar automáticamente', updateInstalling: 'Instalando…' }
  };
  for (const language of Object.keys(dictionaries)) Object.assign(dictionaries[language], updateStrings[language]);
  const updatePanelStrings = {
    en: { updateTitle: 'App updates', updateFailed: 'Could not update the app', updateDownloadingVersion: 'Downloading version {version}', updateRestartHint: 'Framecut will restart to install the update.', updateSpeed: '{size}/s' },
    ru: { updateTitle: 'Обновления приложения', updateFailed: 'Не удалось обновить приложение', updateDownloadingVersion: 'Загрузка версии {version}', updateRestartHint: 'Framecut перезапустится для установки обновления.', updateSpeed: '{size}/с' },
    de: { updateTitle: 'App-Updates', updateFailed: 'Die App konnte nicht aktualisiert werden', updateDownloadingVersion: 'Version {version} wird geladen', updateRestartHint: 'Framecut startet zur Installation des Updates neu.', updateSpeed: '{size}/s' },
    es: { updateTitle: 'Actualizaciones', updateFailed: 'No se pudo actualizar la aplicación', updateDownloadingVersion: 'Descargando la versión {version}', updateRestartHint: 'Framecut se reiniciará para instalar la actualización.', updateSpeed: '{size}/s' }
  };
  for (const language of Object.keys(dictionaries)) Object.assign(dictionaries[language], updatePanelStrings[language]);
  const sharingStrings = {
    en: { share: 'Share clip', copyFile: 'Copy file', dragShare: 'Drag the clip into a chat or copy it.', preparingShare: 'Preparing clip', temporaryShare: 'Temporary MP4 · no save dialog', telegramShareReady: 'Choose a recipient in Telegram.', sharePaste: 'File copied. Paste it into a chat (Ctrl+V) or drag it from here.' },
    ru: { share: 'Поделиться', copyFile: 'Копировать файл', dragShare: 'Перетащите фрагмент в чат или скопируйте.', preparingShare: 'Подготовка фрагмента', temporaryShare: 'Временный MP4 · без сохранения вручную', telegramShareReady: 'Выберите получателя в Telegram.', sharePaste: 'Файл скопирован. Вставьте в чат (Ctrl+V) или перетащите отсюда.' },
    de: { share: 'Clip teilen', copyFile: 'Datei kopieren', dragShare: 'Clip in einen Chat ziehen oder kopieren.', preparingShare: 'Clip wird vorbereitet', temporaryShare: 'Temporäre MP4 · kein Speicherdialog', telegramShareReady: 'Empfänger in Telegram auswählen.', sharePaste: 'Datei kopiert. Im Chat einfügen (Strg+V) oder von hier ziehen.' },
    es: { share: 'Compartir clip', copyFile: 'Copiar archivo', dragShare: 'Arrastra el clip a un chat o cópialo.', preparingShare: 'Preparando clip', temporaryShare: 'MP4 temporal · sin diálogo de guardado', telegramShareReady: 'Elige un destinatario en Telegram.', sharePaste: 'Archivo copiado. Pégalo en un chat (Ctrl+V) o arrástralo desde aquí.' }
  };
  for (const language of Object.keys(dictionaries)) Object.assign(dictionaries[language], sharingStrings[language]);
  const editingStrings = {
    en: { cutMode: 'Cut', cutFast: 'Fast', cutPrecise: 'Precise', newFile: 'New file', overwrite: 'Overwrite', overwriteHint: 'Exports over the original file.', overwriteAction: 'Overwrite', saveAction: 'Export', speedExportHint: 'Changing speed requires precise encoding of video and audio.' },
    ru: { cutMode: 'Обрезка', cutFast: 'Быстрая', cutPrecise: 'Точная', newFile: 'Новый файл', overwrite: 'Перезапись', overwriteHint: 'Экспорт с заменой исходного файла.', overwriteAction: 'Перезаписать', saveAction: 'Экспорт', speedExportHint: 'Изменение скорости требует точного перекодирования видео и звука.' },
    de: { cutMode: 'Schnitt', cutFast: 'Schnell', cutPrecise: 'Präzise', newFile: 'Neue Datei', overwrite: 'Ersetzen', overwriteHint: 'Exportiert über die Originaldatei.', overwriteAction: 'Ersetzen', saveAction: 'Exportieren', speedExportHint: 'Eine andere Geschwindigkeit erfordert eine präzise Kodierung von Video und Audio.' },
    es: { cutMode: 'Corte', cutFast: 'Rápido', cutPrecise: 'Preciso', newFile: 'Nuevo archivo', overwrite: 'Sobrescribir', overwriteHint: 'Exporta reemplazando el archivo original.', overwriteAction: 'Sobrescribir', saveAction: 'Exportar', speedExportHint: 'Cambiar la velocidad requiere codificar el vídeo y el audio con precisión.' }
  };
  for (const language of Object.keys(dictionaries)) Object.assign(dictionaries[language], editingStrings[language]);
  const timelineStrings = {
    en: { timelineZoom: 'Timeline zoom', zoomIn: 'Zoom in around playhead', zoomOut: 'Zoom out around playhead', zoomReset: 'Show entire video', timelineNavigation: 'Timeline: Ctrl + wheel zooms around the pointer; wheel scrolls. Hold a trim handle for precise trimming.', speed: 'Playback and export speed', selectedDuration: 'Export duration' },
    ru: { timelineZoom: 'Масштаб таймлайна', zoomIn: 'Приблизить текущую позицию', zoomOut: 'Отдалить текущую позицию', zoomReset: 'Показать видео целиком', timelineNavigation: 'Ctrl + колесо — зум под курсором; колесо — прокрутка. Удерживайте границу для точной обрезки.', speed: 'Скорость просмотра и экспорта', selectedDuration: 'Длительность экспорта' },
    de: { timelineZoom: 'Zeitleistenzoom', zoomIn: 'An der Abspielposition vergrößern', zoomOut: 'An der Abspielposition verkleinern', zoomReset: 'Gesamtes Video anzeigen', timelineNavigation: 'Strg + Mausrad zoomt am Zeiger; Mausrad scrollt. Schnittgriff für präzisen Schnitt halten.', speed: 'Wiedergabe- und Exportgeschwindigkeit', selectedDuration: 'Exportdauer' },
    es: { timelineZoom: 'Zoom de la línea de tiempo', zoomIn: 'Acercar la posición actual', zoomOut: 'Alejar la posición actual', zoomReset: 'Mostrar todo el vídeo', timelineNavigation: 'Ctrl + rueda amplía bajo el cursor; la rueda desplaza. Mantén un extremo para recortar con precisión.', speed: 'Velocidad de reproducción y exportación', selectedDuration: 'Duración de exportación' }
  };
  for (const language of Object.keys(dictionaries)) Object.assign(dictionaries[language], timelineStrings[language]);
  const exportModeStrings = {
    en: { cutMode: 'Export quality', cutFast: 'Original quality', cutPrecise: 'Frame accurate', cutCopyHint: 'No re-encoding · start may shift', cutFrameHint: 'Exact boundaries · re-encodes the clip', windowAlmostMaximized: 'Almost maximized' },
    ru: { cutMode: 'Качество экспорта', cutFast: 'Исходное качество', cutPrecise: 'Точно по кадрам', cutCopyHint: 'Без потерь · начало может сместиться', cutFrameHint: 'Точные границы · с перекодированием', windowAlmostMaximized: 'Почти максимизировать' },
    de: { cutMode: 'Exportqualität', cutFast: 'Originalqualität', cutPrecise: 'Bildgenau', cutCopyHint: 'Ohne Neukodierung · Start kann abweichen', cutFrameHint: 'Exakte Grenzen · kodiert den Clip neu', windowAlmostMaximized: 'Fast maximiert' },
    es: { cutMode: 'Calidad de exportación', cutFast: 'Calidad original', cutPrecise: 'Por fotogramas', cutCopyHint: 'Sin recodificar · el inicio puede variar', cutFrameHint: 'Límites exactos · recodifica el clip', windowAlmostMaximized: 'Casi maximizada' }
  };
  for (const language of Object.keys(dictionaries)) Object.assign(dictionaries[language], exportModeStrings[language]);
  const settingsStrings = {
    en: { settings: 'Settings', windowsIntegration: 'Windows', contextMenu: 'Explorer context menu', defaultPlayer: 'Default video player', makeDefault: 'Set as default', installedRequired: 'Available in the installed version.', contextOpen: 'Open in Framecut', selectDefault: 'Choose Framecut in Windows Settings.' },
    ru: { settings: 'Настройки', windowsIntegration: 'Windows', contextMenu: 'Контекстное меню', defaultPlayer: 'Плеер по умолчанию', makeDefault: 'Выбрать', installedRequired: 'Доступно в установленной версии.', contextOpen: 'Открыть в Framecut', selectDefault: 'Выберите Framecut в настройках Windows.' },
    de: { settings: 'Einstellungen', windowsIntegration: 'Windows', contextMenu: 'Explorer-Kontextmenü', defaultPlayer: 'Standard-Videoplayer', makeDefault: 'Als Standard', installedRequired: 'In der installierten Version verfügbar.', contextOpen: 'In Framecut öffnen', selectDefault: 'Framecut in den Windows-Einstellungen auswählen.' },
    es: { settings: 'Ajustes', windowsIntegration: 'Windows', contextMenu: 'Menú contextual', defaultPlayer: 'Reproductor predeterminado', makeDefault: 'Elegir', installedRequired: 'Disponible en la versión instalada.', contextOpen: 'Abrir en Framecut', selectDefault: 'Elige Framecut en la configuración de Windows.' }
  };
  for (const language of Object.keys(dictionaries)) Object.assign(dictionaries[language], settingsStrings[language]);
  for (const [language, label] of Object.entries({ en: 'Set as default video player', ru: 'Сделать плеером по умолчанию', de: 'Als Standard-Videoplayer festlegen', es: 'Usar como reproductor predeterminado' })) dictionaries[language].defaultPlayerAction = label;
  const windowStrings = {
    en: { windowSize: 'Window size', windowCompact: 'Compact · 960 × 680', windowStandard: 'Standard · 1180 × 790', windowLarge: 'Large · 1440 × 900', windowMaximized: 'Maximized' },
    ru: { windowSize: 'Размер окна', windowCompact: 'Компактное · 960 × 680', windowStandard: 'Стандартное · 1180 × 790', windowLarge: 'Большое · 1440 × 900', windowMaximized: 'Развёрнутое' },
    de: { windowSize: 'Fenstergröße', windowCompact: 'Kompakt · 960 × 680', windowStandard: 'Standard · 1180 × 790', windowLarge: 'Groß · 1440 × 900', windowMaximized: 'Maximiert' },
    es: { windowSize: 'Tamaño', windowCompact: 'Compacto · 960 × 680', windowStandard: 'Estándar · 1180 × 790', windowLarge: 'Grande · 1440 × 900', windowMaximized: 'Maximizada' }
  };
  for (const language of Object.keys(dictionaries)) Object.assign(dictionaries[language], windowStrings[language]);
  for (const [language, label] of Object.entries({ en: 'Export as…', ru: 'Экспорт как…', de: 'Exportieren als…', es: 'Exportar como…' })) dictionaries[language].saveAs = label;
  for (const language of Object.keys(dictionaries)) dictionaries[language].keysHelp += ` · Ctrl+Shift+S — ${dictionaries[language].saveAs}`;
  function normalizeLanguage(language) {
    const code = String(language || '').toLowerCase().split(/[-_]/)[0];
    return Object.hasOwn(dictionaries, code) ? code : 'en';
  }
  function translate(language, key, values = {}) {
    const template = dictionaries[normalizeLanguage(language)][key] ?? dictionaries.en[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
  }
  const api = { dictionaries, normalizeLanguage, translate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FramecutI18n = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
