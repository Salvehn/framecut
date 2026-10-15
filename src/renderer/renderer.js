/* global FramecutI18n, FramecutTime, FramecutPlayback */
'use strict';

const $ = id => document.getElementById(id);
const api = window.framecut;
const { translate } = FramecutI18n;
const { formatTime, parseTime, formatSize } = FramecutTime;
const { clampToSelection, loopsSelection, playbackTime } = FramecutPlayback;
const video = $('video');
const state = { language: 'en', media: null, start: 0, end: 0, busy: false, exporting: false,
  previewing: false, converting: false, mode: 'copy', replacing: false, recent: [], fallbackTried: false,
  statusKey: 'footer', thumbnailAbort: null, toastTimer: null, volumeTimer: null, initialized: false, version: '', update: { status: 'idle' }, share: null, sharing: false, zoom: 1 };
const t = (key, values) => translate(state.language, key, values);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
let playbackRequested = false;
function pausePlayback() { playbackRequested = false; video.pause(); }

function unwrap(result) {
  if (result.ok) return result.value;
  throw Object.assign(new Error(result.code), { code: result.code });
}
function icon(button, name) { button.querySelector('use').setAttribute('href', `#i-${name}`); }
function title(element, key) { element.title = t(key); element.setAttribute('aria-label', t(key)); }
function toast(key, error = false) {
  clearTimeout(state.toastTimer);
  $('toast-text').textContent = t(key);
  $('toast').classList.toggle('error', error);
  $('toast').hidden = false;
  state.toastTimer = setTimeout(() => { $('toast').hidden = true; }, error ? 11000 : 5000);
}
function reportError(error, fallback = 'errorGeneric') {
  if (error.code === 'CANCELLED') return;
  const keys = { ENOENT: 'errorMissing', EACCES: 'errorExport', EPERM: 'errorExport', NO_VIDEO: 'errorVideo', NO_DURATION: 'errorDuration',
    INVALID_RANGE: 'errorRange', SOURCE_OVERWRITE: 'errorOverwrite', BUSY: 'errorBusy', TIMEOUT: 'errorTimeout' };
  toast(keys[error.code] || fallback, true);
}

function applyLanguage(language) {
  state.language = language;
  document.documentElement.lang = language;
  $('language').value = language;
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
  document.querySelectorAll('[data-title]').forEach(element => title(element, element.dataset.title));
  document.querySelectorAll('[data-label]').forEach(element => { element.setAttribute('aria-label', t(element.dataset.label)); });
  $('status').textContent = t(state.statusKey);
  $('seek').setAttribute('aria-label', t('timeline'));
  renderRecent();
  updateTransport();
  updateSelection();
  renderUpdate(state.update);
  if (state.media) updateMetadata();
}

function renderRecent() {
  const container = $('recent-files');
  container.replaceChildren();
  $('no-recent').hidden = state.recent.length > 0;
  for (const item of state.recent) {
    const button = document.createElement('button');
    button.className = 'recent-file';
    button.disabled = state.busy || state.exporting;
    button.title = item.name;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-film'); svg.append(use);
    const text = document.createElement('div');
    const name = document.createElement('strong'); name.textContent = item.name;
    const duration = document.createElement('small'); duration.textContent = formatTime(item.duration || 0);
    text.append(name, duration); button.append(svg, text);
    button.addEventListener('click', () => openRequest(() => api.openRecent(item.id)));
    container.append(button);
  }
}

function setBusy(busy, kind = 'loading') {
  state.busy = busy;
  $('stage').classList.toggle('is-loading', busy);
  $('stage-message').hidden = !busy;
  $('stage-message-title').textContent = t(kind);
  $('stage-message-hint').textContent = kind === 'preparing' ? t('preparingHint') : '';
  $('preview-progress').hidden = kind !== 'preparing';
  if (kind === 'preparing') $('preview-progress').value = 0;
  updateEnabled();
}

function updateEnabled() {
  const available = Boolean(state.media) && !state.busy && !state.exporting;
  for (const id of ['play', 'back', 'forward', 'seek', 'fullscreen', 'reset', 'preview', 'in-handle', 'out-handle']) $(id).disabled = !available;
  $('trim-fields').disabled = !available;
  $('mode-fields').disabled = state.exporting;
  $('export').disabled = !available || state.end - state.start < 0.0399;
  $('share').disabled = $('export').disabled;
  $('save-menu-wrap').classList.toggle('disabled', $('export').disabled);
  $('save-original').disabled = $('export').disabled; $('save-as').disabled = $('export').disabled;
  $('open-top').disabled = state.busy || state.exporting;
  $('open-center').disabled = state.busy || state.exporting;
  $('timeline-track').classList.toggle('disabled', !available);
  $('speed').disabled = !available;
  updateZoomControls();
  renderRecent();
}

async function openRequest(request) {
  if (state.busy || state.exporting) return;
  try {
    const data = unwrap(await request());
    if (data) await useMedia(data);
  } catch (error) { reportError(error); }
  finally { if (!state.converting) setBusy(false); }
}

async function useMedia(data) {
  finishTimelineDrag?.();
  cancelAnimationFrame(zoomFrame);
  state.zoom = 1; $('timeline-content').style.width = '100%'; $('timeline-viewport').scrollLeft = 0;
  pausePlayback();
  state.thumbnailAbort?.abort();
  state.media = data;
  document.body.classList.remove('empty');
  state.start = 0; state.end = data.duration;
  state.previewing = false; state.fallbackTried = false;
  $('file-heading').removeAttribute('data-i18n');
  $('file-heading').textContent = data.name;
  $('file-heading').title = data.name;
  $('empty-state').hidden = true;
  $('stage').classList.add('has-video');
  $('video-badge').hidden = false;
  $('seek').max = data.duration;
  $('seek').value = 0;
  $('total-time').textContent = formatTime(data.duration);
  $('video-resolution').textContent = `${data.width} × ${data.height}`;
  $('filmstrip').replaceChildren();
  state.statusKey = 'videoLoaded';
  $('status').textContent = t(state.statusKey);
  updateMetadata(); updateSelection(); updateTransport();
  if (!data.nativePreview) await convertPreview();
  else { video.src = data.url; video.load(); }
}

async function convertPreview() {
  if (!state.media || state.converting) return;
  state.fallbackTried = true; state.converting = true;
  pausePlayback(); setBusy(true, 'preparing');
  try {
    const result = unwrap(await api.preparePreview(state.media.id));
    state.media.url = result.url;
    video.src = result.url; video.load();
  } catch (error) { reportError(error, 'preparingFailed'); }
  finally { state.converting = false; setBusy(false); }
}

function updateMetadata() {
  const info = state.media;
  $('metadata').textContent = `${info.width}×${info.height} · ${Math.round(info.fps * 100) / 100} fps · ${formatSize(info.size, state.language)}`;
}

function setUpdatePanel(open) {
  $('update-panel').hidden = !open;
  $('version-button').setAttribute('aria-expanded', String(open));
}
function renderUpdate(update) {
  const previous = state.update.status;
  state.update = update;
  const status = update.status;
  const working = ['checking', 'downloading', 'installing'].includes(status);
  const available = ['available', 'downloading', 'ready', 'installing'].includes(status);
  const titles = { idle: 'updateTitle', checking: 'updateChecking', current: 'updateCurrent', error: 'updateFailed',
    available: 'updateAvailable', downloading: 'updateDownloadingVersion', ready: 'updateReady', installing: 'updateInstalling' };
  const actions = { idle: 'checkUpdates', current: 'checkUpdates', error: 'checkUpdates',
    available: update.portable || update.development ? 'updatePortable' : 'downloadUpdate', ready: 'installUpdate' };
  $('version').textContent = t('version', { version: state.version || update.version || '…' });
  $('version-button').setAttribute('aria-label', `${$('version').textContent}. ${t('checkUpdates')}`);
  $('version-button').classList.toggle('update-available', available);
  $('update-spinner').hidden = !working;
  $('update-icon').toggleAttribute('hidden', working);
  $('update-icon').querySelector('use').setAttribute('href', `#i-${available ? 'download' : status === 'current' ? 'check' : 'reset'}`);
  $('update-title').textContent = t(titles[status] || 'updateTitle', { version: update.version });
  $('update-button').hidden = working;
  $('update-button').disabled = working;
  $('update-button').classList.toggle('primary', status === 'ready');
  $('update-button-text').textContent = t(actions[status] || 'checkUpdates');
  icon($('update-button'), status === 'available' ? 'download' : 'reset');
  $('cancel-update').hidden = status !== 'downloading';
  $('update-progress').hidden = status !== 'downloading';
  $('update-progress').value = update.progress || 0;
  $('update-progress').setAttribute('aria-label', t('updateDownloadingVersion', { version: update.version }));
  $('update-metrics').hidden = status !== 'downloading';
  const metrics = [`${Math.round((update.progress || 0) * 100)}%`, `${formatSize(update.transferred || 0, state.language)} / ${formatSize(update.total || 0, state.language)}`];
  if (update.bytesPerSecond) metrics.push(t('updateSpeed', { size: formatSize(update.bytesPerSecond, state.language) }));
  $('update-metrics').textContent = metrics.join(' · ');
  const description = status === 'error' ? 'updateError' : status === 'ready' ? 'updateRestartHint' : update.development ? 'updateDev' : '';
  $('update-description').hidden = !description;
  $('update-description').textContent = description ? t(description) : '';
  $('update-description').classList.toggle('update-error', status === 'error');
  if (previous !== status && ['available', 'ready', 'error'].includes(status)) setUpdatePanel(true);
}

function updateSelection() {
  const duration = state.media?.duration || 0;
  const left = duration ? state.start / duration * 100 : 0;
  const right = duration ? state.end / duration * 100 : 100;
  $('in-time').value = formatTime(state.start, true);
  $('out-time').value = formatTime(state.end, true);
  const speed = Number($('speed').value);
  $('clip-duration').textContent = formatTime((state.end - state.start) / speed, true);
  $('timeline-tag').textContent = formatTime(state.end - state.start, true);
  $('selection-times').textContent = `${formatTime(state.start, true)} — ${formatTime(state.end, true)}`;
  $('seek').min = state.start;
  $('seek').max = state.end;
  $('total-time').textContent = formatTime(state.end);
  $('in-handle').style.left = `${left}%`;
  $('out-handle').style.left = `${right}%`;
  $('range-outline').style.left = `${left}%`;
  $('range-outline').style.right = `${100 - right}%`;
  $('dim-left').style.width = `${left}%`;
  $('dim-right').style.width = `${100 - right}%`;
  for (const [id, time] of [['in-handle', state.start], ['out-handle', state.end]]) {
    $(id).setAttribute('aria-valuemax', String(duration));
    $(id).setAttribute('aria-valuenow', String(time));
    $(id).setAttribute('aria-valuetext', formatTime(time, true));
  }
  updateTimelineRuler();
  $('cut-mode').value = speed === 1 ? state.mode : 'precise';
  $('cut-mode').disabled = speed !== 1;
  title($('cut-mode'), speed !== 1 ? 'speedExportHint' : state.mode === 'copy' ? 'fastHint' : 'preciseHint');
  $('export').disabled = !state.media || state.busy || state.exporting || state.end - state.start < 0.0399;
}

const MAX_ZOOM = 32;
let zoomFrame = 0;
let finishTimelineDrag;
let thumbnailTimer;
function scheduleThumbnails() {
  clearTimeout(thumbnailTimer);
  thumbnailTimer = setTimeout(() => {
    if (state.media && video.readyState > 0 && !state.replacing) drawThumbnails(video.src);
  }, 160);
}
$('timeline-viewport').addEventListener('scroll', scheduleThumbnails);
window.addEventListener('resize', scheduleThumbnails);
function updateZoomControls() {
  const available = Boolean(state.media) && !state.busy && !state.exporting;
  $('zoom-in').disabled = !available || state.zoom >= MAX_ZOOM - 0.01;
  $('zoom-out').disabled = !available || state.zoom <= 1.001;
  $('zoom-reset').disabled = !available || state.zoom <= 1.001;
  $('zoom-reset').textContent = `${Number(state.zoom.toFixed(1))}×`;
}
function updateTimelineRuler() {
  const duration = state.media?.duration || 0;
  const divisions = Math.ceil(5 * state.zoom);
  const ruler = $('ruler');
  if (ruler.children.length !== divisions + 1) ruler.replaceChildren(...Array.from({ length: divisions + 1 }, () => document.createElement('span')));
  [...ruler.children].forEach((span, index) => { span.textContent = formatTime(duration * index / divisions, duration / divisions < 1).replace(/^00:/, ''); });
}
function animateTimelineZoom(target, anchor, restoreScroll) {
  if (!state.media) return;
  cancelAnimationFrame(zoomFrame);
  const viewport = $('timeline-viewport');
  const initial = state.zoom, initialScroll = viewport.scrollLeft;
  const targetZoom = clamp(target, 1, MAX_ZOOM);
  const started = performance.now();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tick = now => {
    const progress = reducedMotion ? 1 : clamp((now - started) / 220, 0, 1);
    const eased = 1 - (1 - progress) ** 3;
    state.zoom = initial + (targetZoom - initial) * eased;
    $('timeline-content').style.width = `${state.zoom * 100}%`;
    if (restoreScroll !== undefined) viewport.scrollLeft = initialScroll + (restoreScroll - initialScroll) * eased;
    else {
      const position = typeof anchor === 'function' ? anchor() : anchor;
      viewport.scrollLeft = 7 + position.time / state.media.duration * $('timeline-track').clientWidth - position.x;
    }
    updateTimelineRuler(); updateZoomControls();
    if (progress < 1) zoomFrame = requestAnimationFrame(tick);
    else { zoomFrame = 0; scheduleThumbnails(); }
  };
  zoomFrame = requestAnimationFrame(tick);
}
function zoomAroundPlayhead(factor) {
  if (!state.media || state.busy || state.exporting) return;
  const viewport = $('timeline-viewport');
  const track = $('timeline-track').getBoundingClientRect();
  const time = video.currentTime || 0;
  const x = clamp(track.left + time / state.media.duration * track.width - viewport.getBoundingClientRect().left, 14, viewport.clientWidth - 14);
  animateTimelineZoom(state.zoom * factor, { time, x });
}
$('zoom-in').addEventListener('click', () => zoomAroundPlayhead(2));
$('zoom-out').addEventListener('click', () => zoomAroundPlayhead(0.5));
$('zoom-reset').addEventListener('click', () => animateTimelineZoom(1, null, 0));
$('timeline-viewport').addEventListener('wheel', event => {
  if (!state.media || state.busy || state.exporting) return;
  const viewport = $('timeline-viewport');
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault();
    if (finishTimelineDrag) return;
    const track = $('timeline-track').getBoundingClientRect();
    const time = clamp((event.clientX - track.left) / track.width, 0, 1) * state.media.duration;
    const x = clamp(event.clientX - viewport.getBoundingClientRect().left, 0, viewport.clientWidth);
    animateTimelineZoom(state.zoom * (event.deltaY < 0 ? 1.5 : 1 / 1.5), { time, x });
  } else if (state.zoom > 1) {
    event.preventDefault();
    viewport.scrollLeft += (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * (event.deltaMode === 1 ? 20 : event.deltaMode === 2 ? viewport.clientWidth : 1);
  }
}, { passive: false });

function changeBoundary(boundary, value, seekTo = false) {
  if (!state.media || !Number.isFinite(value)) return;
  const duration = state.media.duration;
  if (boundary === 'start') state.start = clamp(value, 0, Math.max(0, state.end - 0.04));
  else state.end = clamp(value, Math.min(duration, state.start + 0.04), duration);
  state.previewing = false;
  updateSelection(); updateTransport();
  if (seekTo) seek(boundary === 'start' ? state.start : state.end);
  else if (video.currentTime < state.start || video.currentTime > state.end) seek(video.currentTime);
  else updatePosition();
  state.statusKey = 'selectionReady'; $('status').textContent = t(state.statusKey);
}

function seek(seconds) {
  if (!state.media || !Number.isFinite(seconds)) return;
  video.currentTime = clampToSelection(seconds, state.start, state.end);
  updatePosition();
}

function updatePosition() {
  let time = video.currentTime || 0;
  if (state.media && video.readyState > 0 && !video.seeking && !state.busy && !state.exporting && !state.replacing) {
    const target = playbackTime(time, { start: state.start, end: state.end, duration: state.media.duration }, !video.paused, state.previewing);
    if (Math.abs(target - time) > 0.0001) { video.currentTime = target; time = target; }
  }
  $('current-time').textContent = formatTime(time);
  $('seek').value = time;
  $('playhead').style.left = `${state.media ? clamp(time / state.media.duration * 100, 0, 100) : 0}%`;
}

let playbackFrame = 0;
function trackPlayback() {
  cancelAnimationFrame(playbackFrame);
  const tick = () => {
    updatePosition();
    if (!video.paused && !video.ended) playbackFrame = requestAnimationFrame(tick);
  };
  tick();
}
const selectionLoops = () => Boolean(state.media) && loopsSelection(state.start, state.end, state.media.duration, state.previewing);

function updateTransport() {
  icon($('play'), video.paused ? 'play' : 'pause');
  $('play').classList.toggle('playing', !video.paused);
  title($('play'), video.paused ? 'play' : 'pause');
  icon($('mute'), video.muted || video.volume === 0 ? 'muted' : 'volume');
  title($('mute'), video.muted ? 'unmute' : 'mute');
  const previewActive = !video.paused && selectionLoops();
  $('preview').querySelector('span').textContent = t(previewActive ? 'previewing' : 'preview');
  icon($('preview'), previewActive ? 'pause' : 'play');
}

async function togglePlayback() {
  if (!state.media || state.busy || state.exporting) return;
  if (video.paused) {
    if (video.ended || video.currentTime < state.start || video.currentTime >= state.end - 0.015) seek(state.start);
    try { await video.play(); } catch (error) { if (error.name !== 'AbortError') toast('playbackError', true); }
  } else { pausePlayback(); state.previewing = false; }
  updateTransport();
}

async function drawThumbnails(url) {
  state.thumbnailAbort?.abort();
  const controller = new AbortController(); state.thumbnailAbort = controller;
  const duration = state.media.duration;
  const count = Math.ceil(10 * state.zoom);
  const filmstrip = $('filmstrip');
  if (filmstrip.children.length !== count) {
    filmstrip.replaceChildren(...Array.from({ length: count }, () => document.createElement('span')));
  }
  const bounds = $('timeline-track').getBoundingClientRect();
  const view = $('timeline-viewport').getBoundingClientRect();
  const first = Math.max(0, Math.floor((view.left - bounds.left) / bounds.width * count) - 1);
  const last = Math.min(count - 1, Math.ceil((view.right - bounds.left) / bounds.width * count));
  const pending = [];
  for (let index = first; index <= last; index++) if (!filmstrip.children[index].firstChild) pending.push(index);
  if (!pending.length) return;
  const thumbnailVideo = document.createElement('video');
  thumbnailVideo.muted = true; thumbnailVideo.preload = 'auto';
  const waitEvent = (event, action) => new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); thumbnailVideo.removeEventListener(event, done); thumbnailVideo.removeEventListener('error', fail); controller.signal.removeEventListener('abort', fail); };
    const done = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error('Thumbnail unavailable')); };
    const timer = setTimeout(fail, 7000);
    thumbnailVideo.addEventListener(event, done, { once: true });
    thumbnailVideo.addEventListener('error', fail, { once: true });
    controller.signal.addEventListener('abort', fail, { once: true });
    action?.();
  });
  try {
    await waitEvent('loadeddata', () => { thumbnailVideo.src = url; thumbnailVideo.load(); });
    for (const index of pending) {
      if (controller.signal.aborted) return;
      const time = Math.min(duration - 0.02, duration * (index + 0.5) / count);
      await waitEvent('seeked', () => { thumbnailVideo.currentTime = time; });
      if (controller.signal.aborted) return;
      const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 90;
      const context = canvas.getContext('2d');
      const ratio = Math.max(160 / thumbnailVideo.videoWidth, 90 / thumbnailVideo.videoHeight);
      const w = thumbnailVideo.videoWidth * ratio, h = thumbnailVideo.videoHeight * ratio;
      context.drawImage(thumbnailVideo, (160 - w) / 2, (90 - h) / 2, w, h);
      filmstrip.children[index].replaceChildren(canvas);
    }
  } catch { /* Thumbnails are optional; playback and trimming remain available. */ }
  finally { thumbnailVideo.removeAttribute('src'); thumbnailVideo.load(); }
}

async function shareSelection() {
  if (!state.media || state.busy || state.exporting) return;
  document.activeElement?.blur();
  pausePlayback(); state.previewing = false;
  const speed = Number($('speed').value);
  const key = `${state.media.id}:${state.start}:${state.end}:${state.mode}:${speed}`;
  state.sharing = true; state.exporting = true; updateEnabled(); updateTransport();
  try {
    if (state.share?.key !== key) {
      const clip = unwrap(await api.prepareShare({ id: state.media.id, start: state.start, end: state.end, mode: state.mode, speed }));
      state.share = { ...clip, key };
    }
    $('export-dialog').close();
    $('share-file-info').textContent = `${formatTime(state.share.duration, true)} · ${formatSize(state.share.size, state.language)}`;
    $('share-hint').textContent = t('dragShare');
    if (!$('share-dialog').open) $('share-dialog').showModal();
  } catch (error) {
    $('export-dialog').close(); reportError(error, 'errorExport');
    if (error.code === 'CANCELLED') toast('cancelled');
  } finally { state.sharing = false; state.exporting = false; updateEnabled(); }
}
async function sendShare(target) {
  if (!state.share) return;
  for (const id of ['share-telegram', 'share-discord', 'share-copy']) $(id).disabled = true;
  try {
    const result = unwrap(await api.shareTarget(state.share.id, target));
    $('share-hint').textContent = t(result.method === 'telegram' ? 'telegramShareReady' : 'sharePaste');
  } catch (error) { reportError(error); }
  finally { for (const id of ['share-telegram', 'share-discord', 'share-copy']) $(id).disabled = false; }
}
$('share').addEventListener('click', shareSelection);
$('close-share').addEventListener('click', () => $('share-dialog').close());
$('share-telegram').addEventListener('click', () => sendShare('telegram'));
$('share-discord').addEventListener('click', () => sendShare('discord'));
$('share-copy').addEventListener('click', () => sendShare('clipboard'));
$('share-file').addEventListener('dragstart', event => { event.preventDefault(); if (state.share) api.dragShare(state.share.id); });
$('share-file').addEventListener('click', () => sendShare('clipboard'));
$('share-file').addEventListener('keydown', event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); sendShare('clipboard'); } });

async function exportSelection(saveMode = 'overwrite') {
  if (!state.media || state.busy || state.exporting) return;
  // Validate a focused field before its value can be used for an export shortcut.
  document.activeElement?.blur();
  pausePlayback(); state.previewing = false; state.exporting = true;
  updateEnabled(); updateTransport();
  try {
    const result = unwrap(await api.exportClip({ id: state.media.id, start: state.start, end: state.end, mode: state.mode, speed: Number($('speed').value), saveMode }));
    if (result.cancelled) { $('export-dialog').close(); return; }
    state.replacing = false;
    if (result.updatedMedia) {
      // The exported speed is already baked into the source; avoid applying it a second time.
      $('speed').value = '1'; video.playbackRate = 1;
      state.exporting = false; await useMedia(result.updatedMedia);
    }
    $('export-title').textContent = t('complete');
    $('export-subtitle').textContent = `${result.name} · ${formatTime(result.duration, true)} · ${formatSize(result.size, state.language)}`;
    $('export-progress-wrap').hidden = true;
    $('cancel-export').hidden = true;
    $('done-export').hidden = false;
    $('reveal-export').hidden = false;
    icon($('export-dialog'), 'check');
  } catch (error) {
    $('export-dialog').close(); reportError(error, 'errorExport');
    if (error.code === 'CANCELLED') toast('cancelled');
  } finally { state.exporting = false; updateEnabled(); }
}

$('open-top').addEventListener('click', () => openRequest(() => api.openFile()));
$('open-center').addEventListener('click', () => openRequest(() => api.openFile()));
$('play').addEventListener('click', togglePlayback);
$('video').addEventListener('click', togglePlayback);
$('video').addEventListener('dblclick', () => api.windowControl('fullscreen'));
$('back').addEventListener('click', () => { state.previewing = false; seek(video.currentTime - 5); updateTransport(); });
$('forward').addEventListener('click', () => { state.previewing = false; seek(video.currentTime + 5); updateTransport(); });
$('seek').addEventListener('input', event => { state.previewing = false; seek(Number(event.target.value)); updateTransport(); });
$('volume').addEventListener('input', event => {
  video.volume = Number(event.target.value); video.muted = video.volume === 0; updateTransport();
  clearTimeout(state.volumeTimer);
  state.volumeTimer = setTimeout(() => api.setPreferences({ volume: video.volume }), 250);
});
$('mute').addEventListener('click', () => {
  if (video.volume === 0) { video.volume = 0.5; $('volume').value = 0.5; video.muted = false; }
  else video.muted = !video.muted;
  updateTransport();
});
$('speed').addEventListener('change', event => { video.playbackRate = Number(event.target.value); updateSelection(); });
$('fullscreen').addEventListener('click', () => api.windowControl('fullscreen'));
for (const action of ['minimize', 'maximize']) $(action).addEventListener('click', () => api.windowControl(action));
$('close-window').addEventListener('click', () => api.windowControl('close'));
$('cancel-open').addEventListener('click', () => api.cancelOpen());
$('mark-in').addEventListener('click', () => changeBoundary('start', video.currentTime));
$('mark-out').addEventListener('click', () => changeBoundary('end', video.currentTime));
for (const [id, boundary] of [['in-time', 'start'], ['out-time', 'end']]) {
  $(id).addEventListener('change', event => {
    const value = parseTime(event.target.value);
    if (!Number.isFinite(value)) { toast('invalidTime', true); updateSelection(); return; }
    if ((boundary === 'start' && (value < 0 || value > state.end - 0.04)) || (boundary === 'end' && (value > state.media.duration + 0.001 || value < state.start + 0.04))) {
      toast('errorRange', true); updateSelection(); return;
    }
    changeBoundary(boundary, value, true);
  });
  $(id).addEventListener('keydown', event => { if (event.key === 'Enter') event.target.blur(); });
}
$('reset').addEventListener('click', () => { state.start = 0; state.end = state.media.duration; state.previewing = false; animateTimelineZoom(1, null, 0); updateSelection(); updateTransport(); });
$('preview').addEventListener('click', async () => {
  if (!video.paused && selectionLoops()) { pausePlayback(); state.previewing = false; }
  else {
    state.previewing = true; seek(state.start);
    try { await video.play(); } catch (error) { state.previewing = false; if (error.name !== 'AbortError') toast('playbackError', true); }
  }
  updateTransport();
});
$('cut-mode').addEventListener('change', event => {
  state.mode = event.target.value; updateSelection(); api.setPreferences({ mode: state.mode });
});
$('export').addEventListener('click', () => exportSelection('overwrite'));
$('save-original').addEventListener('click', () => exportSelection('overwrite'));
$('save-as').addEventListener('click', () => exportSelection('new'));
$('save-menu-wrap').addEventListener('pointerenter', () => $('save-menu-wrap').classList.remove('menu-dismissed'));
$('save-menu-wrap').addEventListener('focusin', event => { if (!$('save-menu-wrap').contains(event.relatedTarget)) $('save-menu-wrap').classList.remove('menu-dismissed'); });
$('save-menu-wrap').addEventListener('keydown', event => {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault(); event.stopPropagation();
    const items = [$('save-original'), $('save-as')]; const current = items.indexOf(document.activeElement);
    items[current < 0 ? (event.key === 'ArrowDown' ? 0 : 1) : (current + 1) % 2].focus();
  }
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); $('save-menu-wrap').classList.add('menu-dismissed'); $('export').focus(); }
});
$('cancel-export').addEventListener('click', () => { $('cancel-export').disabled = true; api.cancelExport(); });
$('done-export').addEventListener('click', () => $('export-dialog').close());
$('reveal-export').addEventListener('click', () => api.revealExport());
$('export-dialog').addEventListener('cancel', event => { if (state.exporting) { event.preventDefault(); api.cancelExport(); } });
$('shortcuts').addEventListener('click', () => $('shortcuts-dialog').showModal());
$('close-shortcuts').addEventListener('click', () => $('shortcuts-dialog').close());
$('settings').addEventListener('click', async () => {
  $('settings-dialog').showModal();
  try {
    const info = unwrap(await api.integrationState());
    $('context-menu').checked = info.contextMenu;
    $('context-menu').disabled = !info.available;
    $('default-player').disabled = !info.available;
    $('integration-note').hidden = info.available;
  } catch (error) { reportError(error); }
});
$('close-settings').addEventListener('click', () => $('settings-dialog').close());
$('window-preset').addEventListener('change', async event => {
  try { unwrap(await api.setWindowPreset(event.target.value)); }
  catch (error) { reportError(error); }
});
$('context-menu').addEventListener('change', async event => {
  const control = event.target; control.disabled = true;
  try { const info = unwrap(await api.setContextMenu(control.checked)); control.checked = info.contextMenu; }
  catch (error) { control.checked = !control.checked; reportError(error); }
  finally { control.disabled = false; }
});
$('default-player').addEventListener('click', async () => {
  $('default-player').disabled = true;
  try { unwrap(await api.setDefaultPlayer()); toast('selectDefault'); }
  catch (error) { reportError(error); }
  finally { $('default-player').disabled = false; }
});
$('close-toast').addEventListener('click', () => { $('toast').hidden = true; });
$('version-button').addEventListener('click', () => setUpdatePanel($('update-panel').hidden));
$('close-update').addEventListener('click', () => { setUpdatePanel(false); $('version-button').focus(); });
document.addEventListener('pointerdown', event => { if (!$('app-update').contains(event.target)) setUpdatePanel(false); }, true);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('update-panel').hidden) { setUpdatePanel(false); $('version-button').focus(); }
});
$('update-button').addEventListener('click', async () => {
  try {
    if (state.update.status === 'ready') unwrap(await api.installUpdate());
    else if (state.update.status === 'available') unwrap(await api.downloadUpdate());
    else { const result = unwrap(await api.checkUpdates()); renderUpdate(result); }
  } catch (error) { reportError(error); }
});
$('cancel-update').addEventListener('click', () => api.cancelUpdate());
$('language').addEventListener('change', async event => {
  const language = event.target.value;
  applyLanguage(language);
  try { unwrap(await api.setLanguage(language)); } catch (error) { reportError(error); }
});

for (const [id, boundary] of [['in-handle', 'start'], ['out-handle', 'end']]) {
  const handle = $(id);
  let dragging = false;
  let holdTimer, lastX, holdX, offset, previousView, originalTime;
  const schedulePrecision = () => {
    clearTimeout(holdTimer);
    holdX = lastX;
    holdTimer = setTimeout(() => {
      if (!dragging || previousView) return;
      previousView = { zoom: state.zoom, scroll: $('timeline-viewport').scrollLeft };
      $('timeline-viewport').classList.add('precision');
      animateTimelineZoom(state.zoom * 4, () => ({ time: state[boundary], x: lastX - offset - $('timeline-viewport').getBoundingClientRect().left }));
    }, 550);
  };
  const finish = () => {
    if (!dragging) return;
    dragging = false; clearTimeout(holdTimer); finishTimelineDrag = null;
    $('timeline-track').classList.remove('dragging'); $('timeline-viewport').classList.remove('precision');
    if (state.media && !state.replacing && !state.busy && !state.exporting) seek(originalTime);
    if (previousView) { animateTimelineZoom(previousView.zoom, null, previousView.scroll); previousView = null; }
  };
  handle.addEventListener('pointerdown', event => {
    if (handle.disabled || event.button !== 0) return;
    finishTimelineDrag?.(); cancelAnimationFrame(zoomFrame);
    event.preventDefault(); event.stopPropagation(); dragging = true; originalTime = video.currentTime; pausePlayback(); state.previewing = false;
    lastX = event.clientX; offset = lastX - (handle.getBoundingClientRect().left + handle.offsetWidth / 2);
    previousView = null; finishTimelineDrag = finish; schedulePrecision();
    $('timeline-track').classList.add('dragging');
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', event => {
    if (!dragging) return;
    lastX = event.clientX;
    if (!previousView && Math.abs(lastX - holdX) > 3) schedulePrecision();
    const viewport = $('timeline-viewport');
    const view = viewport.getBoundingClientRect();
    if (lastX < view.left + 20) viewport.scrollLeft -= 12;
    else if (lastX > view.right - 20) viewport.scrollLeft += 12;
    const bounds = $('timeline-track').getBoundingClientRect();
    changeBoundary(boundary, (event.clientX - offset - bounds.left) / bounds.width * state.media.duration, true);
  });
  handle.addEventListener('pointerup', finish);
  handle.addEventListener('pointercancel', finish);
  handle.addEventListener('lostpointercapture', finish);
  handle.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const step = event.shiftKey ? 1 : 1 / (state.media.fps || 25);
    const value = event.key === 'Home' ? 0 : event.key === 'End' ? state.media.duration : state[boundary] + (event.key === 'ArrowLeft' ? -step : step);
    changeBoundary(boundary, value, true);
  });
}
$('timeline-track').addEventListener('pointerdown', event => {
  if (!state.media || state.busy || state.exporting || event.target.closest('.range-handle')) return;
  state.previewing = false;
  const bounds = $('timeline-track').getBoundingClientRect();
  seek((event.clientX - bounds.left) / bounds.width * state.media.duration); updateTransport();
});

video.addEventListener('timeupdate', updatePosition);
video.addEventListener('seeked', updatePosition);
video.addEventListener('play', () => { playbackRequested = true; trackPlayback(); updateTransport(); });
video.addEventListener('pause', () => { if (!video.ended) playbackRequested = false; cancelAnimationFrame(playbackFrame); updateTransport(); });
video.addEventListener('ended', async () => {
  if (playbackRequested && selectionLoops() && !state.busy && !state.exporting && !state.replacing) {
    seek(state.start);
    try { await video.play(); } catch (error) { state.previewing = false; if (error.name !== 'AbortError') toast('playbackError', true); }
  } else { playbackRequested = false; state.previewing = false; }
  updateTransport();
});
video.addEventListener('loadedmetadata', () => { video.playbackRate = Number($('speed').value); updateEnabled(); updatePosition(); drawThumbnails(video.src); });
video.addEventListener('error', () => {
  if (state.converting || state.replacing || !state.media || !video.getAttribute('src')) return;
  if (!state.fallbackTried) convertPreview();
  else toast('playbackError', true);
});

let dragDepth = 0;
window.addEventListener('dragenter', event => { event.preventDefault(); if (!$('share-dialog').open && event.dataTransfer.types.includes('Files')) { dragDepth++; if (!state.exporting) $('drop-overlay').hidden = false; } });
window.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = state.exporting ? 'none' : 'copy'; });
window.addEventListener('dragleave', event => { event.preventDefault(); if (--dragDepth <= 0) { dragDepth = 0; $('drop-overlay').hidden = true; } });
window.addEventListener('drop', async event => {
  event.preventDefault(); dragDepth = 0; $('drop-overlay').hidden = true;
  const file = event.dataTransfer.files[0];
  if (!file || state.exporting || state.busy || $('share-dialog').open) return;
  await openRequest(() => api.openDropped(file));
});

window.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]')) return;
  const editing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyO') { event.preventDefault(); openRequest(() => api.openFile()); return; }
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') { event.preventDefault(); exportSelection(event.shiftKey ? 'new' : 'overwrite'); return; }
  if (editing || event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.code === 'Escape') { api.windowControl('exit-fullscreen'); return; }
  if (!state.media || state.busy || state.exporting) return;
  switch (event.code) {
    case 'Space': event.preventDefault(); togglePlayback(); break;
    case 'ArrowLeft': event.preventDefault(); state.previewing = false; seek(video.currentTime - (event.shiftKey ? 10 : 5)); updateTransport(); break;
    case 'ArrowRight': event.preventDefault(); state.previewing = false; seek(video.currentTime + (event.shiftKey ? 10 : 5)); updateTransport(); break;
    case 'KeyI': changeBoundary('start', video.currentTime); break;
    case 'KeyO': changeBoundary('end', video.currentTime); break;
    case 'KeyF': api.windowControl('fullscreen'); break;
    case 'KeyM': $('mute').click(); break;
    case 'Comma': pausePlayback(); state.previewing = false; seek(video.currentTime - 1 / (state.media.fps || 25)); updateTransport(); break;
    case 'Period': pausePlayback(); state.previewing = false; seek(video.currentTime + 1 / (state.media.fps || 25)); updateTransport(); break;
    case 'Home': seek(0); break;
    case 'End': seek(state.media.duration); break;
  }
});

api.onEvent(message => {
  if (message.type === 'external-media') { useMedia(message.media).catch(reportError).finally(() => setBusy(false)); }
  if (message.type === 'external-error') { setBusy(false); reportError({ code: message.code }); }
  if (message.type === 'source-replacing') {
    state.replacing = true; state.thumbnailAbort?.abort(); pausePlayback(); video.removeAttribute('src'); video.load();
    api.releaseSource();
  }
  if (message.type === 'source-restore') { state.replacing = false; video.src = state.media.url; video.load(); }
  if (message.type === 'update-state') renderUpdate(message.state);
  if (message.type === 'loading') { pausePlayback(); setBusy(true); }
  if (message.type === 'recent') { state.recent = message.items; renderRecent(); }
  if (message.type === 'preview-progress') { $('preview-progress').value = message.progress; $('stage-message-title').textContent = t('preparingProgress', { percent: Math.round(message.progress * 100) }); }
  if (message.type === 'fullscreen') document.body.classList.toggle('fullscreen', message.active);
  if (message.type === 'export-start') {
    $('export-title').textContent = t(state.sharing ? 'preparingShare' : 'exporting'); $('export-subtitle').textContent = t(state.sharing ? 'temporaryShare' : 'exportHint');
    $('export-progress').value = 0; $('export-percent').textContent = '0%';
    $('export-progress-wrap').hidden = false; $('cancel-export').hidden = false; $('cancel-export').disabled = false;
    $('done-export').hidden = true; $('reveal-export').hidden = true;
    icon($('export-dialog'), 'scissors');
    if (!$('export-dialog').open) $('export-dialog').showModal();
  }
  if (message.type === 'export-progress') { $('export-progress').value = message.progress; $('export-percent').textContent = `${Math.round(message.progress * 100)}%`; }
});

(async () => {
  try {
    const data = unwrap(await api.bootstrap());
    state.recent = data.recent; state.mode = data.mode;
    state.version = data.version;
    const formats = data.videoExtensions.map(extension => extension === 'webm' ? 'WebM' : extension.toUpperCase());
    const formatContent = document.createElement('span'); formatContent.className = 'formats-content';
    const formatTrack = document.createElement('span'); formatTrack.className = 'formats-track';
    const formatRun = document.createElement('span'); formatRun.className = 'formats-run'; formatRun.textContent = formats.join(' · ');
    const repeatedRun = formatRun.cloneNode(true); repeatedRun.setAttribute('aria-hidden', 'true');
    formatTrack.append(formatRun, repeatedRun);
    const fullFormats = formatRun.cloneNode(true); fullFormats.className = 'formats-full'; fullFormats.setAttribute('aria-hidden', 'true');
    formatContent.append(formatTrack, fullFormats);
    $('supported-formats').replaceChildren(formatContent);
    $('supported-formats').style.setProperty('--formats-width', `${fullFormats.scrollWidth + 32}px`);
    $('volume').value = data.volume; video.volume = data.volume;
    $('cut-mode').value = state.mode;
    $('window-preset').value = data.windowPreset || 'standard';
    state.update = data.update || { status: 'idle' };
    applyLanguage(data.language); updateEnabled(); state.initialized = true; api.ready();
  } catch (error) { reportError(error); }
})();
