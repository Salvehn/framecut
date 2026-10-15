<p align="center">
  <img src="assets/logo.svg" width="72" height="72" alt="Framecut logo">
</p>

<h1 align="center">Framecut</h1>

<p align="center">
  A focused video player and trimmer for Windows.<br>
  Fast cuts, precise boundaries, and local processing.
</p>

<p align="center">
  <strong>English</strong>　·　<a href="README.ru.md">Русский</a>
</p>

<p align="center">
  <a href="https://github.com/Salvehn/framecut/releases/latest"><strong>Windows</strong></a>
 　·　
  <a href="https://github.com/Salvehn/framecut/releases/latest"><strong>Portable</strong></a>
 　·　
  <a href="https://github.com/Salvehn/framecut/releases"><strong>Release notes</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/v/release/Salvehn/framecut?display_name=tag&sort=semver&style=flat-square&color=bcc9ff" alt="Latest release">
  <img src="https://img.shields.io/github/actions/workflow/status/Salvehn/framecut/windows.yml?branch=main&style=flat-square&label=build" alt="Build status">
  <img src="https://img.shields.io/badge/Windows-10%20%2F%2011%20x64-0078d4?style=flat-square&logo=windows11&logoColor=white" alt="Windows x64">
  <img src="https://img.shields.io/badge/license-GPL--3.0-58658d?style=flat-square" alt="GPL-3.0-or-later">
</p>

<p align="center">
  <img src="assets/screenshot.png" width="900" alt="Framecut for Windows">
</p>

## Highlights

- **Everyday playback.** Seek, step through frames, change speed, adjust sound, and go full screen.
- **A simpler trim.** Drag the in/out handles, enter timecodes, and preview just your selection.
- **Fast by default.** Keep the original streams or switch to precise re-encoding.
- **Two ways to save.** Create a new file or safely replace the source after the result is verified.
- **Windows integration.** Open videos from Explorer and choose Framecut as the default player in Settings.
- **Share clips.** Temporary MP4 without a Save dialog: Telegram recipient picker, Discord clipboard handoff, and native file dragging.
- **Signed updates.** Download verified releases and update the installed app with a restart.
- **A quiet interface.** Four languages, window-size presets, compact controls, custom scrollbars, and gentle motion.
- **Local processing.** No account or cloud processing. Share only when you choose.

## Trim a video

1. Open a file or drop it into the window.
2. Drag the selection boundaries or set the start and end time.
3. Choose **Fast** or **Precise**. Fast cuts follow keyframes; precise cuts re-encode the selection.
4. Hover **Save** to choose **Save** (replace the source) or **Save as…** (create a new file).

Overwrite stages and verifies the result before replacing the source, then reopens the trimmed video. Failed or cancelled exports keep the original intact. A completed overwrite cannot be undone.

See [playback, shortcuts, and format notes](docs/usage.md) for details.

## Install

| Edition | Supported system | Download |
| --- | --- | --- |
| Installer | Windows 10/11 x64 | [Windows installer](https://github.com/Salvehn/framecut/releases/latest) |
| Portable | Windows 10/11 x64 | [Portable executable](https://github.com/Salvehn/framecut/releases/latest) |

FFmpeg is bundled; no separate runtime or codec installation is needed. The installer adds **Open in Framecut** to video context menus. On Windows 11, it appears under **Show more options**. Use **Settings → Set as default** to choose file associations in Windows.

The installed edition supports in-app updates and Windows integration. Portable updates are downloaded manually from the release page.

## Development

Requires Windows x64, Node.js 24, and pnpm 11.25.0.

```powershell
pnpm install --frozen-lockfile
pnpm start
```

Run the checks and build the Windows packages:

```powershell
pnpm test
pnpm test:smoke
pnpm build
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for process boundaries and Windows registration. Build and publishing instructions are in [docs/releases.md](docs/releases.md).

## License

[GPL-3.0-or-later](LICENSE). Bundled components and their sources are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
