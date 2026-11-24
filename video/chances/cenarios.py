#!/usr/bin/env python3
"""O que cada time precisa nas rodadas que faltam (100% de certeza).

Testa TODOS os resultados das rodadas restantes (Sleeper). Para cada time e
cada número de vitórias dele (0 a 3), vê se o objetivo fica garantido em
todos os cenários, possível em algum ou impossível. Empate em vitórias é
sempre resolvido contra o objetivo quando se fala em "garantido" e a favor
quando se fala em "possível" (o desempate por pontos nunca é presumido).

Objetivos: playoffs (top N) e escapar da queda (fora dos 3 últimos).

Uso: python3 video/chances/cenarios.py 11 14
Gera cenarios.json ao lado deste arquivo.
"""
import itertools
import json
import os
import sys
import urllib.request

LEAGUES = [("elite", "1370091532551487488", 4, 0), ("serie-a", "1370032392135274496", 6, 3),
           ("serie-b", "1370034537232355328", 6, 3), ("serie-c", "1370036025006505984", 6, 3),
           ("serie-d", "1370091129751474176", 6, 0)]
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
        st = {r["roster_id"]: r["settings"] for r in rosters}
        wins = {k: v.get("wins", 0) for k, v in st.items()}
        pf = {k: round(v.get("fpts", 0) + v.get("fpts_decimal", 0) / 100, 2) for k, v in st.items()}
        games, sched = [], {k: [] for k in wins}
        for w in range(last + 1, final + 1):
            pairs = {}
            for m in get(f"{lid}/matchups/{w}"):
                if m.get("matchup_id") is not None:
                    pairs.setdefault(m["matchup_id"], []).append(m["roster_id"])
            for p in pairs.values():
                if len(p) == 2:
                    games.append(tuple(p))
                    sched[p[0]].append(p[1]); sched[p[1]].append(p[0])
        ids = list(wins)
        n = len(ids)
        # por time e por nº de vitórias próprias: [garantido sempre?, possível?] para cada objetivo
        res = {t: {k: {"po_lock": True, "po_ok": False, "safe_lock": True, "safe_ok": False} for k in range(len(sched[t]) + 1)} for t in ids}
        for r in itertools.product((0, 1), repeat=len(games)):
            w = dict(wins)
            own = {t: 0 for t in ids}
            for (a, b), x in zip(games, r):
                win = a if x else b
                w[win] += 1; own[win] += 1
            for t in ids:
                better = sum(1 for o in ids if o != t and w[o] > w[t])
                tied = sum(1 for o in ids if o != t and w[o] == w[t])
                best, worst = better + 1, better + tied + 1
                c = res[t][own[t]]
                if worst > po: c["po_lock"] = False
                if best <= po: c["po_ok"] = True
                if rel:
                    if worst > n - rel: c["safe_lock"] = False
                    if best <= n - rel: c["safe_ok"] = True

        def need(t, lock, ok):
            ks = sorted(res[t])
            lock_at = next((k for k in ks if all(res[t][j][lock] for j in ks if j >= k)), None)
            alive_at = next((k for k in ks if res[t][k][ok]), None)
            return {"garante_com": lock_at, "vivo_a_partir_de": alive_at}

        teams = []
        for t in sorted(ids, key=lambda i: (-wins[i], -pf[i])):
            s = st[t]
            teams.append({"name": name[t], "w": wins[t], "l": s.get("losses", 0), "pf": pf[t],
                          "pc": round(s.get("fpts_against", 0) + s.get("fpts_against_decimal", 0) / 100, 2),
                          "jogos": [{"vs": name[o], "w": wins[o], "l": st[o].get("losses", 0)} for o in sched[t]],
                          "playoffs": need(t, "po_lock", "po_ok"),
                          "queda": need(t, "safe_lock", "safe_ok") if rel else None})
        out[tier] = {"vagas": po, "caem": rel, "jogos_restantes": len(sched[ids[0]]), "teams": teams}
        print(tier)
        for x in teams:
            print(f"  {x['name']:24} {x['w']}-{x['l']} PF {x['pf']:8} PO {x['playoffs']}  Q {x['queda']}  vs {[j['vs'] for j in x['jogos']]}")
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "cenarios.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
