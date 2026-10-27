package com.gothicarmory;

import com.gothicarmory.client.GothicArmoryClient;
import com.gothicarmory.registry.GothicItems;
import com.gothicarmory.registry.GothicTabs;
import dev.architectury.platform.forge.EventBuses;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.fml.ModLoadingContext;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.config.ModConfig;
import net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext;
import net.minecraftforge.fml.loading.FMLEnvironment;

/**
 * Gothic Armory: an Epic Knights addon with gothic armour styles and decorations.
 */
@Mod(GothicArmory.MOD_ID)
public final class GothicArmory {
    public static final String MOD_ID = "gothicarmory";

    public GothicArmory() {
        IEventBus modBus = FMLJavaModLoadingContext.get().getModEventBus();
        // Epic Knights registers items through Architectury, which needs our mod bus
        EventBuses.registerModEventBus(MOD_ID, modBus);

        GothicItems.INSTANCE.init();
        GothicTabs.register(modBus);
        ModLoadingContext.get().registerConfig(ModConfig.Type.COMMON, GothicConfig.SPEC);

        if (FMLEnvironment.dist == Dist.CLIENT) {
            GothicArmoryClient.init();
        }
    }
}
