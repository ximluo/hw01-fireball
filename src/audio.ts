class AudioInput {
  ctx: AudioContext = null;
  analyser: AnalyserNode = null;
  data: Uint8Array<ArrayBuffer> = null;
  element: HTMLAudioElement = null;
  smoothed: number = 0;

  private setup() {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.6;
    this.data = new Uint8Array(this.analyser.frequencyBinCount);
  }

  loadFile(file: File) {
    this.setup();
    if (this.element) {
      this.element.pause();
    }
    this.element = new Audio(URL.createObjectURL(file));
    this.element.loop = true;
    const source = this.ctx.createMediaElementSource(this.element);
    source.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.element.play();
  }

  useMic() {
    this.setup();
    if (this.element) {
      this.element.pause();
      this.element = null;
    }
    navigator.mediaDevices.getUserMedia({audio: true}).then(stream => {
      this.ctx.createMediaStreamSource(stream).connect(this.analyser);
    });
  }

  level(): number {
    if (!this.analyser) return 0;
    this.analyser.getByteFrequencyData(this.data);
    let sum = 0;
    const bins = 10;
    for (let i = 0; i < bins; i++) {
      sum += this.data[i];
    }
    const bass = sum / (bins * 255);
    this.smoothed = this.smoothed * 0.7 + bass * 0.3;
    return this.smoothed;
  }
}

export default AudioInput;
