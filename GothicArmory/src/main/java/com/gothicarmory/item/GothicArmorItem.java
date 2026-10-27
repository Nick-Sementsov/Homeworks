package com.gothicarmory.item;

import java.util.List;

import com.gothicarmory.GothicArmory;
import com.gothicarmory.client.GothicArmoryClient;
import com.magistuarmory.forge.item.armor.MedievalArmorItemForge;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.level.Level;
import org.jetbrains.annotations.Nullable;

/**
 * An Epic Knights armour piece that belongs to a gothic style and grants its set bonus.
 */
public class GothicArmorItem extends MedievalArmorItemForge {
    private final GothicStyle style;

    public GothicArmorItem(GothicStyle style, Type type, Properties properties) {
        super(style.armorType(), type, properties);
        this.style = style;
    }

    public GothicStyle getStyle() {
        return style;
    }

    /** Number of pieces of the given style worn by the entity. */
    public static int countWorn(LivingEntity entity, GothicStyle style) {
        int count = 0;
        for (ItemStack stack : entity.getArmorSlots()) {
            if (stack.getItem() instanceof GothicArmorItem item && item.style == style) {
                count++;
            }
        }
        return count;
    }

    public static boolean hasFullSet(LivingEntity entity, GothicStyle style) {
        return countWorn(entity, style) == 4;
    }

    @Override
    public boolean makesPiglinsNeutral(ItemStack stack, LivingEntity wearer) {
        return style == GothicStyle.GILDED || super.makesPiglinsNeutral(stack, wearer);
    }

    @Override
    public void appendHoverText(ItemStack stack, @Nullable Level level, List<Component> tooltip, TooltipFlag flag) {
        super.appendHoverText(stack, level, tooltip, flag);
        tooltip.add(Component.translatable(GothicArmory.MOD_ID + ".style." + style.id())
                .withStyle(ChatFormatting.GRAY, ChatFormatting.ITALIC));
        int worn = level != null && level.isClientSide() ? GothicArmoryClient.wornByLocalPlayer(style) : 0;
        tooltip.add(Component.translatable(GothicArmory.MOD_ID + ".set_bonus", worn)
                .withStyle(worn == 4 ? style.color() : ChatFormatting.GRAY));
        tooltip.add(Component.literal(" ").append(Component.translatable(GothicArmory.MOD_ID + ".bonus." + style.id()))
                .withStyle(worn == 4 ? ChatFormatting.GOLD : ChatFormatting.DARK_GRAY));
    }
}
