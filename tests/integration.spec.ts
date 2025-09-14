import { describe, it, expect } from 'vitest';
import { ShopService } from '../src/engine/Shop';
import { MatchEngine } from '../src/engine/Match';
import { ParamsConfig, PlayerState } from '../src/models/Types';

const { params, content } = ShopService.loadConfigs();

describe('Full match integration', () => {
  it('runs a complete match with 8 players', () => {
    const engine = new MatchEngine(params as ParamsConfig, content as any);
    const players = Array.from({ length: 8 }, (_, i) => i === 0 ? 'user' : `bot_${i}`);
    const map = new Map<string, PlayerState>();
    const champs = content.campeones;
    for (const id of players) {
      const champ = champs[(Math.random()*champs.length)|0];
      const ps = engine.createInitialPlayerState(id, champ);
      ps.board_slots_activos[0] = ps.campeon;
      map.set(id, ps);
    }
    const pools = new Map<string, { pj: string[] }>();
    for (const id of players) pools.set(id, { pj: content.unidades.map((u:any)=>u.unit_id) });
    const res = engine.runFullMatch(players, map, pools);
    expect(res.ranking.length).toBe(8);
  });
});

