#!/usr/bin/env python3
"""Baixa da Sleeper os confrontos de uma semana de todas as ligas da KHC.

Gera <saida>/data.json e <saida>/assets/avatars/*.jpg para os vídeos curtos.
Os nomes, campanhas e pontos entram no vídeo como texto (nítido e grande),
não como print de tabela.

Uso: python3 video/fetch_rodada.py 5 video/semana5 [--season 2026]
"""
import json
import os
import sys
import urllib.request

LEAGUES = {  # mesmo que js/config.js
    "2026": [
        ("elite", "Elite", "1370091532551487488"),
        ("serie-a", "Série A", "1370032392135274496"),
        ("serie-b", "Série B", "1370034537232355328"),
        ("serie-c", "Série C", "1370036025006505984"),
        ("serie-d", "Série D", "1370091129751474176"),
    ],
}
API = "https://api.sleeper.app/v1/league/"


def get(url):
    with urllib.request.urlopen(url, timeout=20) as r:
        return json.load(r)


def download(url, path):
    if os.path.exists(path):
        return
    with urllib.request.urlopen(url, timeout=20) as r, open(path, "wb") as f:
        f.write(r.read())


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    week, out = int(args[0]), args[1]
    season = sys.argv[sys.argv.index("--season") + 1] if "--season" in sys.argv else "2026"
    av_dir = os.path.join(out, "assets", "avatars")
    os.makedirs(av_dir, exist_ok=True)
    data = {"season": season, "week": week, "leagues": []}
    for tier, label, lid in LEAGUES[season]:
        users = {u["user_id"]: u for u in get(API + lid + "/users")}
        rosters = {r["roster_id"]: r for r in get(API + lid + "/rosters")}
        pairs = {}
        for m in get(f"{API}{lid}/matchups/{week}"):
            if m.get("matchup_id") is None:
                continue
            r = rosters[m["roster_id"]]
            u = users.get(r.get("owner_id"), {})
            meta = u.get("metadata") or {}
            avatar = None
            url = meta.get("avatar") or (
                f"https://sleepercdn.com/avatars/{u['avatar']}" if u.get("avatar") else None)
            if url:
                avatar = f"assets/avatars/{u.get('user_id') or r['roster_id']}.jpg"
                try:
                    download(url, os.path.join(out, avatar))
                except Exception as e:  # avatar é opcional
                    print("avatar falhou:", url, e)
                    avatar = None
            s = r.get("settings", {})
            pairs.setdefault(m["matchup_id"], []).append({
                "name": (meta.get("team_name") or u.get("display_name") or "Time").strip(),
                "record": f"{s.get('wins', 0)}-{s.get('losses', 0)}",
                "points": round(m.get("points") or 0, 2),
                "avatar": avatar,
            })
        data["leagues"].append({"tier": tier, "label": label,
                                "matchups": [pairs[k] for k in sorted(pairs)]})
        print(label, len(pairs), "confrontos")
    with open(os.path.join(out, "data.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
