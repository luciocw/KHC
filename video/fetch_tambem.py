#!/usr/bin/env python3
"""Baixa da Sleeper as ligas "Também na KHC" para os vídeos curtos.

Gera <saida>/tambem.json e os logos em <saida>/assets/avatars/:
  - nba: KHC NBA League · National Burgundy Association (times, donos,
    comissários e membros sem time);
  - premier: Cocoricó Premier League (tabela com V–E–D e pontos; a Sleeper
    não entrega os placares por rodada desta liga).

Uso: python3 video/fetch_tambem.py video/previa7
"""
import json
import os
import sys
import urllib.request

LEAGUES = {"nba": "1418094440345620480", "premier": "1385073177100558336"}  # mesmo que js/config.js
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


def league(key, lid, out):
    info = get(f"league/{lid}")
    users = {u["user_id"]: u for u in get(f"league/{lid}/users")}
    teams = []
    for r in get(f"league/{lid}/rosters"):
        u = users.get(r.get("owner_id"), {})
        s = r.get("settings", {})
        teams.append({
            "name": ((u.get("metadata") or {}).get("team_name") or u.get("display_name") or "Time").strip(),
            "owner": u.get("display_name"), "user_id": u.get("user_id"),
            "avatar": avatar(u, out, key) if u else None,
            "w": s.get("wins", 0), "t": s.get("ties", 0), "l": s.get("losses", 0),
            "fpts": round(s.get("fpts", 0) + s.get("fpts_decimal", 0) / 100, 2),
        })
    owners = {t["user_id"] for t in teams}
    pts = (lambda t: 3 * t["w"] + t["t"]) if key == "premier" else (lambda t: t["w"])
    teams.sort(key=lambda t: (-pts(t), -t["fpts"]))
    return {"name": info["name"], "season": info["season"], "status": info["status"],
            "week": info["settings"].get("last_scored_leg", 0),
            "commissioners": [u["display_name"] for u in users.values() if u.get("is_owner")],
            "no_team": [u["display_name"] for uid, u in users.items() if uid not in owners],
            "teams": teams}


def main():
    out = sys.argv[1]
    os.makedirs(os.path.join(out, "assets", "avatars"), exist_ok=True)
    data = {k: league(k, lid, out) for k, lid in LEAGUES.items()}
    with open(os.path.join(out, "tambem.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    for k, d in data.items():
        print(f"{d['name']} · rodada {d['week']} · {len(d['teams'])} times · comissários {d['commissioners']} · sem time {d['no_team']}")
        for t in d["teams"]:
            rec = f"{t['w']}-{t['t']}-{t['l']}" if k == "premier" else f"{t['w']}-{t['l']}"
            print(f"   {t['name']} ({t['owner']}) {rec} {t['fpts']}")


if __name__ == "__main__":
    main()
