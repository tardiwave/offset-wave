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
