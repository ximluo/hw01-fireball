import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';

class Mesh extends Drawable {
  indices: Uint32Array;
  positions: Float32Array;
  normals: Float32Array;

  constructor(positions: Float32Array, normals: Float32Array, indices: Uint32Array) {
    super();
    this.positions = positions;
    this.normals = normals;
    this.indices = indices;
  }

  create() {
    this.generateIdx();
    this.generatePos();
    this.generateNor();

    this.count = this.indices.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
    gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);

    console.log(`Created mesh with ${this.positions.length / 4} vertices`);
  }
};

export default Mesh;
