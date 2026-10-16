#!/usr/bin/env python3
"""Baixa da Sleeper o estado da KHC Guilhotina para os vídeos curtos.

Regra da liga (Sleeper, tipo 3): a cada rodada, o vivo com menos pontos é
cortado e o elenco vai para o waiver. Gera <saida>/guilhotina.json com:
  - teams: nome, logo, dono, pontos da temporada e por rodada, vivo/cortado;
  - weeks: para cada rodada fechada, o cortado e os que escaparam por pouco;
  - commissioner: o dono da liga na Sleeper;
  - absent: donos da KHC que não estão na Guilhotina (para a zoeira).

Uso: python3 video/fetch_guilhotina.py video/guilhotina [--season 2026]
"""
import json
import os
import sys
import urllib.request

LEAGUE = {"2026": "1383129184330579968"}  # mesmo que js/config.js
# donos da KHC (user_id → liga onde está o time, para pegar o logo certo)
OWNERS = {"1133956049855578112": ("serie-a", "1370032392135274496"),
          "1134186504622018560": ("elite", "1370091532551487488")}
API = "https://api.sleeper.app/v1/"


def get(url):
    with urllib.request.urlopen(API + url, timeout=20) as r:
        return json.load(r)


def avatar(u, out, prefix):
    meta = u.get("metadata") or {}
    url = meta.get("avatar") or (f"https://sleepercdn.com/avatars/{u['avatar']}" if u.get("avatar") else None)
    if not url:
        return None
    path = f"assets/avatars/{prefix}-{u['user_id']}.jpg"
    if not os.path.exists(os.path.join(out, path)):
        try:
            with urllib.request.urlopen(url, timeout=20) as r, open(os.path.join(out, path), "wb") as f:
                f.write(r.read())
        except Exception as e:  # logo é opcional
            print("avatar falhou:", url, e)
            return None
    return path


def team_name(u):
    return ((u.get("metadata") or {}).get("team_name") or u.get("display_name") or "Time").strip()


def main():
    out = [a for a in sys.argv[1:] if not a.startswith("--")][0]
    season = sys.argv[sys.argv.index("--season") + 1] if "--season" in sys.argv else "2026"
    lid = LEAGUE[season]
    os.makedirs(os.path.join(out, "assets", "avatars"), exist_ok=True)

    league = get(f"league/{lid}")
    chopped = league["settings"].get("last_scored_leg", 0)
    users = {u["user_id"]: u for u in get(f"league/{lid}/users")}
    rosters = get(f"league/{lid}/rosters")
    weeks = {w: {m["roster_id"]: m.get("points") or 0 for m in get(f"league/{lid}/matchups/{w}")}
             for w in range(1, chopped + 1)}

    teams = {}
    for r in rosters:
        u = users.get(r.get("owner_id"), {})
        s = r.get("settings", {})
        teams[r["roster_id"]] = {
            "name": team_name(u), "owner": u.get("display_name"), "user_id": u.get("user_id"),
            "avatar": avatar(u, out, "guilhotina") if u else None,
            "fpts": round(s.get("fpts", 0) + s.get("fpts_decimal", 0) / 100, 2),
            "faab": s.get("waiver_budget_used", 0),
            "weeks": [round(weeks[w].get(r["roster_id"], 0), 2) for w in weeks],
            "cut": None,
        }

    # reconstrói os cortes: em cada rodada, o menor entre os vivos
    alive, summary = set(teams), []
    for w in weeks:
        ranked = sorted(alive, key=lambda i: weeks[w].get(i, 0))
        cut = ranked[0]
        teams[cut]["cut"] = w
        alive.discard(cut)
        summary.append({"week": w, "cut": teams[cut]["name"], "cut_pts": round(weeks[w][cut], 2),
                        "escaped": [{"name": teams[i]["name"], "pts": round(weeks[w][i], 2)} for i in ranked[1:4]],
                        "top": teams[ranked[-1]]["name"], "top_pts": round(weeks[w][ranked[-1]], 2)})

    commish = next((u for u in users.values() if u.get("is_owner")), {})
    absent = []
    for uid, (tier, other) in OWNERS.items():
        if uid in users:
            continue
        u = next((x for x in get(f"league/{other}/users") if x["user_id"] == uid), None)
        if u:
            absent.append({"name": team_name(u), "owner": u.get("display_name"), "avatar": avatar(u, out, tier)})

    data = {"season": season, "league": league["name"], "chopped": chopped, "alive": len(alive),
            "commissioner": team_name(commish) if commish else None,
            "teams": sorted(teams.values(), key=lambda t: (t["cut"] is not None, -(t["cut"] or 0), -t["fpts"])),
            "weeks": summary, "absent": absent}
    with open(os.path.join(out, "guilhotina.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    for s in summary:
        print(f"S{s['week']}: cortado {s['cut']} ({s['cut_pts']}) · escapou {s['escaped'][0]['name']} ({s['escaped'][0]['pts']})")
    print(len(alive), "vivos · comissário:", data["commissioner"], "· fora:", [a["name"] for a in absent])


if __name__ == "__main__":
    main()
