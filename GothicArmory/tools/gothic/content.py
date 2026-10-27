"""Item ids, names (en/ru), recipes and tooltips."""

STYLES = ['blackened', 'gilded', 'crimson', 'fluted', 'wraith']

HELMET_ID = {
    'blackened': 'sallet',
    'gilded': 'armet',
    'crimson': 'great_bascinet',
    'fluted': 'kettle_hat',
    'wraith': 'spired_armet',
}

# Epic Knights pieces each style is forged from
EK_BASE = {
    'helmet': {
        'blackened': 'magistuarmory:sallet',
        'gilded': 'magistuarmory:armet',
        'crimson': 'magistuarmory:bascinet',
        'fluted': 'magistuarmory:kettlehat',
        'wraith': 'magistuarmory:armet',
    },
    'chestplate': 'magistuarmory:gothic_chestplate',
    'leggings': 'magistuarmory:gothic_leggings',
    'boots': 'magistuarmory:gothic_boots',
}

# (pattern, key) around the Epic Knights base piece "X"
STYLE_RECIPE = {
    'blackened': ([" p ", "cXc", " p "], {'p': {'tag': 'forge:plates/steel'}, 'c': {'tag': 'minecraft:coals'}}),
    'gilded': ([" G ", "gXg", " G "], {'G': {'tag': 'forge:ingots/gold'}, 'g': {'tag': 'forge:nuggets/gold'}}),
    'crimson': ([" w ", "dXd", " g "], {'w': {'item': 'minecraft:red_wool'}, 'd': {'tag': 'forge:dyes/red'},
                                        'g': {'tag': 'forge:nuggets/gold'}}),
    'fluted': ([" p ", "pXp", " n "], {'p': {'tag': 'forge:plates/steel'}, 'n': {'tag': 'forge:nuggets/steel'}}),
    'wraith': ([" m ", "sXs", " m "], {'m': {'item': 'minecraft:phantom_membrane'},
                                       's': {'tag': 'minecraft:soul_fire_base_blocks'}}),
}

STYLE_NAME = {
    'en': {'blackened': 'Blackened', 'gilded': 'Gilded', 'crimson': 'Crimson', 'fluted': 'Fluted', 'wraith': 'Wraith'},
}

EN_HELMET = {'sallet': 'Sallet', 'armet': 'Armet', 'great_bascinet': 'Great Bascinet',
             'kettle_hat': 'Kettle Hat', 'spired_armet': 'Spired Armet'}

RU_NAMES = {
    'blackened': {'helmet': 'Чернёный готический салад', 'chestplate': 'Чернёная готическая кираса',
                  'leggings': 'Чернёные готические поножи', 'boots': 'Чернёные готические сабатоны'},
    'gilded': {'helmet': 'Позолоченный готический армет', 'chestplate': 'Позолоченная готическая кираса',
               'leggings': 'Позолоченные готические поножи', 'boots': 'Позолоченные готические сабатоны'},
    'crimson': {'helmet': 'Багровый готический бацинет', 'chestplate': 'Багровая готическая кираса',
                'leggings': 'Багровые готические поножи', 'boots': 'Багровые готические сабатоны'},
    'fluted': {'helmet': 'Рифлёная готическая шапель', 'chestplate': 'Рифлёная готическая кираса',
               'leggings': 'Рифлёные готические поножи', 'boots': 'Рифлёные готические сабатоны'},
    'wraith': {'helmet': 'Призрачный армет со шпилем', 'chestplate': 'Призрачная готическая кираса',
               'leggings': 'Призрачные готические поножи', 'boots': 'Призрачные готические сабатоны'},
}

BONUS = {
    'blackened': ('Dread: melee hits weaken the target',
                  'Ужас: удары в ближнем бою ослабляют цель'),
    'gilded': ('Golden Glory: Luck; piglins stay calm',
               'Золотая слава: удача; пиглины не нападают'),
    'crimson': ('Blood Oath: melee hits heal you for 20% of the damage',
                'Кровавый обет: удары лечат на 20% от урона'),
    'fluted': ('Deflection: 35% less damage from projectiles',
               'Отражение: на 35% меньше урона от снарядов'),
    'wraith': ('Spectral Ward: night vision, immune to Wither',
               'Призрачный страж: ночное зрение, иммунитет к иссушению'),
}

STYLE_DESC = {
    'blackened': ('Blackened steel with polished edges', 'Чернёная сталь с полированной кромкой'),
    'gilded': ('Polished steel with gilded etching', 'Полированная сталь с золотой гравировкой'),
    'crimson': ('Crimson-lacquered plates and velvet', 'Багровый лак и бархат'),
    'fluted': ('White harness covered in fluting', 'Белый доспех, покрытый рифлением'),
    'wraith': ('Ashen steel etched with spectral runes', 'Пепельная сталь с призрачными рунами'),
}

DECORATIONS = {
    # name: (en, ru, recipe)
    'gothic_spire': ('Gothic Spire', 'Готический шпиль',
                     dict(type='shaped', pattern=[" g ", " i ", " p "],
                          key={'g': {'tag': 'forge:nuggets/gold'}, 'i': {'tag': 'forge:ingots/iron'},
                               'p': {'tag': 'forge:plates/steel'}})),
    'gargoyle': ('Gargoyle', 'Горгулья',
                 dict(type='shaped', pattern=["s s", " c "],
                      key={'s': {'item': 'minecraft:stone'}, 'c': {'item': 'minecraft:chiseled_stone_bricks'}})),
    'raven_wings': ('Raven Wings', 'Вороньи крылья',
                    dict(type='shaped', pattern=["f f", "fdf", " n "],
                         key={'f': {'tag': 'forge:feathers'}, 'd': {'tag': 'forge:dyes/black'},
                              'n': {'tag': 'forge:nuggets/iron'}})),
    'gothic_plume': ('Gothic Plume', 'Готический плюмаж',
                     dict(type='shaped', pattern=["f", "w", "n"],
                          key={'f': {'tag': 'forge:feathers'}, 'w': {'item': 'minecraft:red_wool'},
                               'n': {'tag': 'forge:nuggets/gold'}})),
    'thorn_crown': ('Crown of Thorns', 'Терновый венец',
                    dict(type='shaped', pattern=["ndn", "n n"],
                         key={'n': {'tag': 'forge:nuggets/iron'}, 'd': {'item': 'minecraft:dead_bush'}})),
    'fleur_de_lis': ('Fleur-de-lis Crest', 'Гребень «Флёр-де-лис»',
                     dict(type='shaped', pattern=[" g ", "gGg", " g "],
                          key={'g': {'tag': 'forge:nuggets/gold'}, 'G': {'tag': 'forge:ingots/gold'}})),
    'gothic_cape': ('Gothic Cape', 'Готический плащ',
                    dict(type='shaped', pattern=["g g", "www", "www"],
                         key={'g': {'tag': 'forge:nuggets/gold'}, 'w': {'item': 'minecraft:red_wool'}})),
    'gothic_tabard': ('Gothic Tabard', 'Готический табард',
                      dict(type='shaped', pattern=["w w", "wgw", "www"],
                           key={'w': {'item': 'minecraft:blue_wool'}, 'g': {'tag': 'forge:ingots/gold'}})),
    'spiked_pauldrons': ('Spiked Pauldrons', 'Шипастые наплечники',
                         dict(type='shaped', pattern=["n n", "p p"],
                              key={'n': {'tag': 'forge:nuggets/steel'}, 'p': {'tag': 'forge:plates/steel'}})),
    'girdle_book': ('Girdle Book', 'Поясная книга',
                    dict(type='shapeless', ingredients=[{'item': 'minecraft:book'}, {'item': 'minecraft:chain'},
                                                        {'tag': 'forge:nuggets/gold'}])),
    'prayer_beads': ('Prayer Beads', 'Чётки',
                     dict(type='shapeless', ingredients=[{'item': 'minecraft:string'},
                                                         {'tag': 'minecraft:wooden_buttons'},
                                                         {'tag': 'minecraft:wooden_buttons'},
                                                         {'tag': 'forge:nuggets/iron'}])),
}

PIECES = ['helmet', 'chestplate', 'leggings', 'boots']


def item_id(style, piece):
    if piece == 'helmet':
        return f'{style}_gothic_{HELMET_ID[style]}'
    return f'{style}_gothic_{piece}'


def en_name(style, piece):
    s = STYLE_NAME['en'][style]
    if piece == 'helmet':
        return f'{s} Gothic {EN_HELMET[HELMET_ID[style]]}'
    return f'{s} Gothic ' + {'chestplate': 'Cuirass', 'leggings': 'Leggings', 'boots': 'Sabatons'}[piece]
