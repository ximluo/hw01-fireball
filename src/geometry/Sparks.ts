import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';

class Sparks extends Drawable {
  seeds: Float32Array;
  indices: Uint32Array;

  constructor(public particleCount: number) {
    super();
  }

  create() {
    this.seeds = new Float32Array(this.particleCount * 4);
    this.indices = new Uint32Array(this.particleCount);
    for (let i = 0; i < this.particleCount; i++) {
      for (let k = 0; k < 4; k++) {
        this.seeds[i * 4 + k] = Math.random();
      }
      this.indices[i] = i;
    }

    this.generateIdx();
    this.generatePos();

    this.count = this.indices.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, this.seeds, gl.STATIC_DRAW);
  }

  drawMode(): GLenum {
    return gl.POINTS;
  }
};

export default Sparks;
