const files = [
  'audio/harmonica1.mp3',
  'audio/harmonica2.mp3',
  'audio/whistle.mp3',
  'audio/banjo1.mp3',
  'audio/banjo2.mp3',
  'audio/piano.mp3',
  'audio/bass.mp3',
  'audio/crash.mp3',
  'audio/hihat.mp3',
  'audio/snare.mp3',
  'audio/stick+kick.mp3'
]

const grid = document.getElementById('grid')
const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
let isPlaying = false
let sources = []
const gainNodes = []
const analyserNodes = []
const canvasElements = []
const trackBuffers = []

const controlCell = document.createElement('div')
controlCell.className = 'cell controls'
const title = document.createElement('div')
title.innerHTML = '<b>slider - super mario 64</b><br>click cell to mute/unmute'
const button = document.createElement('button')
button.textContent = 'play'
controlCell.appendChild(title)
controlCell.appendChild(button)
grid.appendChild(controlCell)

button.addEventListener('click', () => {
  if (!isPlaying) {
    audioCtx.resume().then(() => {
      startAll()
      isPlaying = true
      button.textContent = 'pause'
    })
  } else {
    sources.forEach(src => src.stop())
    sources = []
    isPlaying = false
    button.textContent = 'play'
  }
})

Promise.all(files.map(f => fetch(f).then(r => r.arrayBuffer()).then(b => audioCtx.decodeAudioData(b))))
  .then(buffers => {
    document.getElementById('loading').style.display = 'none'
    buffers.forEach((buffer, i) => {
      trackBuffers.push(buffer)
      const gain = audioCtx.createGain()
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      gain.connect(analyser).connect(audioCtx.destination)

      const cell = document.createElement('div')
      cell.className = 'cell unmuted'
      const canvas = document.createElement('canvas')
      const label = document.createElement('div')
      label.className = 'label'
      label.textContent = files[i].split('/').pop()
      cell.appendChild(canvas)
      cell.appendChild(label)
      grid.appendChild(cell)

      cell.addEventListener('click', () => {
        const g = gain.gain
        g.value = g.value > 0 ? 0 : 1
        cell.className = 'cell ' + (g.value > 0 ? 'unmuted' : 'muted')
      })

      canvasElements.push(canvas)
      gainNodes.push(gain)
      analyserNodes.push(analyser)
    })
    render()
  })

function startAll() {
  sources = []
  trackBuffers.forEach((buffer, i) => {
    const source = audioCtx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(gainNodes[i])
    source.start(0)
    sources.push(source)
  })
}

function render() {
  requestAnimationFrame(render)
  analyserNodes.forEach((analyser, i) => {
    const canvas = canvasElements[i]
    const ctx = canvas.getContext('2d')
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteTimeDomainData(data)
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = '#0f0'
    ctx.beginPath()
    for (let x = 0; x < w; x++) {
      const index = Math.floor(x / w * data.length)
      const y = (data[index] / 255) * h
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  })
}
