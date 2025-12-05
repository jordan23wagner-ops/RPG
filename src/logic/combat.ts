import { CombatStats, DamageType } from '../types/combat';

export interface CombatantSnapshot {
  id?: string;
  name?: string;
  level: number;
  stats: CombatStats;
  /** Current life, NOT max life */
  currentLife: number;
}

export interface WeaponSnapshot {
  minDamage: number;
  maxDamage: number;
  damageType: DamageType;
}

export interface AttackInput {
  attacker: CombatantSnapshot;
  defender: CombatantSnapshot;
  weapon?: WeaponSnapshot | null;

  /** Flat bonus added after base roll (e.g. +damage from stats/sets/affixes) */
  flatDamageBonus?: number;

  /** Percent bonus applied after flat (0.2 = +20% damage) */
  percentDamageBonus?: number;
}

export interface AttackResult {
  hit: boolean;
  evaded: boolean;
  crit: boolean;

  /** Base damage before defenses */
  damageRolled: number;

  /** After armor reduction */
  damageAfterArmor: number;

  /** After resistances */
  damageFinal: number;

  defenderLifeBefore: number;
  defenderLifeAfter: number;
  killed: boolean;

  damageType: DamageType;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const rollBetween = (min: number, max: number, rng: () => number): number => {
  if (max <= min) return min;
  const r = rng();
  return Math.floor(min + (max - min + 1) * r);
};

const computeHitChance = (defender: CombatantSnapshot): number => {
  const baseHit = 1 - defender.stats.evasionChance;
  return clamp(baseHit, 0.05, 0.98);
};

const computeArmorMultiplier = (armor: number): number => {
  if (armor <= 0) return 1;
  const mitigation = armor / (armor + 50);
  const clamped = clamp(mitigation, 0, 0.9);
  return 1 - clamped;
};

const computeResistMultiplier = (
  damageType: DamageType,
  defender: CombatantSnapshot
): number => {
  const resist =
    defender.stats.resistances?.[damageType] !== undefined
      ? defender.stats.resistances![damageType]!
      : 0;

  const clamped = clamp(resist, -0.9, 0.9);
  return 1 - clamped;
};

/**
 * Main combat brain.
 * Resolves a single attack from attacker -> defender.
 * Does NOT mutate anything — it just returns numbers.
 */
export const resolveAttack = (
  input: AttackInput,
  rng: () => number = Math.random
): AttackResult => {
  const { attacker, defender } = input;
  const weapon = input.weapon ?? null;

  const flatBonus = input.flatDamageBonus ?? 0;
  const percentBonus = input.percentDamageBonus ?? 0;

  const defenderLifeBefore = defender.currentLife;

  // STEP 1 – hit / evade roll
  const hitChance = computeHitChance(defender);
  const hitRoll = rng();

  if (hitRoll > hitChance) {
    return {
      hit: false,
      evaded: true,
      crit: false,
      damageRolled: 0,
      damageAfterArmor: 0,
      damageFinal: 0,
      defenderLifeBefore,
      defenderLifeAfter: defenderLifeBefore,
      killed: false,
      damageType: weapon?.damageType ?? 'physical',
    };
  }

  // STEP 2 – base damage roll
  const baseMin = weapon?.minDamage ?? 1;
  const baseMax = weapon?.maxDamage ?? 2;
  const damageType = weapon?.damageType ?? ('physical' as DamageType);

  let damageRolled = rollBetween(baseMin, baseMax, rng);

  // STEP 3 – flat + percent bonuses
  damageRolled = (damageRolled + flatBonus) * (1 + percentBonus);

  // STEP 4 – crit
  // Support both 0–1 (e.g. 0.05) and 0–100 (e.g. 5 for 5%) inputs.
  const rawCritChance = attacker.stats.critChance;
  const critChanceNormalized = rawCritChance > 1 ? rawCritChance / 100 : rawCritChance;
  const critChance = clamp(critChanceNormalized, 0, 0.9);

  const critRoll = rng();
  const crit = critRoll < critChance;

  // Support both 1.5 style and 150 style crit multipliers
  const rawCritMult = attacker.stats.critMultiplier;
  const critMultNormalized = rawCritMult > 5 ? rawCritMult / 100 : rawCritMult;
  const critMultiplier = crit ? critMultNormalized : 1;
  let damageAfterCrit = damageRolled * critMultiplier;

  // STEP 5 – armor
  const armorMultiplier = computeArmorMultiplier(defender.stats.armor);
  const damageAfterArmor = damageAfterCrit * armorMultiplier;

  // STEP 6 – resistances
  const resistMultiplier = computeResistMultiplier(damageType, defender);
  const damageFinalRaw = damageAfterArmor * resistMultiplier;

  const damageFinal = Math.max(1, Math.floor(damageFinalRaw));

  const defenderLifeAfter = Math.max(0, defenderLifeBefore - damageFinal);
  const killed = defenderLifeAfter <= 0;

  return {
    hit: true,
    evaded: false,
    crit,
    damageRolled: Math.round(damageRolled),
    damageAfterArmor: Math.round(damageAfterArmor),
    damageFinal,
    defenderLifeBefore,
    defenderLifeAfter,
    killed,
    damageType,
  };
};
