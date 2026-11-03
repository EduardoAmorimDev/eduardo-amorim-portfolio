/**
 * A Schwarzschild black hole, ray traced per pixel. Units: the event
 * horizon's radius r_s = 1. Each ray leaves the camera and is bent by
 * a = -1.5 h² r̂ / r⁴ (h: its angular momentum), the classic form of the
 * light-like geodesic in flat coordinates; it ends in the horizon (black),
 * crossing the thin disk (its light, Doppler-beamed), or escaping to the sky
 * (stars and a faint band, seen through the lens).
 */

export const GARGANTUA_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  // invariant: a quad already in clip space; the scene's camera is unused.
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const GARGANTUA_FRAGMENT = /* glsl */ `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uLook;
uniform float uPush;
uniform vec2 uCentre;
uniform float uWiden;
uniform float uIntro;
uniform vec3 uHot;
uniform vec3 uWarm;
uniform vec3 uCool;
uniform vec3 uSky;

varying vec2 vUv;

const float DISK_IN = 3.0;
const float DISK_OUT = 14.0;
const float ESCAPE = 48.0;
const int STEPS = 170;
const float FOCAL = 1.7;
const float PI = 3.14159265;

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

vec3 hash33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), u.x),
        mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), u.x), u.y),
    mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), u.x),
        mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), u.x), u.y),
    u.z);
}

float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * noise(p);
    p = p * 2.03 + 17.1;
    amp *= 0.5;
  }
  return sum;
}

// why: a random point per cell of the direction grid keeps stars sparse.
vec3 starLayer(vec3 dir, float scale, float density, float size) {
  vec3 p = dir * scale;
  vec3 cell = floor(p);
  vec3 h = hash33(cell);
  if (h.x > density) return vec3(0.0);
  vec3 star = cell + 0.2 + 0.6 * hash33(cell + 7.7);
  float d = length(p - star);
  float glow = smoothstep(size, 0.0, d);
  float bright = pow(h.y, 6.0) * 1.6 + 0.08;
  vec3 tint = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.9, 0.8), h.z);
  return tint * glow * glow * bright;
}

vec3 sky(vec3 dir, float starDim) {
  vec3 col = starLayer(dir, 140.0, 0.30, 0.22);
  col += starLayer(dir, 60.0, 0.12, 0.14) * 1.4;
  col *= starDim;
  // why: a faint galactic band, tilted, in the brand's blues, gives depth.
  float band = exp(-pow(dot(dir, normalize(vec3(0.25, 1.0, 0.35))) * 3.2, 2.0));
  float dust = fbm(dir * 3.5 + 4.0);
  col += uSky * band * smoothstep(0.35, 0.85, dust) * 0.22;
  return col;
}

// invariant: returns premultiplied-ready light (rgb) and cover (a).
vec4 disk(vec3 hit, vec3 rayDir) {
  float r = length(hit.xz);
  float phi = atan(hit.z, hit.x);
  // why: Kepler, angular speed ∝ r^-1.5: the inner disk turns fastest.
  float spin = phi + uTime * 0.35 * pow(DISK_IN / r, 1.5);
  vec3 q = vec3(cos(spin) * 1.6, sin(spin) * 1.6, r * 0.9);
  float gas = fbm(q * vec3(1.0, 1.0, 2.2) + vec3(0.0, 0.0, uTime * 0.02));
  float streaks = 0.55 + 0.45 * sin(r * 9.0 + gas * 6.0);
  float edgeIn = smoothstep(DISK_IN, DISK_IN + 0.5, r);
  float edgeOut = smoothstep(DISK_OUT, DISK_OUT * 0.55, r);
  float heat = pow(DISK_IN / r, 2.3);

  // why: the gas orbits at v ≈ sqrt(1 / (2 (r - 1))); the side moving
  // towards the camera is beamed brighter and bluer (Doppler, ∝ D³).
  vec3 orbit = normalize(vec3(-hit.z, 0.0, hit.x));
  float v = min(sqrt(0.5 / (r - 1.0)), 0.7);
  float gamma = 1.0 / sqrt(1.0 - v * v);
  float cosTheta = dot(orbit, -rayDir);
  float doppler = 1.0 / (gamma * (1.0 - v * cosTheta));
  float redshift = sqrt(1.0 - 1.0 / r);
  float shift = doppler * redshift;

  float lum = heat * pow(shift, 3.0) * edgeIn * edgeOut * (0.35 + 0.9 * gas * streaks);
  float t = clamp(heat * shift * 1.25, 0.0, 1.0);
  vec3 col = mix(uCool, uWarm, smoothstep(0.05, 0.45, t));
  col = mix(col, uHot, smoothstep(0.45, 1.0, t));
  float alpha = clamp((heat * 2.4 + gas * 0.25) * edgeIn * edgeOut, 0.0, 1.0);
  return vec4(col * lum * 3.2, alpha);
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec2 p = ((gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y - uCentre) * uWiden;

  // why: a camera just above the disk's plane, rolled, as in Interstellar.
  float dist = mix(26.0, 19.0, uPush) + (1.0 - uIntro) * 14.0;
  float yaw = 0.6 + uLook.x * 0.05 + uTime * 0.004;
  float pitch = 0.085 + uLook.y * 0.03 + uPush * 0.03;
  vec3 cam = dist * vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch));
  vec3 forward = normalize(-cam);
  vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, forward);
  float roll = -0.16;
  vec3 r2 = cos(roll) * right + sin(roll) * up;
  vec3 u2 = -sin(roll) * right + cos(roll) * up;

  vec3 pos = cam;
  vec3 vel = normalize(forward * FOCAL + r2 * p.x + u2 * p.y);
  vec3 c = cross(pos, vel);
  float h2 = dot(c, c);

  vec3 col = vec3(0.0);
  float cover = 0.0;
  float glow = 0.0;
  bool captured = false;

  for (int i = 0; i < STEPS; i++) {
    float rr = dot(pos, pos);
    float r = sqrt(rr);
    if (r < 1.0) { captured = true; break; }
    if (r > ESCAPE && dot(pos, vel) > 0.0) break;
    // why: long steps far out, short ones near the hole, where light bends
    float dt = clamp(0.1 * (r - 0.6), 0.03, 3.0);
    vec3 acc = -1.5 * h2 * pos / (rr * rr * r);
    vec3 prev = pos;
    vel += acc * dt;
    pos += vel * dt;

    // why: the disk's haze scatters light, thickest near its inner edge.
    float planar = length(pos.xz);
    glow += dt * exp(-abs(pos.y) * 3.0) * smoothstep(DISK_OUT, DISK_IN, planar) * 0.006 / max(planar - 1.5, 0.4);

    if (prev.y * pos.y < 0.0) {
      vec3 hit = mix(prev, pos, prev.y / (prev.y - pos.y));
      float hr = length(hit.xz);
      if (hr > DISK_IN && hr < DISK_OUT) {
        vec4 d = disk(hit, normalize(vel));
        col += (1.0 - cover) * d.rgb * d.a;
        cover += (1.0 - cover) * d.a;
        if (cover > 0.985) break;
      }
    }
  }

  // why: lensing keeps a star's surface brightness but stretches it into an
  // arc; near the hole the arcs read as scratches, so stretched stars dim
  // with how much the lens magnifies them (pixel footprint on the sky).
  vec3 dir = normalize(vel);
  float footprint = length(cross(dFdx(dir), dFdy(dir)));
  float pixel = uWiden / (FOCAL * uResolution.y);
  float magnified = pixel * pixel / max(footprint, 1e-12);
  float starDim = clamp(inversesqrt(max(magnified, 1.0)), 0.2, 1.0);
  if (!captured) col += (1.0 - cover) * sky(dir, starDim);
  col += uWarm * glow;

  col = aces(col * 1.1 * uIntro);
  // why: vignette and film grain give the frame its cinematic finish.
  vec2 q = vUv - 0.5;
  col *= 1.0 - dot(q, q) * 0.9;
  vec3 graded = pow(max(col, 0.0), vec3(1.0 / 2.2));
  // why: grain lives in the light, as on film; pure black stays black.
  float grain = hash13(vec3(gl_FragCoord.xy, floor(uTime * 24.0))) - 0.5;
  float light = dot(graded, vec3(0.299, 0.587, 0.114));
  graded += grain * (0.012 + 0.06 * smoothstep(0.02, 0.4, light));
  gl_FragColor = vec4(graded, 1.0);
}
`
