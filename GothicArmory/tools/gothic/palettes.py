from .paint import Palette

VOID = ['#060608', '#101014']

STYLES = {
    # Blackened steel with polished bright edges and brass rivets
    'blackened': Palette(
        plate=['#121318', '#20222a', '#2e3139', '#41454f', '#5a5f6b'],
        edge=['#5a606b', '#8c939f', '#c9cfd8'],
        trim=['#5e4216', '#9c7230', '#d4a64c'],
        accent=['#2a0a0c', '#4a1216', '#6e1c20'],
        cloth=['#121216', '#1e1e24', '#2c2c34'],
        leather=['#24160d', '#40281a', '#5e3d26'],
        void=VOID,
        glow=['#5c1a1a', '#c23b2c'],
    ),
    # Mirror-polished steel with gilded etched borders
    'gilded': Palette(
        plate=['#464b55', '#767d8a', '#a4acb9', '#c9d0da', '#eef1f5'],
        edge=['#8a5a14', '#d1a03a', '#f6d77a'],
        trim=['#8a5a14', '#d1a03a', '#f6d77a'],
        accent=['#7a4c10', '#c08a2c', '#ecc35e'],
        cloth=['#121c44', '#1f2f72', '#3149a0'],
        leather=['#3b2414', '#5e3b20', '#84562f'],
        void=VOID,
        glow=['#8a5a14', '#f6d77a'],
    ),
    # Dark steel with crimson lacquered plates, gold rivets and velvet
    'crimson': Palette(
        plate=['#202126', '#3a3c44', '#565962', '#767a85', '#9ca1ac'],
        edge=['#6e4a12', '#b0822c', '#e0b456'],
        trim=['#6e4a12', '#b0822c', '#e0b456'],
        accent=['#33060a', '#5c0d14', '#8a1820', '#b8282e', '#d9474a'],
        cloth=['#3d070b', '#6b0f16', '#9a1b22'],
        leather=['#2a140c', '#4a2414', '#6e3a20'],
        void=VOID,
        glow=['#6b0f16', '#e04a3a'],
    ),
    # Bright "white harness" covered with fluting and cusped edges
    'fluted': Palette(
        plate=['#565c66', '#8a929e', '#b6bdc8', '#dbe0e7', '#f8fafc'],
        edge=['#7c848f', '#c4cbd4', '#ffffff'],
        trim=['#7a5a20', '#b88a38', '#e2bb62'],
        accent=['#283446', '#3f526e', '#5e7a9e', '#86a2c4', '#b0c8e2'],
        cloth=['#3a3020', '#5a4a30', '#7a6648'],
        leather=['#3a2414', '#5c3a20', '#80552f'],
        void=VOID,
        glow=['#3f526e', '#b0c8e2'],
    ),
    # Ashen spectral steel with glowing teal runes
    'wraith': Palette(
        plate=['#101215', '#1d2025', '#2c3037', '#3f444e', '#575d69'],
        edge=['#174541', '#2a8a80', '#62e6d2'],
        trim=['#34393e', '#646b73', '#a3abb3'],
        accent=['#0d2d2a', '#1a5b54', '#2aa596'],
        cloth=['#0a0b0d', '#14161a', '#1f2228'],
        leather=['#1a1612', '#2c2620', '#40382e'],
        void=['#020304', '#0c1a19'],
        glow=['#2aa596', '#9ffbea'],
        bone=['#7d776a', '#b3ad9a', '#e2dcc8'],
    ),
}

# Grayscale ramp for dyeable decoration bases (the item colour multiplies it)
DYE = ['#808080', '#a6a6a6', '#c8c8c8', '#e4e4e4', '#ffffff']

DECORATION = Palette(
    plate=['#2a2c32', '#4a4e57', '#70757f', '#9aa0aa', '#c8cdd4'],
    dark=['#141519', '#22242a', '#33363e', '#464a54', '#5e636e'],
    edge=['#5a606b', '#8c939f', '#c9cfd8'],
    trim=['#8a5a14', '#d1a03a', '#f6d77a'],
    gold=['#6e4610', '#a8761f', '#d9a63a', '#f2cd6a', '#fff0b0'],
    stone=['#323234', '#4a4a4f', '#64646b', '#808088', '#a2a2aa'],
    iron=['#1b1716', '#2f2926', '#4a423d', '#665c55', '#877b72'],
    dye=DYE,
    leather=['#2e1b0e', '#4c2e18', '#6e4524', '#8f5f34'],
    parchment=['#8a7a58', '#b8a67c', '#e0d2a8'],
    wood=['#2c160c', '#4a2614', '#6c3a1e', '#8e5430'],
    silver=['#6c727c', '#a8afba', '#e8ecf2'],
    ruby=['#4a0608', '#8e1014', '#d43a30'],
    glow=['#7a1010', '#ff5a32'],
    void=VOID,
)
