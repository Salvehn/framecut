# Third-party components

Framecut is distributed under GPL-3.0-or-later. It launches FFmpeg and FFprobe as separate processes. It does not link their libraries into Electron.

## FFmpeg

The Windows x64 binary is supplied by `ffmpeg-static` 5.3.0:

- Binary: FFmpeg 6.1.1 essentials build from [Gyan](https://www.gyan.dev/ffmpeg/builds/).
- Copyright © FFmpeg developers and the authors of the included libraries.
- License: GNU General Public License, version 3.
- [Exact FFmpeg source commit](https://github.com/FFmpeg/FFmpeg/commit/e38092ef93).
- [Binary distribution, licenses and build resources](https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.1.1).
- [ffmpeg-static source](https://github.com/eugeneware/ffmpeg-static).
- The binary's license and build README are included in `resources/licenses/`.

## FFprobe

FFprobe 4.0.2 Windows x64 comes from `ffprobe-static` 3.1.0, originally a Zeranoe static build. FFprobe is part of FFmpeg; the static binary includes GPL components and is covered by GPL version 3.

- [FFmpeg 4.0.2 source](https://github.com/FFmpeg/FFmpeg/tree/n4.0.2).
- [ffprobe-static source and original binary package](https://github.com/joshwnj/ffprobe-static).
- The `ffprobe-static` JavaScript wrapper is MIT licensed, copyright © 2015 Josh Johnston. Its license is included in `resources/licenses/`.

## Electron

Electron 44.7.2 is MIT licensed, copyright © Electron contributors. It includes Chromium, Node.js, and other components with their own licenses. Electron's `LICENSE` and `LICENSES.chromium.html` are shipped alongside the executable.

- [Electron source and release](https://github.com/electron/electron/releases/tag/v44.7.2).
- [Electron license](https://github.com/electron/electron/blob/v44.7.2/LICENSE).

## Build tooling

electron-builder is MIT licensed. Build dependencies and exact versions are recorded in `pnpm-lock.yaml`. Build-only tools are not included in the application bundle.

## Source availability

Framecut source is publicly available at https://github.com/Salvehn/framecut. The upstream FFmpeg sources and binary build resources are linked above. If redistributing the binary, keep the notices and licenses and supply the corresponding source, including any modifications and build scripts, as required by the components' licenses.
