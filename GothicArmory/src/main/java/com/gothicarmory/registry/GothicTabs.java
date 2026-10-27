package com.gothicarmory.registry;

import com.gothicarmory.GothicArmory;
import com.gothicarmory.item.GothicDecoration;
import com.gothicarmory.item.GothicStyle;
import com.magistuarmory.api.item.ModItemsProvider;
import com.magistuarmory.misc.ModCreativeTabs;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.ArmorItem;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.event.BuildCreativeModeTabContentsEvent;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.RegistryObject;

public final class GothicTabs {
    private static final DeferredRegister<CreativeModeTab> TABS =
            DeferredRegister.create(Registries.CREATIVE_MODE_TAB, GothicArmory.MOD_ID);

    public static final RegistryObject<CreativeModeTab> GOTHIC_ARMORY = TABS.register("gothic_armory",
            () -> CreativeModeTab.builder()
                    .title(Component.translatable("itemGroup." + GothicArmory.MOD_ID))
                    .icon(() -> new ItemStack(GothicItems.INSTANCE.armor(GothicStyle.BLACKENED, ArmorItem.Type.HELMET).get()))
                    .displayItems((params, output) -> {
                        for (GothicStyle style : GothicStyle.values()) {
                            for (ArmorItem.Type type : ArmorItem.Type.values()) {
                                output.accept(GothicItems.INSTANCE.armor(style, type).get());
                            }
                        }
                        for (GothicDecoration decoration : GothicDecoration.values()) {
                            output.accept(GothicItems.INSTANCE.decoration(decoration).get());
                        }
                        showcase(output);
                    })
                    .build());

    private GothicTabs() {
    }

    public static void register(IEventBus modBus) {
        TABS.register(modBus);
        modBus.addListener(GothicTabs::addToEpicKnightsTabs);
    }

    /** A few pre-decorated pieces to show what decorations look like. */
    private static void showcase(CreativeModeTab.Output output) {
        GothicItems items = GothicItems.INSTANCE;
        output.accept(ModItemsProvider.getDecoratedStack(items.armor(GothicStyle.BLACKENED, ArmorItem.Type.HELMET),
                items.decoration(GothicDecoration.RAVEN_WINGS)));
        output.accept(ModItemsProvider.getDecoratedStack(items.armor(GothicStyle.GILDED, ArmorItem.Type.HELMET),
                items.decoration(GothicDecoration.GOTHIC_PLUME)));
        output.accept(ModItemsProvider.getDecoratedStack(items.armor(GothicStyle.FLUTED, ArmorItem.Type.HELMET),
                items.decoration(GothicDecoration.FLEUR_DE_LIS)));
        output.accept(ModItemsProvider.getDecoratedStack(items.armor(GothicStyle.CRIMSON, ArmorItem.Type.CHESTPLATE),
                items.decoration(GothicDecoration.GOTHIC_CAPE)));
        output.accept(ModItemsProvider.getDecoratedStack(items.armor(GothicStyle.WRAITH, ArmorItem.Type.CHESTPLATE),
                items.decoration(GothicDecoration.SPIKED_PAULDRONS)));
    }

    /** Also lists the items in Epic Knights' own armour and decoration tabs. */
    private static void addToEpicKnightsTabs(BuildCreativeModeTabContentsEvent event) {
        if (event.getTabKey().equals(ModCreativeTabs.ARMOR_RESOURCE_KEY)) {
            for (GothicStyle style : GothicStyle.values()) {
                for (ArmorItem.Type type : ArmorItem.Type.values()) {
                    event.accept(GothicItems.INSTANCE.armor(style, type));
                }
            }
        } else if (event.getTabKey().equals(ModCreativeTabs.ARMOR_DECORATIONS_RESOURCE_KEY)) {
            for (GothicDecoration decoration : GothicDecoration.values()) {
                event.accept(GothicItems.INSTANCE.decoration(decoration));
            }
        }
    }
}
