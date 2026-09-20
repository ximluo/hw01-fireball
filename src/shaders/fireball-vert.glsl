#version 300 es

uniform mat4 u_Model;
uniform mat4 u_ModelInvTr;
uniform mat4 u_ViewProj;

uniform float u_Time;
uniform float u_Amplitude;
uniform float u_FbmAmplitude;
uniform float u_FbmOctaves;
uniform float u_Frequency;
uniform float u_Speed;
uniform float u_TailLength;
uniform float u_Pulse;
uniform vec3 u_Mouse;
uniform float u_MouseStrength;
uniform float u_Audio;

in vec4 vs_Pos;
in vec4 vs_Nor;
in vec4 vs_Col;

out vec4 fs_Nor;
out vec4 fs_LightVec;
out vec4 fs_Col;
out vec4 fs_Pos;
out float fs_Disp;
out float fs_Tail;

const vec4 lightPos = vec4(5, 5, 3, 1);
const vec3 tailDir = normalize(vec3(0.6, 0.7, -0.4));

vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return normalize(fract(sin(p) * 43758.5453) * 2.0 - 1.0);
}

float perlin(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    float n000 = dot(hash3(i), f);
    float n100 = dot(hash3(i + vec3(1, 0, 0)), f - vec3(1, 0, 0));
    float n010 = dot(hash3(i + vec3(0, 1, 0)), f - vec3(0, 1, 0));
    float n110 = dot(hash3(i + vec3(1, 1, 0)), f - vec3(1, 1, 0));
    float n001 = dot(hash3(i + vec3(0, 0, 1)), f - vec3(0, 0, 1));
    float n101 = dot(hash3(i + vec3(1, 0, 1)), f - vec3(1, 0, 1));
    float n011 = dot(hash3(i + vec3(0, 1, 1)), f - vec3(0, 1, 1));
    float n111 = dot(hash3(i + vec3(1, 1, 1)), f - vec3(1, 1, 1));
    float bottom = mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y);
    float top = mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y);
    return mix(bottom, top, u.z);
}

float fbm(vec3 p) {
    float total = 0.0;
    float amp = 0.5;
    float norm = 0.0;
    for (int i = 0; i < 8; i++) {
        if (float(i) >= u_FbmOctaves) break;
        total += amp * perlin(p);
        norm += amp;
        p = p * 2.0 + vec3(7.1, 3.3, 5.7);
        amp *= 0.5;
    }
    return total / max(norm, 0.0001);
}

float ridged(vec3 p) {
    return 1.0 - abs(fbm(p)) * 2.0;
}

float bias(float b, float t) {
    return pow(t, log(b) / log(0.5));
}

float gain(float g, float t) {
    if (t < 0.5) return bias(1.0 - g, 2.0 * t) / 2.0;
    return 1.0 - bias(1.0 - g, 2.0 - 2.0 * t) / 2.0;
}

float sawtooth(float x, float period) {
    return fract(x / period);
}

float impulse(float k, float x) {
    float h = k * x;
    return h * exp(1.0 - h);
}

void main()
{
    fs_Col = vs_Col;
    vec3 nor = normalize(vec3(vs_Nor));
    vec3 pos = vec3(vs_Pos);
    vec3 dir = normalize(pos);
    float t = u_Time * u_Speed;

    float burst = 1.0 + u_Pulse * 1.2 * impulse(6.0, sawtooth(u_Time, 3.0));
    float audio = gain(0.3, clamp(u_Audio, 0.0, 1.0));
    float amp = u_Amplitude * burst * (1.0 + 1.5 * audio);

    float along = dot(dir, tailDir);
    float tailMask = smoothstep(-0.4, 0.9, along);

    float low = sin(pos.x * 1.5 + t) * sin(pos.y * 1.3 - t * 0.7) * sin(pos.z * 1.1 + t * 0.5);
    low = 0.5 * amp * (low + 0.5 * sin(t * 1.7 + pos.y * 2.0));

    vec3 flameCoord = pos * u_Frequency - tailDir * t * 2.0;
    float tongues = ridged(flameCoord);
    tongues = bias(0.3, clamp(tongues, 0.0, 1.0));
    float high = u_FbmAmplitude * burst * (fbm(pos * u_Frequency * 2.0 + t) * 0.6 + tongues * tailMask);

    float tail = tailMask * u_TailLength * (0.25 + tongues * tongues) * (1.0 + audio);

    vec3 perp = pos - along * tailDir;
    float taper = smoothstep(-0.2, 1.0, along);
    taper = 0.8 * taper * taper;
    vec3 displaced = pos - perp * taper + nor * (low + high) * (1.0 - 0.5 * taper) + (tailDir * 0.85 + nor * 0.2) * tail;

    float mouseDist = length(displaced - u_Mouse);
    float dent = (1.0 - smoothstep(0.0, 1.1, mouseDist)) * u_MouseStrength;
    dent = dent * dent * (3.0 - 2.0 * dent);
    displaced -= nor * dent;

    fs_Disp = low + high - dent;
    fs_Tail = tail + 0.35 * along;

    mat3 invTranspose = mat3(u_ModelInvTr);
    fs_Nor = vec4(invTranspose * nor, 0);

    vec4 modelposition = u_Model * vec4(displaced, 1.0);
    fs_Pos = modelposition;
    fs_LightVec = lightPos - modelposition;
    gl_Position = u_ViewProj * modelposition;
}
