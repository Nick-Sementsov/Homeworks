package com.gothicarmory.client;

import com.gothicarmory.GothicArmory;
import com.gothicarmory.client.model.GothicLayers;
import com.gothicarmory.item.GothicArmorItem;
import com.gothicarmory.item.GothicStyle;
import com.gothicarmory.registry.GothicItems;
import com.magistuarmory.api.client.render.model.ModModelsProvider;
import net.minecraft.client.Minecraft;

public final class GothicArmoryClient {
    private GothicArmoryClient() {
    }

    public static void init() {
        new GothicModels().init(GothicItems.INSTANCE);
    }

    public static int wornByLocalPlayer(GothicStyle style) {
        Minecraft minecraft = Minecraft.getInstance();
        return minecraft.player == null ? 0 : GothicArmorItem.countWorn(minecraft.player, style);
    }

    /**
     * Registers the generated model layers with Epic Knights, which bakes them
     * into the armour items and its decoration render layer.
     */
    private static final class GothicModels extends ModModelsProvider {
        GothicModels() {
            super(GothicArmory.MOD_ID);
            GothicLayers.ARMOR.forEach(this::addArmorModel);
            GothicLayers.DECORATIONS.forEach(this::addDecorationModel);
        }
    }
}
