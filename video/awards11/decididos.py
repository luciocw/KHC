#!/usr/bin/env python3
"""Quem já está decidido com 100% de certeza, testando todos os resultados
possíveis das rodadas que faltam (Sleeper: V–D atual e confrontos futuros).

Critério (definido pelo dono da KHC): só conta como decidido o que vale em
TODOS os cenários. Empate em vitórias é sempre resolvido CONTRA a tese
(o desempate por pontos nunca é presumido):
  - classificado: fica no top N mesmo com os empates decididos contra ele;
  - fora dos playoffs: fica fora do top N mesmo com os empates a favor;
  - rebaixado: fica entre os 3 últimos mesmo com os empates a favor;
  - salvo: fica fora dos 3 últimos mesmo com os empates contra ele.
Os confrontos diretos entram sozinhos: em cada cenário, um dos dois perde.

Uso: python3 video/awards11/decididos.py 11 14  (última rodada jogada, última da fase regular)
Gera decididos.json ao lado deste arquivo.
"""
import itertools
import json
import os
import sys
import urllib.request

LEAGUES = [("elite", "1370091532551487488", 4, 0), ("serie-a", "1370032392135274496", 6, 3),
           ("serie-b", "1370034537232355328", 6, 3), ("serie-c", "1370036025006505984", 6, 3),
           ("serie-d", "1370091129751474176", 6, 0)]  # (tier, id, vagas nos playoffs, rebaixados)
API = "https://api.sleeper.app/v1/league/"


def get(u):
    with urllib.request.urlopen(API + u, timeout=30) as r:
        return json.load(r)


def main():
    last, final = int(sys.argv[1]), int(sys.argv[2])
    out = {}
    for tier, lid, po, rel in LEAGUES:
        users = {u["user_id"]: u for u in get(lid + "/users")}
        rosters = get(lid + "/rosters")
        name = {r["roster_id"]: ((users.get(r["owner_id"], {}).get("metadata") or {}).get("team_name")
                                 or users.get(r["owner_id"], {}).get("display_name") or "Time").strip() for r in rosters}
        wins = {r["roster_id"]: r["settings"].get("wins", 0) for r in rosters}
        games = []
        for w in range(last + 1, final + 1):
            pairs = {}
            for m in get(f"{lid}/matchups/{w}"):
                if m.get("matchup_id") is not None:
                    pairs.setdefault(m["matchup_id"], []).append(m["roster_id"])
            games += [tuple(p) for p in pairs.values() if len(p) == 2]
        ids = list(wins)
        n = len(ids)
        always_in, always_out, always_rel, always_safe = set(ids), set(ids), set(ids), set(ids)
        for res in itertools.product((0, 1), repeat=len(games)):
            w = dict(wins)
            for (a, b), x in zip(games, res):
                w[a if x else b] += 1
            for t in ids:
                better = sum(1 for o in ids if o != t and w[o] > w[t])
                tied = sum(1 for o in ids if o != t and w[o] == w[t])
                best_pos, worst_pos = better + 1, better + tied + 1  # empates a favor / contra
                if worst_pos > po: always_in.discard(t)
                if best_pos <= po: always_out.discard(t)
                if rel:
                    if best_pos <= n - rel: always_rel.discard(t)
                    if worst_pos > n - rel: always_safe.discard(t)
        out[tier] = {"games_left": len(games),
                     "classificados": sorted(name[t] for t in always_in),
                     "fora_dos_playoffs": sorted(name[t] for t in always_out),
                     "rebaixados": sorted(name[t] for t in always_rel) if rel else [],
                     "salvos": sorted(name[t] for t in always_safe) if rel else [],
                     "vd": {name[t]: wins[t] for t in ids}}
        print(tier, len(games), "jogos;", {k: v for k, v in out[tier].items() if k not in ("vd", "games_left")})
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "decididos.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
