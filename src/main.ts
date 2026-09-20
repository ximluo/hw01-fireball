import {vec2, vec3, vec4, mat4} from 'gl-matrix';
import Stats from 'stats-js';
import * as DAT from 'dat.gui';
import Icosphere from './geometry/Icosphere';
import Square from './geometry/Square';
import Mesh from './geometry/Mesh';
import Sparks from './geometry/Sparks';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import Drawable from './rendering/gl/Drawable';
import {loadObj} from './loadObj';
import AudioInput from './audio';

import fireballVertSource from './shaders/fireball-vert.glsl?raw';
import fireballFragSource from './shaders/fireball-frag.glsl?raw';
import backgroundVertSource from './shaders/background-vert.glsl?raw';
import backgroundFragSource from './shaders/background-frag.glsl?raw';
import sparksVertSource from './shaders/sparks-vert.glsl?raw';
import sparksFragSource from './shaders/sparks-frag.glsl?raw';
import starObj from './models/star.obj?raw';

const DEFAULTS = {
  tesselations: 6,
  mesh: 'icosphere',
  amplitude: 0.25,
  fbmAmplitude: 0.3,
  fbmOctaves: 4,
  frequency: 1.8,
  speed: 0.8,
  tailLength: 1.4,
  pulse: false,
  sparks: 0.12,
  hotColor: [255, 230, 120],
  mouseStrength: 0.5,
  audioStrength: 1.0,
};

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  ...DEFAULTS,
  'Load OBJ': loadObjFile,
  'Load Music': loadMusic,
  'Use Microphone': useMic,
  'Reset Defaults': resetDefaults,
};

let icosphere: Icosphere;
let square: Square;
let star: Mesh;
let sparks: Sparks;
let customMesh: Mesh = null;
let prevTesselations: number = DEFAULTS.tesselations;
let gui: DAT.GUI;
const audio = new AudioInput();
const mouseWorld = vec3.create();
const mouseSmooth = vec3.create();
let mouseActive = 0;
let mouseSmoothStrength = 0;

function loadScene() {
  icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, controls.tesselations);
  icosphere.create();
  square = new Square(vec3.fromValues(0, 0, 0));
  square.create();
  const starData = loadObj(starObj);
  star = new Mesh(starData.positions, starData.normals, starData.indices);
  star.create();
  sparks = new Sparks(1500);
  sparks.create();
}

function resetDefaults() {
  Object.assign(controls, DEFAULTS, {hotColor: [...DEFAULTS.hotColor]});
  gui.updateDisplay();
}

function pickFile(accept: string, onPick: (file: File) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.onchange = () => {
    if (input.files.length > 0) onPick(input.files[0]);
  };
  input.click();
}

function loadObjFile() {
  pickFile('.obj', file => {
    file.text().then(text => {
      const data = loadObj(text);
      customMesh = new Mesh(data.positions, data.normals, data.indices);
      customMesh.create();
      controls.mesh = 'custom';
      gui.updateDisplay();
    });
  });
}

function loadMusic() {
  pickFile('audio/*', file => audio.loadFile(file));
}

function useMic() {
  audio.useMic();
}

function currentMesh(): Drawable {
  if (controls.mesh === 'star') return star;
  if (controls.mesh === 'custom' && customMesh) return customMesh;
  return icosphere;
}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  gui = new DAT.GUI();
  const shape = gui.addFolder('Shape');
  shape.add(controls, 'mesh', ['icosphere', 'star', 'custom']);
  shape.add(controls, 'tesselations', 0, 8).step(1);
  shape.add(controls, 'Load OBJ');
  shape.open();
  const noise = gui.addFolder('Noise');
  noise.add(controls, 'amplitude', 0, 1);
  noise.add(controls, 'fbmAmplitude', 0, 0.6);
  noise.add(controls, 'fbmOctaves', 1, 8).step(1);
  noise.add(controls, 'frequency', 0.5, 8);
  noise.add(controls, 'speed', 0, 3);
  noise.add(controls, 'tailLength', 0, 3);
  noise.add(controls, 'pulse');
  noise.add(controls, 'sparks', 0, 1);
  noise.open();
  const look = gui.addFolder('Look and Input');
  look.addColor(controls, 'hotColor');
  look.add(controls, 'mouseStrength', 0, 1.5);
  look.add(controls, 'audioStrength', 0, 3);
  look.add(controls, 'Load Music');
  look.add(controls, 'Use Microphone');
  look.open();
  gui.add(controls, 'Reset Defaults');

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(0, 0, 5), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.02, 0.0, 0.01, 1);
  gl.enable(gl.DEPTH_TEST);

  const fireball = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, fireballVertSource),
    new Shader(gl.FRAGMENT_SHADER, fireballFragSource),
  ]);
  const background = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, backgroundVertSource),
    new Shader(gl.FRAGMENT_SHADER, backgroundFragSource),
  ]);
  const sparkProg = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, sparksVertSource),
    new Shader(gl.FRAGMENT_SHADER, sparksFragSource),
  ]);

  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = 1 - (e.clientY / window.innerHeight) * 2;
    const viewProj = mat4.create();
    mat4.multiply(viewProj, camera.projectionMatrix, camera.viewMatrix);
    const inv = mat4.create();
    mat4.invert(inv, viewProj);
    const near = vec4.fromValues(x, y, -1, 1);
    const far = vec4.fromValues(x, y, 1, 1);
    vec4.transformMat4(near, near, inv);
    vec4.transformMat4(far, far, inv);
    vec4.scale(near, near, 1 / near[3]);
    vec4.scale(far, far, 1 / far[3]);
    const origin = vec3.fromValues(near[0], near[1], near[2]);
    const dir = vec3.fromValues(far[0] - near[0], far[1] - near[1], far[2] - near[2]);
    vec3.normalize(dir, dir);
    const planeNormal = vec3.normalize(vec3.create(), camera.controls.eye);
    const denom = vec3.dot(dir, planeNormal);
    if (Math.abs(denom) > 1e-6) {
      const t = -vec3.dot(origin, planeNormal) / denom;
      vec3.scaleAndAdd(mouseWorld, origin, dir, t);
      mouseActive = 1;
    }
  });
  canvas.addEventListener('mouseleave', () => { mouseActive = 0; });

  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    if(controls.tesselations != prevTesselations)
    {
      prevTesselations = controls.tesselations;
      icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, prevTesselations);
      icosphere.create();
    }

    const time = performance.now() / 1000;
    const level = audio.level() * controls.audioStrength;
    const c = controls.hotColor;
    const hot = vec4.fromValues(c[0] / 255, c[1] / 255, c[2] / 255, 1);
    const resolution = vec2.fromValues(window.innerWidth, window.innerHeight);

    background.setTime(time);
    background.setResolution(resolution);
    background.setFloat('u_Audio', level);
    background.setGeometryColor(hot);
    renderer.renderBackground(background, square);

    fireball.setTime(time);
    fireball.setFloat('u_Amplitude', controls.amplitude);
    fireball.setFloat('u_FbmAmplitude', controls.fbmAmplitude);
    fireball.setFloat('u_FbmOctaves', controls.fbmOctaves);
    fireball.setFloat('u_Frequency', controls.frequency);
    fireball.setFloat('u_Speed', controls.speed);
    fireball.setFloat('u_TailLength', controls.tailLength);
    fireball.setFloat('u_Pulse', controls.pulse ? 1 : 0);
    vec3.lerp(mouseSmooth, mouseSmooth, mouseWorld, 0.15);
    mouseSmoothStrength += (controls.mouseStrength * mouseActive - mouseSmoothStrength) * 0.08;
    fireball.setVec3('u_Mouse', mouseSmooth);
    fireball.setFloat('u_MouseStrength', mouseSmoothStrength);
    fireball.setFloat('u_Audio', level);
    renderer.render(camera, fireball, [currentMesh()], hot);

    sparkProg.setTime(time);
    sparkProg.setResolution(resolution);
    sparkProg.setGeometryColor(hot);
    sparkProg.setFloat('u_TailLength', controls.tailLength);
    sparkProg.setFloat('u_SparkDensity', controls.sparks);
    sparkProg.setFloat('u_Audio', level);
    renderer.renderSparks(camera, sparkProg, sparks);
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
