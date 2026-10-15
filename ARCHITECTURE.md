# Architecture

| Component | Responsibility |
| --- | --- |
| `src/main.cjs` | Window lifecycle, native dialogs, allowlisted IPC, single-instance file opening, preferences |
| `src/preload.cjs` | Narrow renderer bridge; no arbitrary process or filesystem access |
| `src/renderer/` | Local UI, playback, time selection, settings, localization |
| `src/media.cjs` | FFmpeg/FFprobe processes, metadata, preview conversion, staged exports |
| `src/media-protocol.cjs` | Random-token media access and byte-range streaming; reader release before overwrite |
| `src/update-core.cjs`, `src/updater.cjs` | Ed25519 manifest verification, bounded download, SHA-256 validation, updater lifecycle |
| `src/sharing.cjs` | Temporary MP4 export, bounded cache cleanup, native file clipboard, Telegram handoff and Discord launch |
| `src/windows-integration.cjs` | Per-user capabilities, Open With registration and context-menu settings |
| `scripts/prepare-installer.cjs` | Generates NSIS registration and removal hooks |

The renderer is sandboxed with context isolation and Node.js disabled. CSP allows bundled code and selected local media. New windows, navigation and permission requests are blocked. Media URLs expose random IDs mapped to opened files; they do not accept arbitrary filesystem paths. FFmpeg uses argument arrays without a shell.

Exports are written and probed in the destination directory before atomic replacement. Overwrite requires an explicit save mode. The renderer and media protocol release Windows readers before replacing the source. Failed replacements restore playback of the original.

Windows registration stays in HKCU. It adds owned ProgIDs, Open With entries, capabilities and video context commands. It does not take over existing file defaults; users select those in Windows Settings. Uninstall removes only Framecut-owned registrations. The context-menu preference survives upgrades.

The update trust root is `assets/update-public.pem`. Its private counterpart is stored outside the repository and in the repository's `FRAMECUT_UPDATE_PRIVATE_KEY` Actions secret. The updater rejects altered manifests, other artifact origins, malformed versions, excessive sizes, and mismatched downloads.
