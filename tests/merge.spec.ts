import { describe, it, expect } from 'vitest';
import { ShopService } from '../src/engine/Shop';
import { ParamsConfig, PlayerState } from '../src/models/Types';

const { params, probs, content } = ShopService.loadConfigs();

function mkPS(): PlayerState {
  const champ = content.campeones[0];
  return { user_id:'u', campeon: champ, bench:[], board_slots_activos:[null,null,null], equipo_total:[champ], xp_match:100, racha:0, vida_jugador:20, nivel_tienda:1, costo_reroll_actual: params.economia.reroll.base, store_entries:[] } as any;
}

describe('Unit merges', () => {
  it('1+1 -> level 2; 2+2 -> level 3', () => {
    const shop = new ShopService(params as ParamsConfig, probs as any, content as any);
    const ps = mkPS();
    const id = content.unidades[0].unit_id;
    shop.tryBuyUnit(ps, id);
    shop.tryBuyUnit(ps, id);
    const copy = ps.equipo_total.find(u => u.unit_id === id && u.nivel === 2);
    expect(copy).toBeTruthy();
    shop.tryBuyUnit(ps, id);
    shop.tryBuyUnit(ps, id);
    const copy3 = ps.equipo_total.find(u => u.unit_id === id && u.nivel === 3);
    expect(copy3).toBeTruthy();
  });
});

