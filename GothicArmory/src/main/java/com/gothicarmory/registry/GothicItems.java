package com.gothicarmory.registry;

import java.util.EnumMap;
import java.util.Map;

import com.gothicarmory.GothicArmory;
import com.gothicarmory.item.GothicArmorItem;
import com.gothicarmory.item.GothicDecoration;
import com.gothicarmory.item.GothicStyle;
import com.magistuarmory.api.item.ModItemsProvider;
import com.magistuarmory.item.ArmorDecorationItem;
import com.magistuarmory.item.DyeableArmorDecorationItem;
import com.magistuarmory.item.armor.MedievalArmorItem;
import dev.architectury.registry.registries.RegistrySupplier;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.ArmorItem;
import net.minecraft.world.item.Item;

/**
 * Registers the items through Epic Knights' addon API, so its renderer loads our
 * armour models, decoration models and dye colours exactly like its own.
 */
public final class GothicItems extends ModItemsProvider {
    public static final GothicItems INSTANCE = new GothicItems();

    private final Map<GothicStyle, Map<ArmorItem.Type, RegistrySupplier<MedievalArmorItem>>> armor =
            new EnumMap<>(GothicStyle.class);
    private final Map<GothicDecoration, RegistrySupplier<? extends ArmorDecorationItem>> decorations =
            new EnumMap<>(GothicDecoration.class);

    private GothicItems() {
        super(GothicArmory.MOD_ID);
        for (GothicStyle style : GothicStyle.values()) {
            Map<ArmorItem.Type, RegistrySupplier<MedievalArmorItem>> pieces = new EnumMap<>(ArmorItem.Type.class);
            for (ArmorItem.Type type : ArmorItem.Type.values()) {
                RegistrySupplier<MedievalArmorItem> item = items.register(style.itemId(type),
                        () -> new GothicArmorItem(style, type, new Item.Properties()));
                armorItems.add(item);
                pieces.put(type, item);
            }
            armor.put(style, pieces);
        }
        for (GothicDecoration decoration : GothicDecoration.values()) {
            ResourceLocation location = new ResourceLocation(GothicArmory.MOD_ID, decoration.id());
            if (decoration.isDyeable()) {
                decorations.put(decoration, addDyeableArmorDecorationItem(decoration.itemId(),
                        () -> new DyeableArmorDecorationItem(location, new Item.Properties().stacksTo(16),
                                decoration.slot(), decoration.defaultColor())));
            } else {
                decorations.put(decoration, addArmorDecorationItem(decoration.itemId(),
                        () -> new ArmorDecorationItem(location, new Item.Properties().stacksTo(16), decoration.slot())));
            }
        }
    }

    public RegistrySupplier<MedievalArmorItem> armor(GothicStyle style, ArmorItem.Type type) {
        return armor.get(style).get(type);
    }

    public RegistrySupplier<? extends ArmorDecorationItem> decoration(GothicDecoration decoration) {
        return decorations.get(decoration);
    }
}
