"""Preview renders of armour/decoration models on a plain mannequin."""
import numpy as np
from PIL import Image

from .model import Model, Renderer, world_polygons
from .paint import Paint, Palette, paint_model, bitmap

MANNEQUIN_PAL = Palette(
    skin=['#7a5236', '#a8774f', '#c8956a', '#dcae84', '#efc8a0'],
    shirt=['#2b3a4a', '#3c5066', '#4f6884', '#6a84a2', '#86a0bc'],
    pants=['#2a2622', '#3a342e', '#4c443c', '#5e554b', '#71675b'],
    hair=['#2a1a10', '#3c2616', '#4e331e', '#60402a', '#724e36'],
    void=['#101010', '#202020'],
)

SLOT_PARTS = {
    'head': {'head', 'hat'},
    'chest': {'body', 'right_arm', 'left_arm'},
    'legs': {'body', 'right_leg', 'left_leg'},
    'feet': {'right_leg', 'left_leg'},
}

WALK = {
    'right_arm': (-0.45, 0, 0.08), 'left_arm': (0.4, 0, -0.08),
    'right_leg': (0.4, 0, 0), 'left_leg': (-0.4, 0, 0),
}


def mannequin():
    m = Model('mannequin', 64, 64)
    face = bitmap(['........', '........', '........', '.WV..VW.', '........', '...MM...', '........',
                   '........'], {'W': ('skin', 4), 'V': ('void', 0), 'M': ('skin', 0)})
    m['head'].box(-4, -8, -4, 8, 8, 8, 0, paint=Paint('skin', 'flat', [], front=[face],
                                                       top=[bitmap(['H' * 8] * 8, {'H': ('hair', 2)})]))
    m['body'].box(-4, 0, -2, 8, 12, 4, 0, paint=Paint('shirt', 'flat'))
    m['right_arm'].box(-3, -2, -2, 4, 12, 4, 0, paint=Paint('shirt', 'flat'))
    m['right_leg'].box(-2, 0, -2, 4, 12, 4, 0, paint=Paint('pants', 'flat'))
    m.mirror_limbs()
    m.pack()
    tex = paint_model(m, MANNEQUIN_PAL, lambda c: 0, 64, 64)[0]
    return m, tex


def _tex_lookup(img, tw, th):
    return lambda cube: (img, tw, th)


def render_armor(model, layers, yaw=0.55, pitch=-0.2, size=(300, 400), scale=9.5, pose=None,
                 extra=None, mann=True, center=(0, 8, 0)):
    r = Renderer(size, scale, yaw, pitch, center=center)
    if mann:
        mm, mt = mannequin()
        r.draw(world_polygons(mm, pose=pose), _tex_lookup(mt, 64, 64))
    for slot, parts in SLOT_PARTS.items():
        img = layers[1] if slot == 'legs' else layers[0]
        r.draw(world_polygons(model, visible_parts=parts, pose=pose), _tex_lookup(img, model.tex_w, model.tex_h))
    for em, eimgs in (extra or []):
        for img in eimgs:
            r.draw(world_polygons(em, visible_parts={'head', 'body', 'right_arm', 'left_arm'}, pose=pose),
                   _tex_lookup(img, em.tex_w, em.tex_h))
    return r.image()


def sheet(images, cols, path, bg=(43, 46, 54)):
    h, w = images[0].shape[:2]
    rows = (len(images) + cols - 1) // cols
    out = np.zeros((rows * h, cols * w, 3), dtype=np.uint8)
    out[:] = bg
    for i, im in enumerate(images):
        y, x = divmod(i, cols)
        out[y * h:(y + 1) * h, x * w:(x + 1) * w] = im
    Image.fromarray(out).save(path)
