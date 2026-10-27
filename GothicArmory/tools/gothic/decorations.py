"""Gothic armour decorations (attached with Epic Knights' decoration recipe).

Each decoration is its own HumanoidModel-shaped mesh. Epic Knights renders
only head/body/arms of a decoration model, with textures at
textures/models/armor/<name>.png (+ <name>_overlay.png when dyeable).
"""
import math

from .model import Model
from .paint import (Paint, border, hline, vline, ridge, dots, bitmap, mask, glyphs, disc,
                    pointed_bottom, dagged, lames, round_corners)

HELMET, CHEST = 'HELMET', 'CHESTPLATE'


class Deco:
    def __init__(self, name, slot, build, dye=None):
        self.name, self.slot, self.build_fn, self.dye = name, slot, build, dye

    @property
    def dyeable(self):
        return self.dye is not None

    def build(self):
        m = Model(self.name, 64, 64)
        self.build_fn(m)
        m.mirror_limbs()
        return m


def P(role, *ops, base='metal', hide=(), over=None, **fo):
    return Paint(role, base, ops, hide, over=over, **fo)


def OV(*ops, **fo):
    """Overlay-only paint (drawn untinted on top of a dyed cube)."""
    return Paint('gold', 'none', ops, (), **fo)


def none_faces(*keep):
    return tuple(f for f in ('top', 'bottom', 'west', 'east', 'front', 'back') if f not in keep)


# ---------------------------------------------------------------------------
def spire(m):
    h = m['head']
    h.box(-2, -10.5, -2, 4, 1, 4, 0.0, paint=P('plate', border('tblr', 'gold', 2)))
    h.box(-1, -15.5, -1, 2, 5, 2, 0.0, paint=P('plate', sides=[ridge(), hline(1, 0, None, 'plate', 1), hline(3, 0, None, 'plate', 1)]))
    for y in (-14, -12):
        m.sym(h, -2, y, -0.5, 1, 1, 1, 0.0, paint=P('plate', top=[dots([(0, 0)], 'plate', 4)]))
        h.box(-0.5, y, -2, 1, 1, 1, 0.0, paint=P('plate'))
        h.box(-0.5, y, 1, 1, 1, 1, 0.0, paint=P('plate'))
    h.box(-0.5, -18.5, -0.5, 1, 3, 1, 0.0, paint=P('gold'))
    h.box(-1.5, -17.5, -0.5, 3, 1, 1, 0.0, paint=P('gold'))
    h.box(-0.5, -17.5, -1.5, 1, 1, 3, 0.0, paint=P('gold'))


WING = [
    'XX.....',
    'XXX....',
    'XXXX...',
    'XXXXX..',
    'XXXXXX.',
    '.XXXXXX',
    '.XXXXXX',
    '..XXXXX',
    '...XXXX',
    '....XXX',
    '.....XX',
]


def _shape(rows, flip=False, feather_role='dye'):
    """Masks a face to an ASCII silhouette and draws diagonal feather lines."""
    def op(cv):
        for t in range(cv.h):
            for s in range(cv.w):
                ss = cv.w - 1 - s if flip else s
                row = rows[t] if t < len(rows) else ''
                if ss >= len(row) or row[ss] != 'X':
                    cv.clear(s, t)
                elif (ss + t) % 3 == 0:
                    cv.put(s, t, feather_role, 1)
                elif (ss + t) % 3 == 1:
                    cv.put(s, t, feather_role, 3)
    return op


def gargoyle(m):
    h = m['head']
    h.box(-2, -10, -1, 4, 1, 4, 0.0, paint=P('stone', border('tblr', 'stone', 1)))
    h.box(-1.5, -13, -0.5, 3, 3, 3, 0.0, paint=P('stone', front=[vline(1, 0, None, 'stone', 1)], back=[ridge()]))
    h.box(-1.5, -15, -2.5, 3, 2, 3, 0.0, paint=P('stone', front=[dots([(0, 0), (2, 0)], 'glow', 1),
                                                                 hline(1, 0, None, 'void', 0)]))
    h.box(-1, -14.2, -3.5, 2, 1, 1, 0.0, paint=P('stone'))
    m.sym(h, -1.5, -16, -1, 1, 1, 1, 0.0, paint=P('stone', top=[dots([(0, 0)], 'stone', 4)]))
    m.sym(h, -1.5, -10.6, -1.6, 1, 1, 1, 0.0, paint=P('stone'))
    h.box(-0.5, -11, 2.5, 1, 1, 2, 0.0, paint=P('stone'))
    w = h.child('wing_r', (-1.5, -12.5, 1.0), (0, 0.45, 0.35))
    w.box(-5, -4, -0.5, 5, 5, 1, 0.0, paint=P('stone', hide=('top', 'bottom', 'west', 'east'), fb=[
        bitmap(['X....', 'XXX..', 'XXXXX', '.XXXX', '..X.X'], {'.': None, 'X': ('stone', 2)}),
        dots([(1, 1), (3, 2)], 'stone', 1)]))
    m.finish_sym(h, w, 'wing')


def raven_wings(m):
    h = m['head']
    w = h.child('wing_r', (-5.4, -5.5, 0.5), (0.0, 0.0, -0.22))
    w.box(-0.5, -11, -3.5, 1, 11, 7, 0.0, paint=P('dye', base='cloth', hide=('top', 'bottom', 'front', 'back'),
                                                west=[_shape(WING)], east=[_shape(WING, flip=True)]))
    m.finish_sym(h, w, 'wing')
    m.sym(h, -6.2, -7, -1, 2, 2, 2, 0.0, piece='overlay', paint=P('gold', border('t', 'gold', 4)))


def plume(m):
    h = m['head']
    h.box(-0.5, -11, 2.5, 1, 2, 1, (0.15, 0, 0.15), piece='overlay', paint=P('gold'))
    s1 = h.child('plume1', (0, -10.5, 3.0), (-0.35, 0, 0))
    feathers = dict(sides=[lambda cv: [cv.put(s, t, 'dye', 3 if (s + t) % 2 else 2)
                                       for t in range(cv.h) for s in range(cv.w) if s % 2 == 0]])
    s1.box(-1.5, -5, -1.5, 3, 5, 3, 0.0, paint=P('dye', base='cloth', **feathers))
    s2 = s1.child('plume2', (0, -4.6, 0), (-0.75, 0, 0))
    s2.box(-1.5, -4, -1.2, 3, 4, 3, (0.2, 0, 0), paint=P('dye', base='cloth', **feathers))
    s3 = s2.child('plume3', (0, -3.6, 0.3), (-0.9, 0, 0))
    s3.box(-1, -4, -1, 2, 4, 2, (0.3, 0, 0), paint=P('dye', base='cloth', **feathers,
                                                     fb=[mask(lambda s, t, w, h: not (t == 0 and s == 1))]))


def thorn_crown(m):
    h = m['head']
    iron = P('iron', lames(2, 0))
    h.box(-5.5, -7.5, -5.6, 11, 1, 1, 0.0, paint=P('iron', front=[dots([(5, 0)], 'ruby', 2)]))
    h.box(-5.5, -7.5, 4.6, 11, 1, 1, 0.0, paint=iron)
    m.sym(h, -5.6, -7.5, -4.6, 1, 1, 9, 0.0, paint=iron)
    h.box(-0.5, -8.0, -5.9, 1, 1, 1, (0.1, 0.1, 0.1), paint=P('ruby'))
    k = 0
    for x in (-4.5, -2.5, 1.5, 3.5):
        for z, sgn in ((-5.6, -1), (4.6, 1)):
            k += 1
            t = h.child(f'thorn{k}', (x + 0.5, -7.5, z + 0.5), (0.35 * sgn, 0, 0.3 if x < 0 else -0.3))
            t.box(-0.5, -2, -0.5, 1, 2, 1, (-0.1, 0, -0.1), paint=P('iron', top=[dots([(0, 0)], 'iron', 4)]))
    for z in (-3, 0, 3):
        k += 1
        t = h.child(f'thorn{k}', (-5.1, -7.5, z), (0, 0, -0.45))
        t.box(-0.5, -2, -0.5, 1, 2, 1, (-0.1, 0, -0.1), paint=P('iron'))
        m.finish_sym(h, t, f'thorn{k}')


FLEUR = [
    '...X...',
    '..XXX..',
    'X.XXX.X',
    'XX.X.XX',
    '.XXXXX.',
    '.HHHHH.',
    'X..X..X',
]


def fleur(m):
    h = m['head']
    h.box(-1, -10.5, -1, 2, 1, 2, 0.0, paint=P('gold'))
    h.box(-0.5, -11, -0.5, 1, 1, 1, 0.0, paint=P('gold'))
    mp = {'.': None, 'X': ('gold', 3), 'H': ('gold', 1)}
    h.box(-3.5, -18, -0.5, 7, 7, 1, 0.0, paint=P('gold', hide=('top', 'bottom', 'west', 'east'), fb=[
        bitmap(FLEUR, mp), dots([(3, 1), (3, 2)], 'gold', 4), dots([(0, 2), (6, 2)], 'gold', 2)]))


# --- chest -----------------------------------------------------------------
def cape(m):
    b = m['body']
    b.box(-4, -1, -2, 8, 2, 4, (1.7, 0.6, 1.7), paint=P('dye', base='cloth', top=[border('lr', 'dye', 1)]))
    c = b.child('cape', (0, -0.4, 3.75), (0.14, 0, 0))
    c.box(-5.5, 0, 0, 11, 18, 1, 0.0, paint=P('dye', base='cloth', hide=('top',),
          front=[lambda cv: [cv.put(s, t, 'dye', 0) for t in range(cv.h) for s in range(cv.w) if s % 2]],
          fb=[mask(dagged(2))],
          over=OV(back=[hline(-2, 0, None, 'gold', 2), hline(-3, 0, None, 'gold', 1), mask(dagged(2))])))
    m.sym(b, -3.6, -0.6, -4.2, 2, 2, 1, 0.0, piece='overlay', paint=P('gold', fb=[mask(disc), dots([(0, 0)], 'gold', 4)]))
    b.box(-1.6, 0.0, -4.0, 3, 1, 1, 0.0, piece='overlay', paint=P('gold', front=[lambda cv: [cv.put(s, 0, 'gold', 4 if s % 2 else 1) for s in range(cv.w)]]))


CROSS = [
    '..XX..',
    '.XXXX.',
    '..XX..',
    'XXXXXX',
    'XXXXXX',
    '..XX..',
    '..XX..',
    '.XXXX.',
]


def tabard(m):
    b = m['body']
    cross = bitmap(CROSS, {'X': ('gold', 3)}, at=(1, 2))
    b.box(-4, 0, -2, 8, 14, 4, (1.65, 0.25, 1.65), paint=P(
        'dye', base='cloth', hide=('bottom',),
        fb=[mask(pointed_bottom(1)), mask(dagged(2))],
        lr=[mask(lambda s, t, w, h: t == 0)],
        top=[mask(lambda s, t, w, h: s < 2 or s >= w - 2)],
        over=OV(fb=[cross, hline(0, 0, None, 'gold', 2), mask(pointed_bottom(1)), mask(dagged(2)),
                    lambda cv: [cv.put(s, cv.h - 3, 'gold', 2) for s in range(cv.w)]])))


def spiked_pauldrons(m):
    a = m['right_arm']
    a.box(-3, -3, -2, 4, 4, 4, (2.15, 0.85, 2.15), paint=P('dark', lames(2, 1), border('b', 'edge', 1), top=[ridge()]))
    a.box(-3, 0.6, -2, 4, 1, 4, (1.95, 0.3, 1.95), paint=P('dark', border('b', 'edge', 1)))
    a.box(-1.5, -7, -0.5, 1, 3, 1, 0.0, paint=P('dark', sides=[hline(0, 0, None, 'edge', 2)]))
    a.box(-8.2, -2.2, -0.5, 3, 1, 1, 0.0, paint=P('dark', west=[vline(0, 0, None, 'edge', 2)]))
    s = a.child('spike_diag', (-4.6, -3.6, 0), (0, 0, -0.75))
    s.box(-0.5, -3, -0.5, 1, 3, 1, 0.0, paint=P('dark', sides=[hline(0, 0, None, 'edge', 2)]))
    s2 = a.child('spike_front', (-1.0, -2.0, -3.6), (0.75, 0, 0))
    s2.box(-0.5, -2.5, -0.5, 1, 2, 1, 0.0, paint=P('dark', sides=[hline(0, 0, None, 'edge', 2)]))


def girdle_book(m):
    b = m['body']
    b.box(-3.6, 9.0, -3.75, 1, 3, 1, 0.0, paint=P('leather', base='flat', front=[dots([(0, 1)], 'gold', 3)]))
    bk = b.child('book', (-3.1, 11.8, -3.9), (0.12, 0.25, 0.1))
    bk.box(-1.5, 0, -1, 3, 4, 2, 0.0, paint=P(
        'leather', base='flat',
        fb=[border('tblr', 'leather', 3), dots([(1, 1), (1, 2)], 'gold', 3), dots([(0, 0), (2, 0), (0, 3), (2, 3)], 'gold', 2)],
        lr=[lambda cv: [cv.put(s, t, 'parchment', 2 - (t % 2)) for t in range(cv.h) for s in range(cv.w)], border('tb', 'leather', 2)],
        bottom=[lambda cv: [cv.put(s, t, 'parchment', 1) for t in range(cv.h) for s in range(cv.w)]]))


BEADS = [
    'b.....b',
    '.r...r.',
    '.b...b.',
    '..r.r..',
    '...b...',
    '...S...',
    '..SSS..',
    '...S...',
    '...s...',
]


def prayer_beads(m):
    b = m['body']
    b.box(-3.5, 0, -3.9, 7, 9, 1, 0.0, paint=P('wood', base='none', hide=none_faces('front', 'back'), fb=[
        bitmap(BEADS, {'b': ('wood', 3), 'r': ('ruby', 1), 'S': ('silver', 2), 's': ('silver', 1)}),
        dots([(3, 6)], 'ruby', 2)]))


DECORATIONS = [
    Deco('gothic_spire', HELMET, spire),
    Deco('gargoyle', HELMET, gargoyle),
    Deco('raven_wings', HELMET, raven_wings, dye=0x26222E),
    Deco('gothic_plume', HELMET, plume, dye=0x9A1B22),
    Deco('thorn_crown', HELMET, thorn_crown),
    Deco('fleur_de_lis', HELMET, fleur),
    Deco('gothic_cape', CHEST, cape, dye=0x6B0F16),
    Deco('gothic_tabard', CHEST, tabard, dye=0x22305E),
    Deco('spiked_pauldrons', CHEST, spiked_pauldrons),
    Deco('girdle_book', CHEST, girdle_book),
    Deco('prayer_beads', CHEST, prayer_beads),
]
