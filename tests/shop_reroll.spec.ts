import { describe, it, expect } from 'vitest';
import { ShopService } from '../src/engine/Shop';
import { RNG } from '../src/engine/RNG';
import { ParamsConfig, PlayerState } from '../src/models/Types';

const { params, probs, content } = ShopService.loadConfigs();

function mkPS(): PlayerState {
  const champ = content.campeones[0];
  return { user_id:'u', campeon: champ, bench:[], board_slots_activos:[null,null,null], equipo_total:[champ], xp_match:10, racha:0, vida_jugador:20, nivel_tienda:1, costo_reroll_actual: params.economia.reroll.base, store_entries:[] } as any;
}

describe('Shop reroll cost chain', () => {
  it('increments per reroll and resets per stage', () => {
    const shop = new ShopService(params as ParamsConfig, probs as any, content as any);
    const rng = new RNG('seed');
    const ps = mkPS();
    const cost1 = ps.costo_reroll_actual;
    shop.applyReroll(ps, rng, { pj: content.unidades.map((u:any)=>u.unit_id) });
    const cost2 = ps.costo_reroll_actual;
    expect(cost2).toBeGreaterThan(cost1);
    shop.resetRerollChain(ps);
    expect(ps.costo_reroll_actual).toEqual(params.economia.reroll.base);
  });
});

