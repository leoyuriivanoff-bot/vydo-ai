# VYDO AI — versão inicial

PWA-friendly web app using Vite + ffmpeg.wasm. Features: choose a local video, trim by start/end time, apply basic image filter, fit to common aspect ratios, encode MP4 while retaining the original audio (no music is added).

## Run locally

```sh
npm install
npm run dev
```

## Build for static hosting

```sh
npm run build
```
Upload the `dist` directory to a static host such as Cloudflare Pages. If connected to GitHub, use build command `npm run build` and output directory `dist`.

## Notes
- First edit downloads the FFmpeg WebAssembly engine from unpkg.
- Video processing is local in the browser and may be slow or run out of memory on mobile Safari. Start with short, small clips.
- This is real video processing, not generative AI. Automatic scene selection/smart cuts would be a later feature requiring additional logic or a model.
