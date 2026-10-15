# Releases

## Local build

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm test:smoke
pnpm build
```

The build generates Windows registration hooks, packages FFmpeg/FFprobe, and creates the NSIS installer and portable executable in `dist/`. Node.js 24 and pnpm 11.25.0 are used in CI. Electron and FFmpeg need internet during initial dependency setup; the packaged player is self-contained.

## Publish an update

1. Change the version in `package.json` and refresh the lockfile with `pnpm install`.
2. Commit and push the tested source.
3. Create and push the matching tag, for example `v1.0.1`.

The Windows workflow builds the binaries, signs `framecut-update.json` with the `FRAMECUT_UPDATE_PRIVATE_KEY` repository secret, and creates the release. A tag/version mismatch fails the signing step. The initial public key is already embedded in the application and the Actions secret is configured.

Do not commit or replace the private key. Losing it requires a deliberate trust-key migration for installed clients. For a local release, set `FRAMECUT_UPDATE_KEY_FILE` to the private PEM path and run `node scripts/sign-update.cjs` after building. Upload the matching installer, portable executable, blockmap and signed manifest together; publish only after all files are present.

The signed payload pins version, filename, URL, size and SHA-256. Installed clients verify it before downloading and recheck the artifact immediately before launching the silent NSIS update. The first release can verify the live feed; a full upgrade needs a higher version. Portable replacement remains manual.

Keep [third-party notices](../THIRD_PARTY_NOTICES.md), licenses and corresponding-source access with redistributed binaries.
