"""Gothic armour sets. One Model per style is shared by all four pieces;
every cube is tagged with the piece that owns it so that layer_1 (helmet,
chestplate, boots) and layer_2 (leggings) only paint their own cubes.
"""
import math

from .model import Model
from .paint import (Paint, border, flutes, converging_flutes, lames, hline, vline, ridge, dots,
                    rivets, bitmap, mask, glyphs, pointed_bottom, pointed_top, round_corners,
                    disc, dagged)

OPTS = {
    'blackened': dict(helmet='sallet', trim='edge', pauldron=1.6, fan=(4, 5), toe=3, besagew=False,
                      waist='tassets', breast='converging', lacquer=False, spikes=False, cape=False,
                      glow=False, fluting=False),
    'gilded': dict(helmet='armet', trim='trim', pauldron=1.7, fan=(4, 5), toe=2, besagew=True,
                   waist='tassets', breast='etched', lacquer=False, spikes=False, cape=False,
                   glow=False, fluting=False),
    'crimson': dict(helmet='bascinet', trim='trim', pauldron=1.8, fan=(4, 4), toe=2, besagew=True,
                    waist='skirt', breast='lacquer', lacquer=True, spikes=False, cape=False,
                    glow=False, fluting=False),
    'fluted': dict(helmet='kettle', trim='edge', pauldron=1.7, fan=(5, 6), toe=2, besagew=False,
                   waist='tassets', breast='fluted', lacquer=False, spikes=False, cape=False,
                   glow=False, fluting=True),
    'wraith': dict(helmet='spired', trim='trim', pauldron=1.9, fan=(4, 5), toe=2, besagew=False,
                   waist='tassets', breast='runes', lacquer=False, spikes=True, cape=True,
                   glow=True, fluting=False),
}

M = 'plate'


def plate(*ops, role=M, hide=(), **fo):
    return Paint(role, 'metal', ops, hide, **fo)


def edge_outline(role='edge', i=-1, sides='tlr'):
    """Paints the rim of a shaped (masked) plate."""
    def op(cv):
        ii = i if i >= 0 else len(cv.pal[role]) + i
        a = cv.px[..., 3] > 0
        for t in range(cv.h):
            for s in range(cv.w):
                if not a[t, s]:
                    continue
                up = t == 0 or not a[t - 1, s]
                lf = s == 0 or not a[t, s - 1]
                rt = s == cv.w - 1 or not a[t, s + 1]
                dn = t == cv.h - 1 or not a[t + 1, s]
                if ('t' in sides and up) or ('l' in sides and lf) or ('r' in sides and rt) or ('b' in sides and dn):
                    cv.put(s, t, role, ii)
    return op


def fan_shell(trim, front_left):
    """Scallop-shell wing for couters/poleyns: ribs radiate from the hinge at the front edge."""
    def op(cv):
        ct = (cv.h - 1) / 2
        for t in range(cv.h):
            for s in range(cv.w):
                hs = s if front_left else cv.w - 1 - s
                dx = (hs + 0.6) / cv.w
                dy = (t - ct) / (cv.h / 2 + 0.3)
                r = dx * dx + dy * dy
                if r > 1.08:
                    cv.clear(s, t)
                    continue
                ang = math.atan2(t - ct, hs + 0.6)
                rib = int(round((ang + 1.6) * 2.2)) % 2 == 0
                cv.put(s, t, M, 3 if rib else 2)
                if r > 0.7:
                    cv.put(s, t, trim, len(cv.pal[trim]) - 1 if rib else 1)
                if hs == 0 and abs(t - ct) < 1:
                    cv.put(s, t, trim, 1)
    return op


def build(style):
    o = OPTS[style]
    m = Model(style + '_gothic', 128, 64)
    _helmet(m, style, o)
    _chest(m, style, o)
    _legs(m, style, o)
    m.mirror_limbs()
    return m


# ---------------------------------------------------------------------------
# Helmets
def _helmet(m, style, o):
    h = m['head']
    h._piece = 'head'
    kind = o['helmet']
    tr = o['trim']
    face_void = [hline(r, 0, None, 'void', 1) for r in range(3, 8)]
    shell = plate(top=[ridge()], back=[ridge(), border('b', tr)],
                  west=[border('b', tr)], east=[border('b', tr)], front=[ridge()] + face_void)

    if kind == 'sallet':
        # German "Schaller": low ridged skull, sight slit, long flared tail and a bevor
        shell.face_ops['front'] += [hline(2, 0, None, 'void', 0)]
        h.box(-4, -8, -4, 8, 8, 8, 1.0, paint=shell)
        h.box(-3, -10, -3, 6, 1, 7, 0.0, paint=plate(ridge()))
        h.box(-0.5, -11, -2.5, 1, 1, 7, (0.1, 0, 0), paint=plate(top=[vline(0, 0, None, tr, 2)]))
        h.box(-4, -6.2, -5.4, 8, 3, 1, (1.05, 0.1, 0.0),
              paint=plate(front=[hline(0, 1, -1, 'void', 0), ridge(), border('b', tr)]))
        h.box(-4, -3, -6.2, 8, 4, 2, (1.1, 0.2, 0.2),
              paint=plate(front=[border('t', tr), converging_flutes()], lr=[border('t', tr)]))
        h.box(-0.5, -2.6, -6.9, 1, 3, 1, 0.0, paint=plate(front=[vline(0, 0, None, tr, 2)]))
        t1 = h.child('tail1', (0, -2.4, 4.3), (-0.32, 0, 0))
        t1.box(-5, 0, 0, 10, 1, 3, (0.45, 0.15, 0), paint=plate(top=[lames(2, 1)]))
        t2 = t1.child('tail2', (0, 0.1, 2.7), (-0.2, 0, 0))
        t2.box(-5, 0, 0, 10, 1, 3, (0.85, 0.15, 0), paint=plate(top=[border('t', tr)], back=[border('tblr', tr)]))

    elif kind == 'armet':
        # Armet with a pointed "sparrow beak" visor, rondel and gilded borders
        h.box(-4, -8, -4, 8, 8, 8, 1.0, paint=plate(
            top=[ridge(), border('lr', 'trim', 1)], back=[ridge(), border('b', 'trim', 1)],
            lr=[vline(4, 2, 7, 'trim', 1), dots([(2, 2), (5, 2)], 'trim', 2), border('b', 'trim', 1)],
            front=[hline(3, 0, None, 'void', 1), hline(4, 0, None, 'void', 1)]))
        h.box(-0.5, -10, -4, 1, 1, 8, (0.15, 0, 0), paint=plate(top=[vline(0, 0, None, 'trim', 2)]))
        h.box(-4, 0, -4, 8, 1, 8, (1.25, 0.15, 1.25), paint=plate(border('t', 'trim', 2)))
        visor = h.child('visor_r', (0, -3.6, -7.0), (0, 0.62, 0))
        visor.box(-5, -2.5, -0.5, 5, 5, 1, 0.0, paint=plate(
            front=[hline(0, 0, 5, 'trim', 2), hline(1, 0, 4, 'void', 0), border('b', 'trim', 1),
                   dots([(2, 3), (3, 3)], 'void', 0)]))
        m.finish_sym(h, visor, 'visor')
        h.box(-0.5, -6.2, -7.6, 1, 5, 1, 0.0, paint=plate(front=[vline(0, 0, None, 'trim', 2)]))
        h.box(-0.5, -2.2, 4.6, 1, 1, 1, 0.0, paint=plate())
        h.box(-1.5, -3.2, 5.4, 3, 3, 1, 0.0, paint=Paint('trim', 'metal', [mask(disc)], fb=[dots([(1, 1)], 'trim', 0)]))

    elif kind == 'bascinet':
        # Great bascinet with a stepped snout visor and a crimson aventail cover
        h.box(-4, -8, -4, 8, 8, 8, 1.0, paint=shell)
        h.box(-3, -10, -3, 6, 1, 7, 0.0, paint=plate(ridge()))
        h.box(-2, -11, -1, 4, 1, 4, 0.0, paint=plate(ridge()))
        h.box(-1, -12, 0, 2, 1, 2, 0.0, paint=Paint('trim', 'metal'))
        h.box(-4, -6, -5.6, 8, 5, 1, (1.0, 0.1, 0.0), paint=plate(
            front=[hline(1, 1, 3, 'void', 0), hline(1, 5, 7, 'void', 0), border('t', 'trim', 1),
                   rivets([(0, 3), (7, 3)])]))
        h.box(-3, -5, -6.6, 6, 3, 1, 0.0, paint=plate(front=[ridge(), dots([(0, 1), (0, 2), (5, 1), (5, 2)], 'void', 0)]))
        h.box(-1, -4.5, -7.6, 2, 2, 1, 0.0, paint=plate(front=[ridge()]))
        h.box(-4, -1, -4, 8, 2, 8, (1.35, 0.3, 1.35), paint=Paint('cloth', 'cloth', [border('t', 'trim', 2)]))

    elif kind == 'kettle':
        # Fluted chapel-de-fer (kettle hat) with a tall comb and a bevor
        h.box(-4, -8, -4, 8, 8, 8, 1.0, paint=shell.with_ops(front=[hline(r, 0, None, 'void', 0) for r in range(3, 8)]))
        h.box(-6, -6.6, -6, 12, 1, 12, 0.0, paint=plate(top=[flutes(2, 1)], sides=[border('t', 'edge')]))
        h.box(-7, -5.6, -7, 14, 1, 14, 0.0, paint=plate(top=[flutes(2, 1), border('tblr', 'edge')], sides=[border('t', 'edge', 1)]))
        h.box(-3, -10, -3, 6, 1, 6, 0.0, paint=plate(flutes(2, 1)))
        h.box(-2, -11, -2, 4, 1, 4, 0.0, paint=plate(flutes(2, 1)))
        h.box(-1, -13, -1, 2, 2, 2, 0.0, paint=plate(border('t', 'edge')))
        h.box(-4, -3.5, -6, 8, 5, 2, (1.15, 0.1, 0.25), paint=plate(
            front=[border('t', 'edge'), flutes(2, 1, top=1)], lr=[border('t', 'edge')]))

    elif kind == 'spired':
        # Spired armet with crescent horns and glowing eyes
        h.box(-4, -8, -4, 8, 8, 8, 1.0, paint=shell.with_ops(back=[glyphs(density=0.08, rows=range(2, 6))]))
        h.box(-4, 0, -4, 8, 1, 8, (1.25, 0.15, 1.25), paint=plate(border('t', 'trim', 1)))
        h.box(-1, -11, -1, 2, 2, 2, 0.0, paint=plate())
        h.box(-0.5, -14, -0.5, 1, 3, 1, 0.0, paint=plate(sides=[hline(0, 0, None, 'trim', 2)]))
        m.sym(h, -7, -8, -1, 2, 2, 2, 0.0, paint=plate())
        m.sym(h, -8, -10, -0.5, 1, 2, 1, 0.0, paint=plate())
        m.sym(h, -7.6, -12, -0.5, 1, 2, 1, 0.0, paint=plate(sides=[hline(0, 0, None, 'trim', 2)]))
        h.box(-4, -5, -5.6, 8, 5, 1, (1.0, 0.1, 0.0), paint=plate(
            front=[hline(1, 1, 3, 'glow', 1), hline(1, 5, 7, 'glow', 1), hline(0, 1, 3, 'void', 0),
                   hline(0, 5, 7, 'void', 0), ridge(), dots([(2, 3), (5, 3), (3, 4), (4, 4)], 'void', 0)]))
        h.box(-1, -0.5, -6.3, 2, 2, 1, 0.0, paint=plate())


# ---------------------------------------------------------------------------
# Chestplate (body + arms)
def _chest(m, style, o):
    b = m['body']
    b._piece = 'chest'
    tr = o['trim']
    front = [border('t', tr)]
    back = [border('t', tr), flutes(2, 1, top=1)]
    if o['breast'] == 'converging':
        front += [converging_flutes(), ridge()]
    elif o['breast'] == 'etched':
        front += [ridge(), vline(1, 1, None, 'trim', 1), vline(-2, 1, None, 'trim', 1)]
        back = [border('t', tr), ridge()]
    elif o['breast'] == 'fluted':
        front += [flutes(2, 1, top=1), ridge()]
    elif o['breast'] == 'runes':
        front += [converging_flutes(), ridge(), glyphs(density=0.07, rows=range(2, 5))]
    elif o['breast'] == 'lacquer':
        front += [ridge(), rivets([(1, 1), (6, 1)])]
        back = [border('t', tr), ridge()]
    b.box(-4, 0, -2, 8, 10, 4, 1.0, paint=plate(front=front, back=back, lr=[border('t', tr)], top=[border('tb', tr)]))
    # gorget
    b.box(-4, -1, -2, 8, 2, 4, (1.35, 0.35, 1.35), paint=plate(border('t', tr, 1)))
    # plackart with an accolade (ogee) top
    pk_role = 'accent' if o['lacquer'] else M
    b.box(-3, 4, -3.4, 6, 6, 1, 0.0, paint=Paint(pk_role, 'metal', [], ('top', 'back'),
          front=[mask(pointed_top(3)), edge_outline(tr, sides='tlr'), ridge(role=pk_role) if not o['lacquer'] else rivets([(2, 4), (3, 4)])],
          lr=[mask(lambda s, t, w, h: t >= 3)]))
    # faulds
    fauld = [border('b', tr, 1)]
    if o['fluting']:
        fauld.append(flutes(2, 0, bottom=1))
    b.box(-4, 9, -2, 8, 2, 4, (1.25, 0.25, 1.25), paint=plate(*fauld))
    last = list(fauld)
    if o['fluting']:
        last.append(mask(dagged(2)))
    b.box(-4, 11, -2, 8, 2, 4, (1.5, 0.25, 1.5), paint=plate(*last, hide=('top',)))
    if o['cape']:
        cape = b.child('cape', (0, -0.6, 3.5), (0.13, 0, 0))
        cape.box(-5, 0, 0, 10, 17, 1, 0.0, paint=Paint('cloth', 'cloth', [], ('top',),
                 back=[mask(_tattered(5)), glyphs('glow', density=0.025, rows=range(1, 4))],
                 front=[mask(_tattered(5, flip=True))], lr=[mask(lambda s, t, w, h: t < h - 5)]))

    a = m['right_arm']
    a._piece = 'chest'
    fan_h, fan_d = o['fan']
    a.box(-3, -2, -2, 4, 12, 4, 1.0, paint=plate(
        lames(20, 3), lames(1, 0, start=10), front=[dots([(1, 10), (2, 10)], M, 4)],
        bottom=[border('tblr', 'leather', 1)]))
    pg = o['pauldron']
    pd_role = 'accent' if o['lacquer'] else M
    a.box(-3, -3, -2, 4, 4, 4, (pg, 0.6, pg), paint=Paint(pd_role, 'metal', [lames(4, 2), border('b', tr, 1)], top=[ridge(role=pd_role)]))
    a.box(-3, 0, -2, 4, 2, 4, (pg - 0.25, 0.3, pg - 0.25), paint=Paint(pd_role, 'metal', [lames(4, 1)]))
    a.box(-3, 4, -2, 4, 2, 4, (1.25, 0.4, 1.25), paint=plate(back=[rivets([(1, 0), (2, 0)])]))
    a.box(-4.9, 2.8 + (4 - fan_h) / 2, -2.5, 1, fan_h, fan_d, 0.0, paint=Paint(
        M, 'metal', [], ('top', 'bottom', 'front', 'back'),
        west=[fan_shell(tr, front_left=False)], east=[fan_shell(tr, front_left=True)]))
    cuff = [border('t', tr), flutes(2, 0, top=1)] if o['fluting'] else [border('t', tr)]
    a.box(-3, 7, -2, 4, 2, 4, (1.35, 0.25, 1.35), paint=plate(*cuff))
    if o['besagew']:
        role = 'trim' if style == 'gilded' else 'accent'
        a.box(-0.5, -1.2, -4.5, 3, 3, 1, 0.0, paint=Paint(role, 'metal', [], ('top', 'bottom', 'west', 'east'),
              fb=[mask(disc), dots([(1, 1)], 'trim', 2)]))
    if o['spikes']:
        a.box(-2.5, -5.6, -0.5, 1, 2, 1, 0.0, paint=plate(sides=[hline(0, 0, None, 'trim', 2)]))
        a.box(-6.6, -2.2, -0.5, 2, 1, 1, 0.0, paint=plate(west=[vline(0, 0, None, 'trim', 2)]))
        a.box(-6.4, 4.5, -0.5, 1, 1, 1, 0.0, paint=plate())


def _tattered(depth, flip=False):
    def keep(s, t, w, h):
        ss = (w - 1 - s) if flip else s
        cut = (ss * 5 + 2) % (depth + 1)
        if ss % 3 == 1:
            cut = max(0, cut - 2)
        return t < h - cut
    return keep


# ---------------------------------------------------------------------------
# Leggings (legs + waist on body) and boots
def _legs(m, style, o):
    b = m['body']
    l = m['right_leg']
    l._piece = 'legs'
    tr = o['trim']
    # waist belt (hidden under the faulds when the chestplate is worn)
    b.box(-4, 9, -2, 8, 2, 4, (1.1, 0.1, 1.1), piece='legs', paint=Paint('leather', 'flat', [],
          front=[bitmap(['TT', 'TT'], {'T': ('trim', 2)}, center=True)]))
    if o['waist'] == 'tassets':
        t_ops = [mask(pointed_bottom(2)), edge_outline(tr if style != 'gilded' else M, 1 if style != 'gilded' else 3, sides='lrb'), lames(2, 1, stop=2)]
        if o['fluting']:
            t_ops.insert(1, flutes(2, 1))
        m.sym(b, -4.6, 12, -3.8, 4, 4, 1, 0.0, piece='legs', paint=Paint(M, 'metal', [], ('bottom', 'back'),
              front=t_ops, lr=[mask(lambda s, t, w, h: t < h - 2)]))
    else:
        b.box(-4, 11, -2, 8, 5, 4, (1.3, 0.0, 1.3), piece='legs', paint=Paint('cloth', 'cloth',
              [mask(dagged(2)), border('t', 'trim', 2)], ('top',)))

    cuisse_front = [flutes(2, 0), border('t', tr)] if o['fluting'] else [ridge(), border('t', tr)]
    l.box(-2, 0, -2, 4, 7, 4, 0.6, paint=plate(front=cuisse_front, back=[lames(3, 1)], lr=[border('t', tr)]))
    l.box(-2, 6, -3.5, 4, 3, 1, (0.6, 0.2, 0.0), paint=plate(
        front=[mask(round_corners), edge_outline(tr, 1, sides='tlrb'), rivets([(1, 1), (2, 1)])], hide=('back',)))
    fan = 5 if o['fluting'] else 4
    l.box(-3.6, 5.5 - (fan - 4) / 2, -2.5, 1, fan, fan, 0.0, paint=Paint(M, 'metal', [], ('top', 'bottom', 'front', 'back'),
          west=[fan_shell(tr, front_left=False)], east=[fan_shell(tr, front_left=True)]))
    if o['spikes']:
        l.box(-0.5, 6.8, -4.6, 1, 1, 1, 0.0, paint=plate())

    # boots: greave + pointed sabaton
    l.box(-2, 7, -2, 4, 5, 4, (0.95, 0.3, 0.95), piece='feet', paint=plate(
        front=[ridge(), border('t', tr)], lr=[border('t', tr)], back=[border('t', tr)]))
    l.box(-2, 10, -4, 4, 2, 2, (0.8, 0.3, 0.2), piece='feet', paint=plate(top=[lames(1, 0)], hide=('back',)))
    l.box(-1.5, 10.3, -6, 3, 2, 2, (0.2, 0.0, 0.2), piece='feet', paint=plate(top=[lames(1, 0)], hide=('back',)))
    toe = o['toe']
    l.box(-0.5, 11.3, -6 - toe, 1, 1, toe, (0.2, 0.0, 0.0), piece='feet', paint=plate(top=[vline(0, 0, None, tr, 2)]))
