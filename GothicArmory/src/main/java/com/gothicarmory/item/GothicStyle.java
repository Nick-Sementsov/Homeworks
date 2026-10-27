package com.gothicarmory.item;

import java.util.function.Supplier;

import com.gothicarmory.GothicArmory;
import com.magistuarmory.item.armor.ArmorType;
import net.minecraft.ChatFormatting;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.tags.TagKey;
import net.minecraft.world.item.ArmorItem;
import net.minecraft.world.item.crafting.Ingredient;

/**
 * The gothic armour styles. Durability and defense arrays follow Epic Knights'
 * order: boots, leggings, chestplate, helmet.
 */
public enum GothicStyle {
    BLACKENED("blackened", "sallet", ChatFormatting.DARK_GRAY, 2.0F, 0.05F,
            new Integer[]{300, 400, 440, 330}, new Integer[]{3, 6, 8, 3}, 10, SoundEvents.ARMOR_EQUIP_IRON, "ingots/steel"),
    GILDED("gilded", "armet", ChatFormatting.GOLD, 1.5F, 0.0F,
            new Integer[]{280, 380, 420, 320}, new Integer[]{3, 5, 8, 3}, 22, SoundEvents.ARMOR_EQUIP_GOLD, "ingots/gold"),
    CRIMSON("crimson", "great_bascinet", ChatFormatting.DARK_RED, 2.0F, 0.05F,
            new Integer[]{300, 400, 440, 330}, new Integer[]{3, 6, 8, 3}, 12, SoundEvents.ARMOR_EQUIP_IRON, "ingots/steel"),
    FLUTED("fluted", "kettle_hat", ChatFormatting.WHITE, 2.5F, 0.1F,
            new Integer[]{330, 440, 480, 360}, new Integer[]{3, 6, 9, 3}, 9, SoundEvents.ARMOR_EQUIP_IRON, "ingots/steel"),
    WRAITH("wraith", "spired_armet", ChatFormatting.DARK_AQUA, 2.0F, 0.05F,
            new Integer[]{300, 400, 440, 330}, new Integer[]{3, 6, 8, 3}, 15, SoundEvents.ARMOR_EQUIP_NETHERITE, "ingots/steel");

    private final String id;
    private final String helmetName;
    private final ChatFormatting color;
    private final ArmorType armorType;

    GothicStyle(String id, String helmetName, ChatFormatting color, float toughness, float knockbackResistance,
                Integer[] durability, Integer[] defense, int enchantmentValue, SoundEvent equipSound, String repairTag) {
        this.id = id;
        this.helmetName = helmetName;
        this.color = color;
        ResourceLocation location = new ResourceLocation(GothicArmory.MOD_ID, id + "_gothic");
        Supplier<Ingredient> repair = () -> Ingredient.of(TagKey.create(Registries.ITEM, new ResourceLocation("forge", repairTag)));
        // the model location equals the armour type location, see GothicArmoryClient
        this.armorType = new ArmorType(location, location, toughness, knockbackResistance, durability, defense,
                enchantmentValue, equipSound, true, repair);
    }

    public String id() {
        return id;
    }

    public ChatFormatting color() {
        return color;
    }

    public ArmorType armorType() {
        return armorType;
    }

    public String itemId(ArmorItem.Type type) {
        return id + "_gothic_" + (type == ArmorItem.Type.HELMET ? helmetName : type.getName());
    }
}
