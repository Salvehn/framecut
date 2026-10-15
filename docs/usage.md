# Playback and trimming

Open MP4, MKV, MOV, AVI, WebM, WMV, and other video containers supported by the bundled FFmpeg. Recent files are stored locally. Unsupported playback codecs are converted into a temporary H.264/AAC preview; exporting always uses the source. Large previews take time and disk space. Temporary previews are removed on normal exit; an interrupted session can leave `framecut-*` directories in the system temporary folder.

Close the current video using **× beside its name** or **Ctrl+W** to return to the opening panel. Playback stops and the file is released; recent history and settings remain. Newly exported files are added to recent history as well as opened files. Reopening an existing file updates its entry without duplicating it.

The opening panel lists the same file types as the file picker. A compact marquee fades at both edges. Hover over it or focus it with Tab: scrolling pauses, the list expands from its center, and the masks fade out to reveal every format. Leaving reverses the animation and resumes scrolling. Reduced-motion settings disable the motion. After you change the selection, playback loops between its boundaries. Timeline clicks, seeking, keyboard jumps and frame steps stay inside that range. Pause stops the loop; resetting the selection returns to normal whole-video playback. **Preview clip** also loops the selected range until stopped. Bounds remain active while the window is in the background.

## Cut modes

| Mode | Behavior |
| --- | --- |
| Original quality, the default | Copies video and audio without re-encoding. Starts at a keyframe; the actual start and duration may differ from the selected boundaries. |
| Frame accurate | Re-encodes the selection into a new MP4 / H.264 / AAC file, CRF 18. |

Timecodes accept `HH:MM:SS.mmm`, `MM:SS.mmm`, or seconds. Minimum selection length: 0.04 seconds. Exact boundaries are limited by video frames and audio samples. Odd dimensions are rounded down to even values for YUV 4:2:0.

The speed control applies to playback, file exports, and temporary sharing clips. At any speed other than 1×, Framecut automatically re-encodes video and audio with the chosen tempo and preserves audio pitch. The displayed export duration reflects that speed. Returning to 1× restores the chosen cut mode.

## Timeline zoom

Use **− / +** to zoom around the playhead, or **Ctrl + mouse wheel** over the exact segment you want to inspect. The middle scale button shows the current zoom and returns to the full video. Zoom ranges from 1× to 32×. Scroll the enlarged timeline with the wheel, trackpad, or horizontal scrollbar. Zooming and scrolling do not change the selection or loop boundaries.

Hold either trim handle still for a moment to temporarily magnify the surrounding frames. Continue dragging for finer control; release to restore the previous scale and scroll position. Moving normally trims without automatic zoom. The ruler and visible thumbnails update to the current scale; reduced-motion settings remove the zoom animation.

While dragging, the video previews the active boundary and the playback marker stays hidden to keep the handle clear. Releasing restores the previous playback position, clamped to the updated selection if necessary.

The primary video stream and audio tracks are retained; subtitles, attachments, and additional video streams are excluded. Precise HDR color conversion is not implemented. Fast cuts preserve the original encoded video. Frame stepping uses average frame rate, so variable-frame-rate video can differ by a frame.

## Export

**Export** opens the file dialog and proposes an unused filename. Every export creates a new file and protects the source and other existing destinations, including a file created by another application while exporting. The player keeps the current video open. A finished export appears in recent history.

Click outside a modal to dismiss it when idle. Backdrop clicks are ignored during loading, preview preparation, and export.

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| Ctrl+O | Open video |
| Ctrl+W | Close current video |
| Space | Play / pause |
| Left / Right | Seek 5 seconds |
| Shift+Left / Shift+Right | Seek 10 seconds |
| I / O | Set start / end at playhead |
| Comma / period | Previous / next frame |
| F / Esc | Enter / leave full screen |
| M | Mute |
| Ctrl+S / Ctrl+Shift+S | Export selection as a new file |

Focus a range handle with Tab; use Left/Right to move by a frame, Shift for one second, and Home/End for the video edge. Physical key codes keep letter shortcuts usable with the Russian keyboard layout.

## Share without saving manually

Click the share icon beside **Export**. Framecut prepares the selected range at the current speed as a temporary MP4 and opens the sharing dialog, without a file dialog or changes to the source. At 1×, compatible H.264/AAC clips use the selected fast mode; other formats and changed speeds are converted to H.264/AAC for messenger compatibility. Reopening the same selection, speed, and cut mode reuses its prepared clip.

- **Telegram:** hands the file to Telegram Desktop's recipient picker using its [documented file argument](https://github.com/telegramdesktop/tdesktop/wiki/Command-Line-Switches). If no compatible desktop installation is found, the file is copied for pasting instead.
- **Discord:** copies the actual file to the Windows clipboard and opens Discord. Choose a chat and paste with Ctrl+V, or drag the file tile into the chat. This does not expose Discord's mobile Share To picker. The documented [Share Moment API](https://docs.discord.com/developers/activities/development-guides/user-actions#open-share-moment-dialog) is for authenticated Discord Activities and Discord CDN URLs.
- **Copy file:** puts a native file drop on the clipboard, for pasting into another app. The file tile also supports native dragging.

Final recipient selection and sending happen in the destination app. Framecut does not send messages itself. Temporary clips remain in `%APPDATA%/Framecut/share-cache` after exit so handoffs keep working; clips older than 24 hours are removed on the next launch. Messenger upload limits still apply.

## Settings and Windows

Settings contains language selection, window-size presets, the Explorer context-menu toggle, and the default-player button. Choose Compact (960×680), Standard (1180×790), Large (1440×900), or Maximized; the choice applies immediately and is remembered for startup. Sizes fit the display work area. Windows integration is enabled for the installed edition; development and portable editions do not register themselves. The default-player button opens Windows Settings, where the user chooses file associations. Framecut does not rewrite protected `UserChoice` values. On Windows 10, the settings link can open the general Default apps page; search for Framecut there.

Context-menu commands use the classic Explorer menu. In Windows 11, open **Show more options**. Selecting a video launches Framecut or forwards the path to its existing window.

## Updates and local data

Click the version at the bottom of the sidebar to open the update panel. It shows the current status, download progress, transferred size and speed, with a separate action to check, download, or restart and install. The panel also opens when an update is available or a check fails; dismiss it with Escape or a click outside.

The installed edition checks GitHub Releases 15 seconds after launch and every six hours. Download starts only on request. The manifest is verified with Ed25519; installer size and SHA-256 are checked after download and again before execution. Updates wait for preview/export operations to finish. Portable opens the release page for manual replacement.

Framecut does not upload videos itself; sharing hands a local file to the chosen application. Only update checks and downloads contact GitHub. Preferences, recent paths, volume, and mode choices are stored in `%APPDATA%/Framecut/preferences.json`. The Windows installer is not Authenticode-signed; update authenticity uses the bundled Ed25519 public key.

Motion follows the Windows reduced-motion preference. Transitions are short and do not delay dragging timeline handles.
