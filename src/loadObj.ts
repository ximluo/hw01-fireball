import {vec3} from 'gl-matrix';

export interface ObjData {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

export function loadObj(text: string): ObjData {
  const verts: number[][] = [];
  const norms: number[][] = [];
  const faces: number[][][] = [];

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (line.startsWith('v ')) {
      verts.push(line.slice(2).trim().split(/\s+/).map(Number));
    } else if (line.startsWith('vn ')) {
      norms.push(line.slice(3).trim().split(/\s+/).map(Number));
    } else if (line.startsWith('f ')) {
      const corners = line.slice(2).trim().split(/\s+/).map(c => {
        const parts = c.split('/');
        const v = parseInt(parts[0]) - 1;
        const n = parts.length > 2 && parts[2] !== '' ? parseInt(parts[2]) - 1 : -1;
        return [v, n];
      });
      for (let i = 1; i + 1 < corners.length; i++) {
        faces.push([corners[0], corners[i], corners[i + 1]]);
      }
    }
  }

  let minV = vec3.fromValues(Infinity, Infinity, Infinity);
  let maxV = vec3.fromValues(-Infinity, -Infinity, -Infinity);
  for (const v of verts) {
    vec3.min(minV, minV, v as any);
    vec3.max(maxV, maxV, v as any);
  }
  const center = vec3.create();
  vec3.add(center, minV, maxV);
  vec3.scale(center, center, 0.5);
  const size = vec3.create();
  vec3.sub(size, maxV, minV);
  const scale = 2.0 / Math.max(size[0], size[1], size[2]);

  const positions = new Float32Array(verts.length * 4);
  for (let i = 0; i < verts.length; i++) {
    positions[i * 4 + 0] = (verts[i][0] - center[0]) * scale;
    positions[i * 4 + 1] = (verts[i][1] - center[1]) * scale;
    positions[i * 4 + 2] = (verts[i][2] - center[2]) * scale;
    positions[i * 4 + 3] = 1;
  }

  const normals = new Float32Array(verts.length * 4);
  const indices = new Uint32Array(faces.length * 3);
  const hasNormals = norms.length > 0 && faces.every(f => f.every(c => c[1] >= 0));

  for (let i = 0; i < faces.length; i++) {
    const f = faces[i];
    indices[i * 3 + 0] = f[0][0];
    indices[i * 3 + 1] = f[1][0];
    indices[i * 3 + 2] = f[2][0];
    if (hasNormals) {
      for (const [v, n] of f) {
        normals[v * 4 + 0] += norms[n][0];
        normals[v * 4 + 1] += norms[n][1];
        normals[v * 4 + 2] += norms[n][2];
      }
    } else {
      const a = verts[f[0][0]], b = verts[f[1][0]], c = verts[f[2][0]];
      const e1 = vec3.sub(vec3.create(), b as any, a as any);
      const e2 = vec3.sub(vec3.create(), c as any, a as any);
      const fn = vec3.cross(vec3.create(), e1, e2);
      for (const [v] of f) {
        normals[v * 4 + 0] += fn[0];
        normals[v * 4 + 1] += fn[1];
        normals[v * 4 + 2] += fn[2];
      }
    }
  }

  for (let i = 0; i < verts.length; i++) {
    const n = vec3.fromValues(normals[i * 4], normals[i * 4 + 1], normals[i * 4 + 2]);
    if (vec3.length(n) < 1e-8) {
      vec3.set(n, positions[i * 4], positions[i * 4 + 1], positions[i * 4 + 2]);
    }
    vec3.normalize(n, n);
    normals[i * 4 + 0] = n[0];
    normals[i * 4 + 1] = n[1];
    normals[i * 4 + 2] = n[2];
    normals[i * 4 + 3] = 0;
  }

  return {positions, normals, indices};
}
