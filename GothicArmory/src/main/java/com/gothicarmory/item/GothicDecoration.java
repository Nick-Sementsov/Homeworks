package com.gothicarmory.item;

import net.minecraft.world.item.ArmorItem;

/**
 * Decorations attachable to armour through Epic Knights' decoration recipe
 * (armour piece + decoration in a crafting grid). Names match the generated
 * models and textures (tools/gothic/decorations.py).
 */
public enum GothicDecoration {
    GOTHIC_SPIRE("gothic_spire", ArmorItem.Type.HELMET),
    GARGOYLE("gargoyle", ArmorItem.Type.HELMET),
    RAVEN_WINGS("raven_wings", ArmorItem.Type.HELMET, 0x26222E),
    GOTHIC_PLUME("gothic_plume", ArmorItem.Type.HELMET, 0x9A1B22),
    THORN_CROWN("thorn_crown", ArmorItem.Type.HELMET),
    FLEUR_DE_LIS("fleur_de_lis", ArmorItem.Type.HELMET),
    GOTHIC_CAPE("gothic_cape", ArmorItem.Type.CHESTPLATE, 0x6B0F16),
    GOTHIC_TABARD("gothic_tabard", ArmorItem.Type.CHESTPLATE, 0x22305E),
    SPIKED_PAULDRONS("spiked_pauldrons", ArmorItem.Type.CHESTPLATE),
    GIRDLE_BOOK("girdle_book", ArmorItem.Type.CHESTPLATE),
    PRAYER_BEADS("prayer_beads", ArmorItem.Type.CHESTPLATE);

    private static final int NOT_DYEABLE = -1;

    private final String id;
    private final ArmorItem.Type slot;
    private final int defaultColor;

    GothicDecoration(String id, ArmorItem.Type slot) {
        this(id, slot, NOT_DYEABLE);
    }

    GothicDecoration(String id, ArmorItem.Type slot, int defaultColor) {
        this.id = id;
        this.slot = slot;
        this.defaultColor = defaultColor;
    }

    public String id() {
        return id;
    }

    public String itemId() {
        return id + "_decoration";
    }

    public ArmorItem.Type slot() {
        return slot;
    }

    public boolean isDyeable() {
        return defaultColor != NOT_DYEABLE;
    }

    public int defaultColor() {
        return defaultColor;
    }
}
