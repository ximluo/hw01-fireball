#version 300 es
precision highp float;

uniform vec4 u_Color;
uniform float u_Time;

in float fs_Age;
in float fs_Seed;
in float fs_Type;
in float fs_Angle;

out vec4 out_Col;

void main()
{
    vec2 p = (gl_PointCoord - vec2(0.5)) * 2.0;
    p.y = -p.y;
    float c = cos(fs_Angle);
    float s = sin(fs_Angle);
    p = mat2(c, s, -s, c) * p;

    vec3 hot = u_Color.rgb;
    vec3 orange = hot * vec3(1.0, 0.5, 0.08);
    vec3 red = hot * vec3(0.95, 0.15, 0.03);
    vec3 dark = hot * vec3(0.45, 0.04, 0.02);
    vec3 col;

    if (fs_Type > 0.5) {
        vec2 q = vec2(p.x, p.y * 2.5);
        float d = pow(abs(q.x), 4.0) + pow(abs(q.y), 4.0);
        if (d > 1.0) discard;
        col = fs_Age < 0.4 ? hot : orange;
        if (abs(q.x) > 0.5) col = orange;
    } else {
        vec2 q = vec2(p.x * (1.0 + 0.6 * fs_Seed), p.y);
        float d = pow(abs(q.x), 4.0) + pow(abs(q.y), 4.0);
        if (d > 1.0) discard;
        float blink = fract(u_Time * (2.0 + 4.0 * fs_Seed) + fs_Seed * 7.0);
        if (fs_Age > 0.6 && blink < 0.25) discard;
        vec3 outer = fs_Age < 0.35 ? orange : (fs_Age < 0.75 ? red : dark);
        vec3 inner = fs_Age < 0.35 ? hot : orange;
        float coreSize = 0.2 * (1.0 - fs_Age);
        col = d < coreSize ? inner : outer;
    }

    out_Col = vec4(col, 1.0);
}
