"""Procedural pixel-art painter for box-model faces.

Every cube carries a Paint spec: a material role plus per-face operations.
Faces are painted into the cube's UV block of the target texture.
"""
import random

import numpy as np

from .model import face_rects


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


class Palette(dict):
    """role -> list of RGB tuples ordered dark → light."""

    def __init__(self, **roles):
        super().__init__({k: [hexrgb(c) for c in v] for k, v in roles.items()})

    def col(self, role, i):
        ramp = self[role]
        i = max(0, min(len(ramp) - 1, i))
        return ramp[i]

    def derive(self, **roles):
        p = Palette()
        p.update(self)
        p.update({k: [hexrgb(c) for c in v] for k, v in roles.items()})
        return p


class Canvas:
    """A single face: w x h pixels, row 0 is the visual top (or back edge for top faces)."""

    def __init__(self, face, w, h, pal, rng):
        self.face, self.w, self.h, self.pal, self.rng = face, w, h, pal, rng
        self.px = np.zeros((h, w, 4), dtype=np.float32)

    def put(self, s, t, role, i, a=1.0):
        if s < 0:
            s += self.w
        if t < 0:
            t += self.h
        if 0 <= s < self.w and 0 <= t < self.h:
            if role is None:
                self.px[t, s] = (0, 0, 0, 0)
            else:
                self.px[t, s, :3] = self.pal.col(role, i)
                self.px[t, s, 3] = a

    def shift(self, s, t, delta):
        """Lightens/darkens an already painted pixel by moving along its ramp."""
        if not (0 <= s < self.w and 0 <= t < self.h) or self.px[t, s, 3] == 0:
            return
        role, i = self._lookup(self.px[t, s, :3])
        if role is not None:
            self.put(s, t, role, i + delta)

    def _lookup(self, rgb):
        for role, ramp in self.pal.items():
            for i, c in enumerate(ramp):
                if np.allclose(c, rgb, atol=1e-4):
                    return role, i
        return None, None

    def clear(self, s, t):
        self.put(s, t, None, 0)


# ---------------------------------------------------------------------------
# Paint spec
class Paint:
    def __init__(self, role='plate', base='metal', ops=None, hide=(), seed=None, over=None, **face_ops):
        self.over = over          # optional Paint drawn into the overlay (untinted) layer
        self.role = role
        self.base = base          # metal | cloth | flat | glow | none
        self.ops = list(ops or [])  # ops applied to every face
        self.face_ops = {k: (v if isinstance(v, list) else [v]) for k, v in face_ops.items()}
        self.hide = set(hide)
        self.seed = seed

    def with_ops(self, *ops, **face_ops):
        p = Paint(self.role, self.base, self.ops + list(ops), self.hide, self.seed, self.over)
        p.face_ops = {k: list(v) for k, v in self.face_ops.items()}
        for k, v in face_ops.items():
            p.face_ops.setdefault(k, [])
            p.face_ops[k].extend(v if isinstance(v, list) else [v])
        return p


def paint_model(model, pal, layer_of, tex_w, tex_h, scale=1):
    """Paints every cube owning a UV block. layer_of(cube) -> index of target layer or None.
    Returns list of RGBA float images."""
    n_layers = 1 + max((layer_of(c) or 0) for _, c in model.all_cubes())
    if any(c.paint is not None and c.paint.over is not None for _, c in model.all_cubes()):
        n_layers = max(n_layers, 2)
    layers = [np.zeros((tex_h, tex_w, 4), dtype=np.float32) for _ in range(n_layers)]
    for _, c in model.all_cubes():
        if c.share is not None:
            continue
        li = layer_of(c)
        if li is None or c.paint is None:
            continue
        img = layers[li]
        seed = c.paint.seed if c.paint.seed is not None else hash((c.uv, c.size)) & 0xffff
        rng = random.Random(seed)
        for face, (u, v, fw, fh) in face_rects(c).items():
            if fw <= 0 or fh <= 0:
                continue
            cv = Canvas(face, fw, fh, pal, rng)
            if face not in c.paint.hide:
                _base(cv, c.paint)
                for op in c.paint.ops:
                    op(cv)
                for op in c.paint.face_ops.get(face, []):
                    op(cv)
                for group, faces in GROUPS.items():
                    if face in faces:
                        for op in c.paint.face_ops.get(group, []):
                            op(cv)
            img[v:v + fh, u:u + fw] = cv.px
            ov = c.paint.over
            if ov is not None:
                oc = Canvas(face, fw, fh, pal, random.Random(seed + 1))
                oc.px[...] = 0
                if face not in ov.hide:
                    _base(oc, ov)
                    for op in ov.ops:
                        op(oc)
                    for op in ov.face_ops.get(face, []):
                        op(oc)
                    for group, faces in GROUPS.items():
                        if face in faces:
                            for op in ov.face_ops.get(group, []):
                                op(oc)
                layers[1][v:v + fh, u:u + fw] = oc.px
    return layers


GROUPS = {
    'sides': ('front', 'back', 'west', 'east'),
    'lr': ('west', 'east'),
    'fb': ('front', 'back'),
    'tb': ('top', 'bottom'),
    'all': ('front', 'back', 'west', 'east', 'top', 'bottom'),
}


def _base(cv, paint):
    role = paint.role
    w, h = cv.w, cv.h
    vertical = cv.face in ('front', 'back', 'west', 'east')
    if paint.base == 'none':
        return
    if paint.base == 'flat':
        for t in range(h):
            for s in range(w):
                cv.put(s, t, role, 1)
        return
    if paint.base == 'glow':
        for t in range(h):
            for s in range(w):
                cv.put(s, t, role, len(cv.pal[role]) - 1)
        return
    if paint.base == 'cloth':
        for t in range(h):
            for s in range(w):
                i = 1
                if vertical and w >= 3 and s % 3 == 2:
                    i = 0      # vertical folds
                if cv.face == 'top':
                    i = 2
                if cv.face == 'bottom':
                    i = 0
                if cv.rng.random() < 0.04:
                    i += cv.rng.choice((-1, 1))
                cv.put(s, t, role, i)
        return
    # metal plate
    ramp_len = len(cv.pal[role])
    mid = 2 if ramp_len >= 5 else 1
    spec = int(round(w * 0.3)) if w >= 4 else -1
    for t in range(h):
        for s in range(w):
            if cv.face == 'top':
                i = mid + 1
                if s in (0, w - 1) or t in (0, h - 1):
                    i = mid
            elif cv.face == 'bottom':
                i = mid - 1
            else:
                i = mid
                if t == 0:
                    i = mid + 1
                elif t == h - 1 and h > 2:
                    i = mid - 1
                if (s == 0 or s == w - 1) and w > 2 and t != 0:
                    i -= 1
                if s == spec and cv.face in ('front', 'back') and 0 < t < h - 1:
                    i += 1
            if cv.rng.random() < 0.03 and 0 < t < h - 1:
                i += cv.rng.choice((-1, 1))
            cv.put(s, t, role, max(1, i) if ramp_len >= 5 else i)


# ---------------------------------------------------------------------------
# Operations. Each returns a callable(canvas).
def border(sides='tblr', role='edge', i=-1, inset=0):
    def op(cv):
        ii = i if i >= 0 else len(cv.pal[role]) + i
        for s in range(cv.w):
            if 't' in sides:
                cv.put(s, inset, role, ii)
            if 'b' in sides:
                cv.put(s, cv.h - 1 - inset, role, ii - 1 if 't' in sides and cv.h > 2 else ii)
        for t in range(cv.h):
            if 'l' in sides:
                cv.put(inset, t, role, ii - 1)
            if 'r' in sides:
                cv.put(cv.w - 1 - inset, t, role, ii - 1)
    return op


def flutes(spacing=2, start=1, role=None, top=0, bottom=0, dark=1, light=3):
    def op(cv):
        r = role or _role_at(cv)
        for s in range(start, cv.w - 1, spacing):
            for t in range(top, cv.h - bottom):
                cv.put(s, t, r, dark)
                if s + 1 < cv.w - 1:
                    cv.put(s + 1, t, r, light)
    return op


def converging_flutes(role=None):
    """Gothic breastplate fluting fanning up from the waist centre."""
    def op(cv):
        r = role or _role_at(cv)
        w, h = cv.w, cv.h
        cx = (w - 1) / 2
        for k, off in enumerate((-3.0, -1.5, 1.5, 3.0)):
            for t in range(h):
                frac = t / max(1, h - 1)
                s = int(round(cx + off * (1.15 - frac * 0.75)))
                if 0 < s < w - 1:
                    cv.put(s, t, r, 1 if off < 0 else 3)
    return op


def lames(every=3, offset=0, role=None, start=0, stop=None):
    def op(cv):
        r = role or _role_at(cv)
        end = cv.h if stop is None else stop
        for t in range(start + offset, end, every):
            if t == 0:
                continue
            for s in range(cv.w):
                cv.put(s, t, r, 1)
                if t + 1 < end:
                    cv.shift(s, t + 1, 1)
    return op


def hline(t, s0=0, s1=None, role='void', i=0):
    def op(cv):
        end = cv.w if s1 is None else (s1 if s1 >= 0 else cv.w + s1)
        for s in range(s0, end):
            cv.put(s, t if t >= 0 else cv.h + t, role, i)
    return op


def vline(s, t0=0, t1=None, role='edge', i=-1):
    def op(cv):
        end = cv.h if t1 is None else (t1 if t1 >= 0 else cv.h + t1)
        ii = i if i >= 0 else len(cv.pal[role]) + i
        for t in range(t0, end):
            cv.put(s if s >= 0 else cv.w + s, t, role, ii)
    return op


def ridge(role=None, light=4):
    def op(cv):
        r = role or _role_at(cv)
        c = cv.w // 2
        for t in range(cv.h):
            cv.put(c - 1 if cv.w % 2 == 0 else c, t, r, light)
            if cv.w % 2 == 0:
                cv.put(c, t, r, 1)
    return op


def dots(points, role='void', i=0):
    def op(cv):
        for s, t in points:
            cv.put(s if s >= 0 else cv.w + s, t if t >= 0 else cv.h + t, role, i)
    return op


def rivets(points, role='trim'):
    return dots(points, role, 2)


def bitmap(rows, mapping, at=(0, 0), center=False):
    """Draws ASCII art. mapping: char -> (role, index) or None (transparent);
    unmapped chars are left untouched."""
    def op(cv):
        h = len(rows)
        w = max(len(r) for r in rows)
        ox, oy = at
        if center:
            ox = (cv.w - w) // 2 + at[0]
            oy = (cv.h - h) // 2 + at[1]
        for t, row in enumerate(rows):
            for s, ch in enumerate(row):
                if ch in mapping:
                    m = mapping[ch]
                    if m is None:
                        cv.clear(ox + s, oy + t)
                    else:
                        cv.put(ox + s, oy + t, m[0], m[1])
    return op


def mask(fn):
    """fn(s, t, w, h) -> True to keep the pixel."""
    def op(cv):
        for t in range(cv.h):
            for s in range(cv.w):
                if not fn(s, t, cv.w, cv.h):
                    cv.clear(s, t)
    return op


def clear_all():
    return mask(lambda s, t, w, h: False)


def glyphs(role='glow', density=0.18, rows=None):
    def op(cv):
        rr = rows or range(1, cv.h - 1)
        for t in rr:
            for s in range(1, cv.w - 1):
                if cv.rng.random() < density:
                    cv.put(s, t, role, len(cv.pal[role]) - 1 if cv.rng.random() < 0.5 else 0)
    return op


def noise(role, p=0.15):
    def op(cv):
        for t in range(cv.h):
            for s in range(cv.w):
                if cv.rng.random() < p:
                    cv.shift(s, t, cv.rng.choice((-1, 1)))
    return op


def _role_at(cv):
    # role of the centre pixel (falls back to plate)
    t, s = cv.h // 2, cv.w // 2
    role, _ = cv._lookup(cv.px[t, s, :3])
    return role or 'plate'


# --- masks -----------------------------------------------------------------
def pointed_bottom(depth=2):
    def keep(s, t, w, h):
        rows_from_bottom = h - 1 - t
        if rows_from_bottom >= depth:
            return True
        c = (w - 1) / 2
        allowed = (w / 2) * (rows_from_bottom + 1) / (depth + 1)
        return abs(s - c) <= allowed
    return keep


def pointed_top(depth=2):
    def keep(s, t, w, h):
        if t >= depth:
            return True
        c = (w - 1) / 2
        allowed = (w / 2) * (t + 1) / (depth + 1)
        return abs(s - c) <= allowed
    return keep


def round_corners(s, t, w, h):
    return not ((s in (0, w - 1)) and (t in (0, h - 1)))


def disc(s, t, w, h):
    cx, cy = (w - 1) / 2, (h - 1) / 2
    r = min(w, h) / 2
    return (s - cx) ** 2 + (t - cy) ** 2 <= r * r + 0.3


def dagged(period=2):
    def keep(s, t, w, h):
        return not (t == h - 1 and s % period == 1)
    return keep
