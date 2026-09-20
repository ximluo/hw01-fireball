#version 300 es

uniform mat4 u_ViewProj;
uniform float u_Time;
uniform float u_TailLength;
uniform float u_SparkDensity;
uniform float u_Audio;
uniform vec2 u_Resolution;

in vec4 vs_Pos;

out float fs_Age;
out float fs_Seed;
out float fs_Type;
out float fs_Angle;

const vec3 tailDir = normalize(vec3(0.6, 0.7, -0.4));

float parabola(float x, float k) {
    return pow(4.0 * x * (1.0 - x), k);
}

void main()
{
    vec4 seed = vs_Pos;
    if (seed.w > u_SparkDensity) {
        gl_Position = vec4(0.0, 0.0, -3.0, 1.0);
        gl_PointSize = 0.0;
        return;
    }

    float type = step(0.75, fract(seed.w * 37.0));
    float life = mix(1.0 + seed.z * 1.2, 0.3 + seed.z * 0.3, type);
    float age = fract((u_Time + seed.x * 97.0) / life);
    float cycle = floor((u_Time + seed.x * 97.0) / life);
    vec3 r = fract(seed.xyz * 13.7 + cycle * vec3(0.37, 0.71, 0.19)) * 2.0 - 1.0;

    vec3 start = normalize(r + tailDir * 2.0) * (0.9 + 0.6 * u_TailLength * seed.z);
    float speed = mix(0.4 + seed.y * 0.8, 2.0 + seed.y * 2.0, type) + u_Audio * 1.5;
    vec3 vel = tailDir * speed + r * mix(0.3, 0.6, type);
    float dist = age * life;
    vec3 pos = start + vel * dist * (0.25 + 0.2 * u_TailLength);
    pos += vec3(sin(age * 9.0 + seed.y * 20.0), cos(age * 7.0 + seed.z * 20.0), 0.0) * 0.15 * age * (1.0 - type);

    vec4 clip = u_ViewProj * vec4(pos, 1.0);
    vec4 clipNext = u_ViewProj * vec4(pos + vel * 0.05, 1.0);
    vec2 screenDir = (clipNext.xy / clipNext.w - clip.xy / clip.w) * u_Resolution;
    float spin = seed.y * 6.2831 + u_Time * (1.0 + 3.0 * seed.z) * (seed.x > 0.5 ? 1.0 : -1.0);
    fs_Angle = mix(spin, atan(screenDir.y, screenDir.x), type);

    fs_Age = age;
    fs_Seed = seed.y;
    fs_Type = type;
    gl_Position = clip;

    float shrink = 1.0 - age;
    shrink = shrink * shrink * (3.0 - 2.0 * shrink);
    float emberSize = (2.0 + 4.0 * seed.z * seed.z) * parabola(min(age * 4.0, 0.5), 0.5) * shrink;
    float sparkSize = (3.5 + 3.0 * seed.z) * parabola(age, 0.3);
    gl_PointSize = mix(emberSize, sparkSize, type) * u_Resolution.y / 800.0 * 10.0 / max(clip.w, 0.1);
}
