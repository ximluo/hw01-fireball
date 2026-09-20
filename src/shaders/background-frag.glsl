#version 300 es
precision highp float;

uniform float u_Time;
uniform vec2 u_Resolution;
uniform float u_Audio;
uniform vec4 u_Color;

out vec4 out_Col;

float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash2(i);
    float b = hash2(i + vec2(1, 0));
    float c = hash2(i + vec2(0, 1));
    float d = hash2(i + vec2(1, 1));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
    float total = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
        total += amp * valueNoise(p);
        p = p * 2.1 + vec2(3.7, 1.9);
        amp *= 0.5;
    }
    return total;
}

float gain(float g, float t) {
    float b = 1.0 - g;
    float e = log(b) / log(0.5);
    if (t < 0.5) return pow(2.0 * t, e) / 2.0;
    return 1.0 - pow(2.0 - 2.0 * t, e) / 2.0;
}

vec3 fireRamp(float heat) {
    vec3 hot = u_Color.rgb;
    vec3 dark = hot * vec3(0.12, 0.01, 0.01);
    vec3 red = hot * vec3(0.75, 0.08, 0.02);
    vec3 orange = hot * vec3(1.0, 0.4, 0.05);
    vec3 yellow = hot * vec3(1.0, 0.9, 0.35);
    vec3 col = mix(dark, red, smoothstep(0.0, 0.35, heat));
    col = mix(col, orange, smoothstep(0.35, 0.7, heat));
    col = mix(col, yellow, smoothstep(0.7, 1.0, heat));
    return col;
}

void main()
{
    vec2 p = (gl_FragCoord.xy - 0.5 * u_Resolution) / u_Resolution.y;
    float t = u_Time * 0.25;

    vec2 q = vec2(p.x * 0.8 - t * 0.6, p.y * 2.5 + t * 0.4);
    float warp = fbm(q * 2.0 + vec2(0.0, t));
    float streaks = fbm(vec2(q.x * 1.5, q.y * 3.0 + warp * 2.5));
    float ripple = 0.5 + 0.5 * sin(p.y * 28.0 + warp * 10.0 - u_Time * 1.5);
    float heat = gain(0.7, streaks) * 0.8 + ripple * 0.35 * streaks;
    heat *= 0.9 - 0.7 * p.y;
    heat = heat * heat * 1.6;

    float glow = exp(-2.0 * length(p)) * (0.4 + 0.7 * u_Audio);
    heat += glow * 0.3;

    vec3 col = fireRamp(clamp(heat, 0.0, 1.0));
    col *= 0.8 + 0.2 * ripple;

    out_Col = vec4(col, 1.0);
}
