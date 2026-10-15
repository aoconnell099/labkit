// The shaders are imported as text with Vite's `?raw`. Declared here so the
// package's own type check, which does not load Vite's types, knows the shape.
declare module '*.glsl?raw' {
  const source: string;
  export default source;
}
