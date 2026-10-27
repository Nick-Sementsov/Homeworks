"""Box-model description shared by the Java code generator, the texture painter
and the preview renderer.

Coordinates follow Minecraft's ModelPart conventions: units are model pixels,
+Y points down, -Z is the front (face) of the entity, -X is the entity's right.
"""
import math
from dataclasses import dataclass, field

import numpy as np

# Standard HumanoidModel part pivots.
PIVOTS = {
    'head': (0.0, 0.0, 0.0),
    'hat': (0.0, 0.0, 0.0),
    'body': (0.0, 0.0, 0.0),
    'right_arm': (-5.0, 2.0, 0.0),
    'left_arm': (5.0, 2.0, 0.0),
    'right_leg': (-1.9, 12.0, 0.0),
    'left_leg': (1.9, 12.0, 0.0),
}
ROOT_PARTS = ['head', 'hat', 'body', 'right_arm', 'left_arm', 'right_leg', 'left_leg']
MIRROR_OF = {'right_arm': 'left_arm', 'right_leg': 'left_leg'}


def _g3(grow):
    if isinstance(grow, (int, float)):
        return (float(grow),) * 3
    return tuple(float(g) for g in grow)


@dataclass(eq=False)
class Cube:
    origin: tuple
    size: tuple
    grow: tuple = (0.0, 0.0, 0.0)
    piece: str = 'head'      # armor slot that owns the cube: head/chest/legs/feet
    paint: object = None     # Paint spec (see paint.py)
    mirror: bool = False
    uv: tuple = None
    share: 'Cube' = None     # mirrored copy re-uses the UV block of this cube

    def __post_init__(self):
        self.grow = _g3(self.grow)
        self.size = tuple(int(s) for s in self.size)
        assert all(s >= 1 for s in self.size), self.size

    @property
    def footprint(self):
        w, h, d = self.size
        return 2 * (d + w), d + h


@dataclass(eq=False)
class Part:
    name: str
    pivot: tuple = (0.0, 0.0, 0.0)
    rot: tuple = (0.0, 0.0, 0.0)
    cubes: list = field(default_factory=list)
    children: list = field(default_factory=list)

    def box(self, x, y, z, w, h, d, grow=0.0, piece=None, paint=None):
        c = Cube((x, y, z), (w, h, d), grow, piece or self._piece, paint)
        self.cubes.append(c)
        return c

    def child(self, name, pivot=(0, 0, 0), rot=(0, 0, 0)):
        p = Part(name, tuple(float(v) for v in pivot), tuple(float(v) for v in rot))
        p._piece = self._piece
        self.children.append(p)
        return p

    def walk(self):
        yield self
        for c in self.children:
            yield from c.walk()


Part._piece = 'head'


class Model:
    """A HumanoidModel-compatible mesh."""

    def __init__(self, name, tex_w=128, tex_h=128):
        self.name = name
        self.tex_w, self.tex_h = tex_w, tex_h
        self.parts = {n: Part(n, PIVOTS[n]) for n in ROOT_PARTS}
        defaults = {'head': 'head', 'hat': 'head', 'body': 'chest', 'right_arm': 'chest',
                    'left_arm': 'chest', 'right_leg': 'legs', 'left_leg': 'legs'}
        for n, p in self.parts.items():
            p._piece = defaults[n]

    def __getitem__(self, name):
        return self.parts[name]

    # --- symmetric helpers -------------------------------------------------
    def mirror_limbs(self):
        """Copies every cube/child of the right limbs onto the left limbs (mirrored)."""
        for src_name, dst_name in MIRROR_OF.items():
            src, dst = self.parts[src_name], self.parts[dst_name]
            dst.cubes.extend(_mirror_cube(c) for c in src.cubes)
            dst.children.extend(_mirror_part(ch) for ch in src.children)

    def sym(self, part, x, y, z, w, h, d, grow=0.0, piece=None, paint=None):
        """Adds a cube and its mirror image across the X=0 plane of the same part."""
        a = part.box(x, y, z, w, h, d, grow, piece, paint)
        part.cubes.append(_mirror_cube(a))
        return a

    def sym_child(self, part, name, pivot, rot):
        """Creates a child part on the -X side and returns (right, left) pair; cubes
        added to the right child must be mirrored with finish_sym()."""
        r = part.child(name + '_r', pivot, rot)
        return r

    def finish_sym(self, part, right_child, name):
        part.children.append(_mirror_part(right_child, name + '_l'))

    # --- UV layout ---------------------------------------------------------
    def all_cubes(self):
        for n in ROOT_PARTS:
            for p in self.parts[n].walk():
                for c in p.cubes:
                    yield p, c

    def pack(self):
        owners = [c for _, c in self.all_cubes() if c.share is None]
        order = sorted(owners, key=lambda c: (-c.footprint[1], -c.footprint[0]))
        shelves = []  # [y, height, x_cursor]
        y_cursor = 0
        for c in order:
            fw, fh = c.footprint
            placed = False
            for s in shelves:
                if s[1] >= fh and s[2] + fw <= self.tex_w:
                    c.uv = (s[2], s[0])
                    s[2] += fw
                    placed = True
                    break
            if not placed:
                if y_cursor + fh > self.tex_h:
                    raise RuntimeError(f'{self.name}: texture {self.tex_w}x{self.tex_h} too small')
                shelves.append([y_cursor, fh, fw])
                c.uv = (0, y_cursor)
                y_cursor += fh
        for _, c in self.all_cubes():
            if c.share is not None:
                c.uv = c.share.uv
        return y_cursor

    # --- Java --------------------------------------------------------------
    def java_method(self, method_name):
        out = [f'    public static LayerDefinition {method_name}() {{',
               '        MeshDefinition mesh = new MeshDefinition();',
               '        PartDefinition root = mesh.getRoot();']
        for n in ROOT_PARTS:
            out.extend(_java_part(self.parts[n], 'root', n))
        out.append(f'        return LayerDefinition.create(mesh, {self.tex_w}, {self.tex_h});')
        out.append('    }')
        return '\n'.join(out)


def _mirror_cube(c):
    x, y, z = c.origin
    w = c.size[0]
    m = Cube((-(x + w), y, z), c.size, c.grow, c.piece, c.paint, not c.mirror)
    m.share = c.share or c
    return m


def _mirror_part(p, name=None):
    q = Part(name or p.name.replace('right', 'left'), (-p.pivot[0], p.pivot[1], p.pivot[2]),
             (p.rot[0], -p.rot[1], -p.rot[2]))
    q._piece = p._piece
    q.cubes = [_mirror_cube(c) for c in p.cubes]
    q.children = [_mirror_part(ch, ch.name[:-2] + '_l' if ch.name.endswith('_r') else None)
                  for ch in p.children]
    return q


def _f(v):
    s = f'{v:.4f}'.rstrip('0')
    if s.endswith('.'):
        s += '0'
    return s + 'F'


_var_counter = [0]


def _java_part(part, parent_var, var):
    lines = []
    builder = ['CubeListBuilder.create()']
    for c in part.cubes:
        x, y, z = c.origin
        w, h, d = c.size
        gx, gy, gz = c.grow
        builder.append(f'.texOffs({c.uv[0]}, {c.uv[1]})'
                       f'{".mirror()" if c.mirror else ".mirror(false)"}'
                       f'.addBox({_f(x)}, {_f(y)}, {_f(z)}, {_f(w)}, {_f(h)}, {_f(d)}, '
                       f'new CubeDeformation({_f(gx)}, {_f(gy)}, {_f(gz)}))')
    if any(part.rot):
        pose = (f'PartPose.offsetAndRotation({_f(part.pivot[0])}, {_f(part.pivot[1])}, {_f(part.pivot[2])}, '
                f'{_f(part.rot[0])}, {_f(part.rot[1])}, {_f(part.rot[2])})')
    elif any(part.pivot):
        pose = f'PartPose.offset({_f(part.pivot[0])}, {_f(part.pivot[1])}, {_f(part.pivot[2])})'
    else:
        pose = 'PartPose.ZERO'
    cubes = ('\n                ').join(builder)
    if part.children:
        _var_counter[0] += 1
        v = f'{part.name.replace("-", "_")}{_var_counter[0]}' if parent_var != 'root' else part.name
        lines.append(f'        PartDefinition {v} = {parent_var}.addOrReplaceChild("{part.name}", {cubes},\n                {pose});')
        for ch in part.children:
            lines.extend(_java_part(ch, v, ch.name))
    else:
        lines.append(f'        {parent_var}.addOrReplaceChild("{part.name}", {cubes},\n                {pose});')
    return lines


# ---------------------------------------------------------------------------
# Face geometry (mirrors ModelPart.Cube) – used by painter and renderer.
# Region rectangles in texture space, keyed by semantic face name:
#   top/bottom: visual top (min Y) / bottom (max Y)
#   front/back: -Z / +Z, west/east: -X / +X  (west = entity's right side)
def face_rects(c):
    u, v = c.uv
    w, h, d = c.size
    return {
        'top': (u + d, v, w, d),
        'bottom': (u + d + w, v, w, d),
        'west': (u, v + d, d, h),
        'front': (u + d, v + d, w, h),
        'east': (u + d + w, v + d, d, h),
        'back': (u + d + w + d, v + d, w, h),
    }


def cube_polygons(c):
    """Returns [(face, [(x,y,z,u,v) * 4])] exactly like ModelPart.Cube."""
    x0, y0, z0 = c.origin
    w, h, d = c.size
    gx, gy, gz = c.grow
    x1, y1, z1 = x0 + w + gx, y0 + h + gy, z0 + d + gz
    x0, y0, z0 = x0 - gx, y0 - gy, z0 - gz
    if c.mirror:
        x0, x1 = x1, x0
    v7 = (x0, y0, z0); v0 = (x1, y0, z0); v1 = (x1, y1, z0); v2 = (x0, y1, z0)
    v3 = (x0, y0, z1); v4 = (x1, y0, z1); v5 = (x1, y1, z1); v6 = (x0, y1, z1)
    U, V = c.uv
    f4 = U; f5 = U + d; f6 = U + d + w; f7 = U + d + w + w; f8 = U + d + w + d; f9 = U + d + w + d + w
    f10 = V; f11 = V + d; f12 = V + d + h
    polys = [
        ('top', [v4, v3, v7, v0], (f5, f10, f6, f11)),
        ('bottom', [v1, v2, v6, v5], (f6, f11, f7, f10)),
        ('west', [v7, v3, v6, v2], (f4, f11, f5, f12)),
        ('front', [v0, v7, v2, v1], (f5, f11, f6, f12)),
        ('east', [v4, v0, v1, v5], (f6, f11, f8, f12)),
        ('back', [v3, v4, v5, v6], (f8, f11, f9, f12)),
    ]
    out = []
    for name, verts, (ua, va, ub, vb) in polys:
        uvs = [(ub, va), (ua, va), (ua, vb), (ub, vb)]
        if c.mirror:
            # ModelPart.Polygon mirrors by reversing the vertex order
            verts = verts[::-1]
            uvs = uvs[::-1]
        out.append((name, [(*p, *t) for p, t in zip(verts, uvs)]))
    return out


# ---------------------------------------------------------------------------
# Software preview renderer (orthographic, z-buffered, cutout alpha).
def _rot_mats(rx, ry, rz):
    cx, sx = math.cos(rx), math.sin(rx)
    cy, sy = math.cos(ry), math.sin(ry)
    cz, sz = math.cos(rz), math.sin(rz)
    Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return Rz @ Ry @ Rx


def world_polygons(model, visible_parts=None, pose=None):
    """Yields (face, piece, verts(4x3 world), uvs(4x2), cube) for every polygon."""
    pose = pose or {}
    for n in ROOT_PARTS:
        if visible_parts is not None and n not in visible_parts:
            continue
        root = model.parts[n]
        yield from _walk_polys(root, np.eye(3), np.zeros(3), pose.get(n))


def _walk_polys(part, R, T, override=None):
    rot = override if override is not None else part.rot
    Rl = _rot_mats(*rot)
    R2 = R @ Rl
    T2 = T + R @ np.array(part.pivot)
    for c in part.cubes:
        for face, vs in cube_polygons(c):
            pts = np.array([v[:3] for v in vs])
            uvs = np.array([v[3:] for v in vs])
            yield face, c.piece, (R2 @ pts.T).T + T2, uvs, c
    for ch in part.children:
        yield from _walk_polys(ch, R2, T2)


SHADE = {'top': 1.0, 'bottom': 0.5, 'front': 0.82, 'back': 0.82, 'west': 0.64, 'east': 0.64}


class Renderer:
    def __init__(self, size=(320, 420), scale=9.0, yaw=0.5, pitch=-0.25, center=(0, 10, 0)):
        self.W, self.H = size
        self.scale = scale
        self.view = _rot_mats(pitch, 0, 0) @ _rot_mats(0, yaw, 0)
        self.center = np.array(center, dtype=float)
        self.color = np.zeros((self.H, self.W, 4), dtype=np.float32)
        self.depth = np.full((self.H, self.W), np.inf)
        # world-space light-ish direction for shading
        self.light = np.array([-0.3, -1.0, -0.6])
        self.light /= np.linalg.norm(self.light)

    def draw(self, polys, textures):
        """textures: callable(cube) -> RGBA float array (H, W, 4) or None, plus uv scale."""
        for face, piece, pts, uvs, cube in polys:
            tex = textures(cube)
            if tex is None:
                continue
            img, tw, th = tex
            self._quad(pts, uvs, img, tw, th, face)

    def _quad(self, pts, uvs, img, tw, th, face):
        P = (self.view @ (pts - self.center).T).T
        sx = P[:, 0] * self.scale + self.W / 2
        sy = P[:, 1] * self.scale + self.H / 2
        sz = P[:, 2]
        n = np.cross(pts[1] - pts[0], pts[3] - pts[0])
        nn = np.linalg.norm(n)
        if nn < 1e-9:
            return
        n = n / nn
        shade = 0.55 + 0.45 * abs(float(np.dot(n, self.light)))
        ih, iw = img.shape[:2]
        su, sv = iw / tw, ih / th
        for tri in ((0, 1, 2), (0, 2, 3)):
            self._tri(sx[list(tri)], sy[list(tri)], sz[list(tri)], uvs[list(tri)], img, su, sv, shade)

    def _tri(self, xs, ys, zs, uv, img, su, sv, shade):
        minx = max(int(math.floor(xs.min())), 0)
        maxx = min(int(math.ceil(xs.max())), self.W - 1)
        miny = max(int(math.floor(ys.min())), 0)
        maxy = min(int(math.ceil(ys.max())), self.H - 1)
        if minx > maxx or miny > maxy:
            return
        x0, x1, x2 = xs
        y0, y1, y2 = ys
        den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
        if abs(den) < 1e-9:
            return
        gx, gy = np.meshgrid(np.arange(minx, maxx + 1) + 0.5, np.arange(miny, maxy + 1) + 0.5)
        a = ((y1 - y2) * (gx - x2) + (x2 - x1) * (gy - y2)) / den
        b = ((y2 - y0) * (gx - x2) + (x0 - x2) * (gy - y2)) / den
        c = 1 - a - b
        eps = -1e-4
        inside = (a >= eps) & (b >= eps) & (c >= eps)
        if not inside.any():
            return
        z = a * zs[0] + b * zs[1] + c * zs[2]
        u = (a * uv[0, 0] + b * uv[1, 0] + c * uv[2, 0]) * su
        v = (a * uv[0, 1] + b * uv[1, 1] + c * uv[2, 1]) * sv
        ui = np.clip(np.floor(u).astype(int), 0, img.shape[1] - 1)
        vi = np.clip(np.floor(v).astype(int), 0, img.shape[0] - 1)
        texel = img[vi, ui]
        sub_depth = self.depth[miny:maxy + 1, minx:maxx + 1]
        ok = inside & (texel[..., 3] > 0.1) & (z <= sub_depth + 1e-5)
        if not ok.any():
            return
        sub_depth[ok] = z[ok]
        col = texel[..., :3] * shade
        sub_color = self.color[miny:maxy + 1, minx:maxx + 1]
        sub_color[ok, :3] = col[ok]
        sub_color[ok, 3] = 1.0

    def image(self, bg=(0.17, 0.18, 0.21)):
        out = np.zeros((self.H, self.W, 3), dtype=np.float32)
        out[:] = bg
        m = self.color[..., 3] > 0
        out[m] = self.color[m, :3]
        return (np.clip(out, 0, 1) * 255).astype(np.uint8)
