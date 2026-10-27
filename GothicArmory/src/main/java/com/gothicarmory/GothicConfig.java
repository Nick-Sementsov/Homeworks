package com.gothicarmory;

import net.minecraftforge.common.ForgeConfigSpec;

public final class GothicConfig {
    public static final ForgeConfigSpec SPEC;
    public static final ForgeConfigSpec.BooleanValue SET_BONUSES;
    public static final ForgeConfigSpec.IntValue DREAD_WEAKNESS_TICKS;
    public static final ForgeConfigSpec.DoubleValue BLOOD_OATH_LIFESTEAL;
    public static final ForgeConfigSpec.DoubleValue DEFLECTION_REDUCTION;

    static {
        ForgeConfigSpec.Builder builder = new ForgeConfigSpec.Builder();
        builder.push("set_bonuses");
        SET_BONUSES = builder
                .comment("Enable full-set bonuses of the gothic armour styles")
                .define("enabled", true);
        DREAD_WEAKNESS_TICKS = builder
                .comment("Blackened gothic: duration (ticks) of Weakness applied by melee hits")
                .defineInRange("dread_weakness_ticks", 60, 0, 1200);
        BLOOD_OATH_LIFESTEAL = builder
                .comment("Crimson gothic: part of the dealt melee damage returned as health")
                .defineInRange("blood_oath_lifesteal", 0.2D, 0.0D, 1.0D);
        DEFLECTION_REDUCTION = builder
                .comment("Fluted gothic: part of projectile damage that is negated")
                .defineInRange("deflection_reduction", 0.35D, 0.0D, 1.0D);
        builder.pop();
        SPEC = builder.build();
    }

    private GothicConfig() {
    }
}
