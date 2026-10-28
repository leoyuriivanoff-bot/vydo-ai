import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import './style.css';

const $ = (id) => document.getElementById(id);
const fileInput = $('videoFile');
const preview = $('preview');
const previewWrap = $('previewWrap');
const exportBtn = $('exportBtn');
const statusEl = $('status');
const progressWrap = $('progressWrap');
const progressBar = $('progressBar');
const downloadLink = $('downloadLink');
let selectedFile = null;
let previewUrl = null;
let outputUrl = null;
let ffmpeg = null;
let loaded = false;

function status(message) { statusEl.textContent = message; }
function prettySize(bytes) { return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

fileInput.addEventListener('change', () => {
  selectedFile = fileInput.files?.[0] || null;
  downloadLink.classList.add('hidden');
  if (outputUrl) URL.revokeObjectURL(outputUrl);
  outputUrl = null;
  if (!selectedFile) { exportBtn.disabled = true; previewWrap.classList.add('hidden'); status('Escolha um vídeo para começar.'); return; }
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(selectedFile);
  preview.src = previewUrl;
  previewWrap.classList.remove('hidden');
  $('fileInfo').textContent = `${selectedFile.name} · ${prettySize(selectedFile.size)}`;
  $('end').value = '';
  exportBtn.disabled = false;
  status('Vídeo carregado. Ajuste o corte e o acabamento.');
  preview.onloadedmetadata = () => { $('end').placeholder = `Duração: ${preview.duration.toFixed(1)} s`; };
});

function filtersFor(look, format) {
  const filters = [];
  if (look === 'cinema') filters.push('eq=contrast=1.12:saturation=0.92:brightness=0.01');
  if (look === 'bright') filters.push('eq=brightness=0.06:contrast=1.04');
  if (look === 'mono') filters.push('hue=s=0');
  if (format === '9:16') filters.push("scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black");
  if (format === '1:1') filters.push("scale=720:720:force_original_aspect_ratio=decrease,pad=720:720:(ow-iw)/2:(oh-ih)/2:black");
  if (format === '16:9') filters.push("scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black");
  return filters.join(',');
}

async function loadEngine() {
  if (loaded) return;
  status('Preparando o motor de edição gratuito… mantenha esta página aberta.');
  ffmpeg = new FFmpeg();
  ffmpeg.on('log', ({ message }) => { if (message && /error/i.test(message)) console.warn(message); });
  ffmpeg.on('progress', ({ progress }) => {
    progressWrap.classList.remove('hidden');
    progressBar.style.width = `${Math.max(0, Math.min(100, progress * 100))}%`;
  });
  const base = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm')
  });
  loaded = true;
}

exportBtn.addEventListener('click', async () => {
  if (!selectedFile) return;
  exportBtn.disabled = true;
  downloadLink.classList.add('hidden');
  progressWrap.classList.add('hidden');
  progressBar.style.width = '0%';
  let inputName = 'input-video';
  let outputName = 'vydo-ai-edicao.mp4';
  try {
    const start = Math.max(0, Number($('start').value) || 0);
    const endRaw = $('end').value.trim();
    const duration = preview.duration;
    const end = endRaw ? Number(endRaw) : duration;
    if (!Number.isFinite(duration) || end <= start || end > duration + 0.2) {
      status(`Confira o corte. O vídeo dura aproximadamente ${Number.isFinite(duration) ? duration.toFixed(1) : '?'} segundos.`);
      return;
    }
    if (selectedFile.size > 350 * 1024 * 1024) {
      status('Este vídeo tem mais de 350 MB. Para reduzir o risco de falha no iPhone, teste primeiro com um vídeo menor.');
      return;
    }
    await loadEngine();
    status('Lendo o vídeo…');
    await ffmpeg.writeFile(inputName, await fetchFile(selectedFile));
    const args = ['-ss', String(start), '-i', inputName, '-t', String(end - start)];
    const vf = filtersFor($('look').value, $('format').value);
    if (vf) args.push('-vf', vf);
    args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-y', outputName);
    status('Editando e exportando MP4… não feche o Safari.');
    const code = await ffmpeg.exec(args);
    if (code !== 0) throw new Error('O motor de edição não conseguiu concluir este vídeo. Tente um arquivo menor ou mais compatível.');
    const data = await ffmpeg.readFile(outputName);
    outputUrl = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
    downloadLink.href = outputUrl;
    downloadLink.classList.remove('hidden');
    status('Edição concluída. Toque em “Salvar vídeo MP4”.');
    try { await ffmpeg.deleteFile(inputName); await ffmpeg.deleteFile(outputName); } catch {}
  } catch (error) {
    console.error(error);
    status(`Não foi possível concluir: ${error?.message || 'erro inesperado'}. Confira a conexão e tente um vídeo menor.`);
  } finally {
    exportBtn.disabled = !selectedFile;
  }
});
