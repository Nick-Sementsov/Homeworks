package com.gothicarmory.event;

import com.gothicarmory.GothicArmory;
import com.gothicarmory.GothicConfig;
import com.gothicarmory.item.GothicStyle;
import net.minecraft.tags.DamageTypeTags;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.entity.living.LivingHurtEvent;
import net.minecraftforge.event.entity.living.MobEffectEvent;
import net.minecraftforge.eventbus.api.Event;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

import static com.gothicarmory.item.GothicArmorItem.hasFullSet;

/**
 * Full-set bonuses:
 * <ul>
 *     <li>Blackened - Dread: melee hits apply Weakness</li>
 *     <li>Gilded - Golden Glory: Luck (piglin neutrality is per piece, see GothicArmorItem)</li>
 *     <li>Crimson - Blood Oath: melee lifesteal</li>
 *     <li>Fluted - Deflection: reduced projectile damage</li>
 *     <li>Wraith - Spectral Ward: night vision and immunity to Wither</li>
 * </ul>
 */
@Mod.EventBusSubscriber(modid = GothicArmory.MOD_ID)
public final class SetBonusEvents {
    private SetBonusEvents() {
    }

    @SubscribeEvent
    public static void onLivingHurt(LivingHurtEvent event) {
        if (!GothicConfig.SET_BONUSES.get()) {
            return;
        }
        LivingEntity target = event.getEntity();
        DamageSource source = event.getSource();
        if (source.is(DamageTypeTags.IS_PROJECTILE) && hasFullSet(target, GothicStyle.FLUTED)) {
            event.setAmount(event.getAmount() * (1.0F - GothicConfig.DEFLECTION_REDUCTION.get().floatValue()));
        }
        // direct melee hits only: the attacker is also the direct source of the damage
        if (source.getEntity() instanceof LivingEntity attacker && source.getDirectEntity() == attacker) {
            if (hasFullSet(attacker, GothicStyle.BLACKENED)) {
                int ticks = GothicConfig.DREAD_WEAKNESS_TICKS.get();
                if (ticks > 0) {
                    target.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, ticks, 0), attacker);
                }
            }
            if (hasFullSet(attacker, GothicStyle.CRIMSON)) {
                attacker.heal(event.getAmount() * GothicConfig.BLOOD_OATH_LIFESTEAL.get().floatValue());
            }
        }
    }

    @SubscribeEvent
    public static void onPlayerTick(TickEvent.PlayerTickEvent event) {
        Player player = event.player;
        if (event.phase != TickEvent.Phase.END || player.level().isClientSide() || player.tickCount % 20 != 0
                || !GothicConfig.SET_BONUSES.get()) {
            return;
        }
        if (hasFullSet(player, GothicStyle.GILDED)) {
            refresh(player, MobEffects.LUCK, 100, 40);
        }
        if (hasFullSet(player, GothicStyle.WRAITH)) {
            // night vision starts flickering below 200 ticks, keep it above that
            refresh(player, MobEffects.NIGHT_VISION, 440, 240);
            player.removeEffect(MobEffects.WITHER);
        }
    }

    @SubscribeEvent
    public static void onEffectApplicable(MobEffectEvent.Applicable event) {
        if (event.getEffectInstance().getEffect() == MobEffects.WITHER && GothicConfig.SET_BONUSES.get()
                && hasFullSet(event.getEntity(), GothicStyle.WRAITH)) {
            event.setResult(Event.Result.DENY);
        }
    }

    private static void refresh(Player player, MobEffect effect, int duration, int threshold) {
        MobEffectInstance current = player.getEffect(effect);
        if (current == null || (current.getAmplifier() == 0 && current.getDuration() < threshold)) {
            player.addEffect(new MobEffectInstance(effect, duration, 0, true, false, true));
        }
    }
}
