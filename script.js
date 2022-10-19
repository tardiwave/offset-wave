let gl = null;
let cvs = null;
const dpr = window.devicePixelRatio || 1;

const width = window.innerWidth;
const height = window.innerHeight;

let vShader = null;
let fShader = null;
let program = null;

let positionAttributeLoc = null;
let texCoordAttribLocation = null;
let timeUniformLoc = null;
let mouseUniformLoc = null;

let bufferPosition = null;
let bufferUV = null;

let positionData = null;

let time = 0;

let mouse = {
  x: 0,
  y: 0,
};

const vert = /* glsl */ `
    attribute vec2 aPosition;
    attribute vec2 aTexCoord;

    varying vec2 vTexCoord;

    void main() {
      gl_Position = vec4(aPosition, 0., 1.);

      gl_PointSize = 10.;

      vTexCoord = aTexCoord;
    }
`;

const frag = /* glsl */ `
    precision highp float;

    uniform float uTime;
    uniform vec2 uMouse;

    varying vec2 vTexCoord;

    vec4 permute(vec4 x) {
      return mod(((x * 34.0) + 1.0) * x, 289.0);
    }

    vec4 taylorInvSqrt(vec4 r) {
        return 1.79284291400159 - 0.85373472095314 * r;
    }
    vec3 fade(vec3 t) {
        return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
    }
    float cnoise(vec3 P) {
        vec3 Pi0 = floor(P);
        vec3 Pi1 = Pi0 + vec3(1.0);
        Pi0 = mod(Pi0, 289.0);
        Pi1 = mod(Pi1, 289.0);
        vec3 Pf0 = fract(P);
        vec3 Pf1 = Pf0 - vec3(1.0);
        vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
        vec4 iy = vec4(Pi0.yy, Pi1.yy);
        vec4 iz0 = Pi0.zzzz;
        vec4 iz1 = Pi1.zzzz;

        vec4 ixy = permute(permute(ix) + iy);
        vec4 ixy0 = permute(ixy + iz0);
        vec4 ixy1 = permute(ixy + iz1);

        vec4 gx0 = ixy0 / 7.0;
        vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
        gx0 = fract(gx0);
        vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
        vec4 sz0 = step(gz0, vec4(0.0));
        gx0 -= sz0 * (step(0.0, gx0) - 0.5);
        gy0 -= sz0 * (step(0.0, gy0) - 0.5);

        vec4 gx1 = ixy1 / 7.0;
        vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
        gx1 = fract(gx1);
        vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
        vec4 sz1 = step(gz1, vec4(0.0));
        gx1 -= sz1 * (step(0.0, gx1) - 0.5);
        gy1 -= sz1 * (step(0.0, gy1) - 0.5);

        vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
        vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
        vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
        vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
        vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
        vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
        vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
        vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

        vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
        g000 *= norm0.x;
        g010 *= norm0.y;
        g100 *= norm0.z;
        g110 *= norm0.w;
        vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
        g001 *= norm1.x;
        g011 *= norm1.y;
        g101 *= norm1.z;
        g111 *= norm1.w;

        float n000 = dot(g000, Pf0);
        float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
        float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
        float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
        float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
        float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
        float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
        float n111 = dot(g111, Pf1);

        vec3 fade_xyz = fade(Pf0);
        vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
        vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
        float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);

        return 2.2 * n_xyz;
    }

    vec3 applyColors(float base) {
      vec3 colorRed = vec3(0.867,0.204,0.11);
      vec3 colorOffwhite = vec3(0.992,0.937,0.89);

      vec3 mixedColor = mix(colorRed, colorOffwhite, base);

      return mixedColor;
    }

    float generateStrips(vec2 vUv) {
      vec3 colorRed = vec3(0.867,0.204,0.11);
      vec3 colorOffwhite = vec3(0.992,0.937,0.89);

      float stripCoef = mod(vUv.x * 10.0, 1.0);
      float filledStrip = step(0.5, stripCoef);

      return filledStrip;
    }

    float genrateNoise(vec2 vUv, float time) {
      float noise = sin(cnoise(vec3(vUv * 1.2, time * 0.1)) * 50.0);
      noise = step(0.2, noise);

      return noise;
    }

    void main() {
      vec2 vUv = vTexCoord;

      vec3 colorRed = vec3(0.867,0.204,0.11);
      vec3 colorOffwhite = vec3(0.992,0.937,0.89);

      float strips = generateStrips(vUv);

      vec3 stripsColor = vec3(strips);

      float noise = genrateNoise(vUv, uTime);

      vec3 finalcolor = applyColors(noise);

      gl_FragColor = vec4(finalcolor, 1.0);
    }
`;

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
  mouseUniformLoc = gl.getUniformLocation(program, "uMouse");

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

const setupMouse = () => {
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX / width;
    mouse.y = 1 - e.clientY / height;
  });
};

const render = () => {
  gl.viewport(0, 0, width * dpr, height * dpr);
  gl.useProgram(program);

  gl.enableVertexAttribArray(positionAttributeLoc);
  gl.enableVertexAttribArray(texCoordAttribLocation);
  gl.uniform1f(timeUniformLoc, time);
  gl.uniform2f(mouseUniformLoc, mouse.x, mouse.y);

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
setupMouse();

const onFrame = () => {
  update();
  render();
  requestAnimationFrame(onFrame);
};
onFrame();
