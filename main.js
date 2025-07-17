const SONGLIST = [
  "athretic",
  "balloon",
  "big",
  "bomb",
  "boss",
  "bossintro",
  "casino",
  "casinom3",
  "chijou",
  "clear",
  "debut",
  "dolpic",
  "dropstar",
  "dungeon",
  "ending",
  "esp",
  "extra",
  "fire",
  "firstcap",
  "gameover",
  "goal",
  "happy",
  "hiscore",
  "jazz",
  "jugemu",
  "kagi",
  "kinopio",
  "kp3clear",
  "kpclear",
  "kuppa",
  "kuppa3",
  "kuppamsg",
  "merry",
  "metal",
  "miniclear",
  "minicoin",
  "minihana",
  "minihiscore",
  "minimerry",
  "minimotos",
  "minimuteki",
  "miniover",
  "minipukkun",
  "minisnow2",
  "minivocal",
  "motos",
  "mugen",
  "muteki",
  "nazo",
  "obake",
  "opening",
  "otoate",
  "outputs",
  "overslot",
  "owlfly",
  "panel",
  "peach",
  "perfect",
  "playroom",
  "pukkun",
  "select",
  "shiro",
  "slvstar1",
  "slvstar2",
  "slvstar3",
  "slvstar4",
  "slvstar5",
  "snow2",
  "staffroll",
  "star",
  "start",
  "title",
  "usagi-0",
  "usagi-1",
  "vocal",
  "vsathretic",
  "vsclear",
  "vsdropstar",
  "vslose",
  "vsmuteki",
  "vsshiro",
  "vswin",
  "wakeup",
  "water",
];
const amplitudeScale = 1.5;

let currentSong = null;
let isPlaying = false;
let sources = [];
const gainNodes = [];
const analyserNodes = [];
const canvasElements = [];
const trackBuffers = [];
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const grid = document.getElementById("grid");
const loadingDiv = document.getElementById("loading");
const infoModal = document.getElementById("infoModal");
const infoOkBtn = document.getElementById("infoOkBtn");

// Create the single control cell with title, dropdown, and play/pause button
const controlCell = document.createElement("div");
controlCell.className = "cell controls";

const title = document.createElement("div");
title.innerHTML = "<b>oscope64</b>";

// Dropdown with label
const dropdownContainer = document.createElement("div");
dropdownContainer.style.display = "flex";
dropdownContainer.style.flexDirection = "column";
dropdownContainer.style.alignItems = "center";
dropdownContainer.style.gap = "4px";

const dropdownLabel = document.createElement("div");
dropdownLabel.textContent = "current song:";

const selector = document.createElement("select");
selector.id = "songSelector";
SONGLIST.forEach((song) => {
  const option = document.createElement("option");
  option.value = song;
  option.textContent = song;
  selector.appendChild(option);
});
selector.addEventListener("change", () => {
  loadSong(selector.value);
});

dropdownContainer.appendChild(dropdownLabel);
dropdownContainer.appendChild(selector);

// Play/pause button
const button = document.createElement("button");
button.textContent = "play";

controlCell.appendChild(title);
controlCell.appendChild(dropdownContainer);
controlCell.appendChild(button);
grid.appendChild(controlCell);

button.addEventListener("click", () => {
  if (!isPlaying) {
    audioCtx.resume().then(() => {
      startAll();
      isPlaying = true;
      button.textContent = "pause";
    });
  } else {
    stopAll();
    isPlaying = false;
    button.textContent = "play";
  }
});

function stopAll() {
  sources.forEach((src) => src.stop());
  sources = [];
}

function startAll() {
  sources = [];
  trackBuffers.forEach((buffer, i) => {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gainNodes[i]);
    source.start(0);
    sources.push(source);
  });
}

function render() {
  requestAnimationFrame(render);
  analyserNodes.forEach((analyser, i) => {
    const canvas = canvasElements[i];
    const ctx = canvas.getContext("2d");

    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    const w = canvas.width;
    const h = canvas.height;
    const floatData = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(floatData);

    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.strokeStyle = "#0f0";

    for (let x = 0; x < w; x++) {
      const index = Math.floor((x / w) * floatData.length);
      const sample = floatData[index] || 0;
      const y = h / 2 - sample * (h / 2) * amplitudeScale;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }

    ctx.stroke();
  });
}

function unlockAudioContext(ctx) {
  if (ctx.state !== "suspended") return;

  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);

  ctx.resume();
}

async function loadSong(songName) {
  if (currentSong === songName) return;

  currentSong = songName;
  stopAll();
  gainNodes.length = 0;
  analyserNodes.length = 0;
  canvasElements.length = 0;
  trackBuffers.length = 0;

  // Remove old cells except controls
  const cells = Array.from(document.querySelectorAll(".cell"));
  cells.forEach((c) => {
    if (!c.classList.contains("controls")) c.remove();
  });

  loadingDiv.style.display = "block";

  const indexPath = `audio/${songName}/index.json`;
  const response = await fetch(indexPath);
  const files = await response.json();

  files.sort(
    new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }).compare
  );

  const buffers = await Promise.all(
    files.map((f) =>
      fetch(`audio/${songName}/${f}`)
        .then((r) => r.arrayBuffer())
        .then((b) => audioCtx.decodeAudioData(b))
    )
  );

  buffers.forEach((buffer, i) => {
    trackBuffers.push(buffer);
    const gain = audioCtx.createGain();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    gain.connect(analyser).connect(audioCtx.destination);

    const cell = document.createElement("div");
    cell.className = "cell unmuted";

    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.width = 300;
    canvas.height = 80;

    const resizeObserver = new ResizeObserver(() => {
      canvas.width = cell.clientWidth;
      canvas.height = cell.clientHeight;
    });
    resizeObserver.observe(cell);

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = files[i];

    cell.appendChild(canvas);
    cell.appendChild(label);
    grid.appendChild(cell);

    cell.addEventListener("click", () => {
      const g = gain.gain;
      g.value = g.value > 0 ? 0 : 1;
      cell.className = "cell " + (g.value > 0 ? "unmuted" : "muted");
    });

    canvasElements.push(canvas);
    gainNodes.push(gain);
    analyserNodes.push(analyser);
  });

  loadingDiv.style.display = "none";
  isPlaying = false;
  button.textContent = "play";
}

infoOkBtn.addEventListener("click", () => {
  infoModal.style.display = "none";
  unlockAudioContext(audioCtx);
  startApp();
});

async function startApp() {
  await loadSong(SONGLIST[0]);
  isPlaying = false;
  button.textContent = "play";
  render();
}
