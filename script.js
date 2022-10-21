let gl = null;
let cvs = null;
const dpr = window.devicePixelRatio || 1;

let width = window.innerWidth;
let height = window.innerHeight;

let vShader = null;
let fShader = null;
let program = null;

let positionAttributeLoc = null;
let texCoordAttribLocation = null;

let timeUniformLoc = null;
let forceSecondNoiseUniformLoc = null;
let zoomUniformLoc = null;
let widthUniformLoc = null;
let heightUniformLoc = null;

let bufferPosition = null;
let bufferUV = null;

let positionData = null;

let time = 0;

const options = {
  forceSecondNoise: 10,
  zoom: 0.05,
};

const setupCanvas = () => {
  cvs = document.createElement("canvas");
  cvs.style.width = `${width}px`;
  cvs.style.height = `${height}px`;
  cvs.width = width * dpr;
  cvs.height = height * dpr;
  cvs.style.background = "black";

  gl = cvs.getContext("webgl");
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  document.body.appendChild(cvs);
};

const createShader = (gl, type, src) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);

  const didCompile = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

  if (didCompile) {
    return shader;
  }
  console.error(gl.getShaderInfoLog(shader));
};

const createProgram = (gl, vertexShader, fragmentShader) => {
  const prg = gl.createProgram();
  gl.attachShader(prg, vertexShader);
  gl.attachShader(prg, fragmentShader);
  gl.linkProgram(prg);

  const didLink = gl.getProgramParameter(prg, gl.LINK_STATUS);

  if (didLink) {
    return prg;
  }
  console.error(gl.getProgramInfoLog(prg));
};

const setupProgram = () => {
  vShader = createShader(gl, gl.VERTEX_SHADER, vert);
  fShader = createShader(gl, gl.FRAGMENT_SHADER, frag);
  program = createProgram(gl, vShader, fShader);
};

const setupData = () => {
  // Attribute location
  positionAttributeLoc = gl.getAttribLocation(program, "aPosition");
  texCoordAttribLocation = gl.getAttribLocation(program, "aTexCoord");

  // Uniform location
  timeUniformLoc = gl.getUniformLocation(program, "uTime");
  forceSecondNoiseUniformLoc = gl.getUniformLocation(
    program,
    "uForceSecondNoise"
  );
  zoomUniformLoc = gl.getUniformLocation(program, "uZoom");
  widthUniformLoc = gl.getUniformLocation(program, "uWidth");
  heightUniformLoc = gl.getUniformLocation(program, "uHeight");

  // Buffer
  bufferPosition = gl?.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferPosition);
  positionData = new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]);
  gl.bufferData(gl.ARRAY_BUFFER, positionData, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  bufferUV = gl?.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferUV);
  uvData = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]);
  gl.bufferData(gl.ARRAY_BUFFER, uvData, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  bufferIndice = gl?.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferIndice);
  const indicesData = [0, 1, 2, 2, 1, 3];
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indicesData),
    gl.STATIC_DRAW
  );
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
};

const setupSettings = () => {
  const gui = new dat.GUI();
  const fSettings = gui.addFolder("Settings");
  fSettings.add(options, "forceSecondNoise", 0, 100, 2);
  fSettings.add(options, "zoom", 0, 2, 0.01);
  fSettings.open();
};

const setupOnResize = () => {
  window.addEventListener("resize", () => {
    width = window.innerWidth;
    height = window.innerHeight;

    cvs.style.width = `${width}px`;
    cvs.style.height = `${height}px`;
    cvs.width = width * dpr;
    cvs.height = height * dpr;
  });
};

const render = () => {
  gl.viewport(0, 0, width * dpr, height * dpr);
  gl.useProgram(program);

  gl.enableVertexAttribArray(positionAttributeLoc);
  gl.enableVertexAttribArray(texCoordAttribLocation);
  gl.uniform1f(timeUniformLoc, time);
  gl.uniform1f(forceSecondNoiseUniformLoc, options.forceSecondNoise);
  gl.uniform1f(zoomUniformLoc, options.zoom);
  gl.uniform1f(widthUniformLoc, width);
  gl.uniform1f(heightUniformLoc, height);

  gl.bindBuffer(gl.ARRAY_BUFFER, bufferPosition);
  gl.vertexAttribPointer(positionAttributeLoc, 2, gl.FLOAT, false, 8, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  gl.bindBuffer(gl.ARRAY_BUFFER, bufferUV);
  gl.vertexAttribPointer(texCoordAttribLocation, 2, gl.FLOAT, false, 8, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  gl.drawElements(gl.TRIANGLES, 1 * 6, gl.UNSIGNED_SHORT, 0);
};

const update = () => {
  time += 0.01;
};

setupCanvas();
setupProgram();
setupData();
setupSettings();
setupOnResize();

const onFrame = () => {
  update();
  render();
  requestAnimationFrame(onFrame);
};
onFrame();
