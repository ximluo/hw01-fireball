#version 300 es
precision highp float;

uniform vec4 u_Color;
uniform float u_Time;
uniform vec3 u_Eye;

in vec4 fs_Nor;
in vec4 fs_LightVec;
in vec4 fs_Col;
in vec4 fs_Pos;
in float fs_Disp;
in float fs_Tail;

out vec4 out_Col;

float hash3(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

float valueNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    float a = hash3(i);
    float b = hash3(i + vec3(1, 0, 0));
    float c = hash3(i + vec3(0, 1, 0));
    float d = hash3(i + vec3(1, 1, 0));
    float e = hash3(i + vec3(0, 0, 1));
    float g = hash3(i + vec3(1, 0, 1));
    float h = hash3(i + vec3(0, 1, 1));
    float k = hash3(i + vec3(1, 1, 1));
    float bottom = mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    float top = mix(mix(e, g, u.x), mix(h, k, u.x), u.y);
    return mix(bottom, top, u.z);
}

float bias(float b, float t) {
    return pow(t, log(b) / log(0.5));
}

float triangleWave(float x, float freq, float amplitude) {
    return abs(mod(x * freq, amplitude) - 0.5 * amplitude);
}

float easeInQuadratic(float t) {
    return t * t;
}

vec3 fireRamp(float heat) {
    vec3 hot = u_Color.rgb;
    vec3 black = hot * vec3(0.12, 0.01, 0.01);
    vec3 maroon = hot * vec3(0.45, 0.04, 0.02);
    vec3 red = hot * vec3(0.95, 0.15, 0.03);
    vec3 orange = hot * vec3(1.0, 0.5, 0.08);
    vec3 white = vec3(1.0, 0.98, 0.92);
    vec3 col = mix(black, maroon, smoothstep(0.0, 0.2, heat));
    col = mix(col, red, smoothstep(0.2, 0.4, heat));
    col = mix(col, orange, smoothstep(0.4, 0.6, heat));
    col = mix(col, hot, smoothstep(0.6, 0.8, heat));
    col = mix(col, white, smoothstep(0.8, 1.0, heat));
    return col;
}

void main()
{
    vec3 nor = normalize(vec3(fs_Nor));
    vec3 viewDir = normalize(u_Eye - vec3(fs_Pos));

    float heat = 0.75 - fs_Tail * 0.55 + fs_Disp * 0.8;
    heat += 0.08 * triangleWave(u_Time + fs_Pos.y, 2.0, 1.0);
    heat += 0.22 * (valueNoise(vec3(fs_Pos) * 5.0 + vec3(0.0, -u_Time * 2.0, u_Time * 0.5)) - 0.5);
    heat = clamp(heat, 0.0, 1.0);
    heat = bias(0.45, heat);

    float bands = 6.0;
    float stepped = floor(heat * bands) / bands;
    float edge = fract(heat * bands);
    heat = stepped + smoothstep(0.8, 1.0, edge) / bands;

    vec3 col = fireRamp(heat);

    float rim = 1.0 - max(dot(nor, viewDir), 0.0);
    col += u_Color.rgb * vec3(1.0, 0.3, 0.05) * easeInQuadratic(rim) * 0.15 * (1.0 - heat);

    out_Col = vec4(col, 1.0);
}
