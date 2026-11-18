#!/usr/bin/env python3
"""Junta ao data.json da Prévia S11 a posição, a chance de playoffs e a de queda
após a rodada 10. Fonte: as imagens de classificação do site, enviadas pelo
usuário. Valores "<1%" viram 0 e ">99%" vira 100.

Uso: python3 video/previa11/standings.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
# nome: (posição, playoffs %, queda % ou None)
TABLE = {
    # Elite: sem imagem de chances desta rodada; posição pela Sleeper (vitórias e PF), sem %
    "elite": {"GORDINHAS AJEITADAS": (1, None, None), "Los Pollos Hermanos": (2, None, None), "Poker do Neymar": (3, None, None),
              "Diogoashura": (4, None, None), "Fofura e Fé": (5, None, None), "Public Enemy #1": (6, None, None),
              "Quack Attack": (7, None, None), "Timbatível": (8, None, None)},
    "serie-a": {"VoliBEARS": (1, 100, 0), "Timbatível": (2, 100, 0), "Public Enemy #1": (3, 99, 0),
                "Fofura e Fé": (4, 79, 10), "Imperius Rex FC": (5, 79, 10), "سانتا کروز": (6, 55, 28),
                "Caipiracicaba": (7, 41, 40), "Diogoashura": (8, 21, 61), "Los Pollos Hermanos": (9, 21, 62),
                "Cruzeiro do Neymar SFC": (10, 5, 89)},
    "serie-b": {"RegisCarrara": (1, 100, 0), "GORDINHAS AJEITADAS": (2, 100, 0), "Quack Attack": (3, 98, 0),
                "Explosion Raiders": (4, 95, 0), "SiaraBigheads": (5, 92, 0), "alb2106": (6, 87, 2),
                "BigFieldMS": (7, 26, 15), "Ceará Dolphins": (8, 1, 94), "wladspfc": (9, 1, 90), "Gumagol971": (10, 0, 99)},
    "serie-c": {"joaoW7": (1, 100, 0), "San Andreas Chiefs": (2, 100, 0), "Fogo na Bomba": (3, 100, 0),
                "Mangue Chiefs 🦀": (4, 100, 0), "086 Football": (5, 70, 12), "DMK Steel Curtain": (6, 68, 10),
                "Pandemônio FC": (7, 45, 21), "WI Redentor": (8, 15, 64), "romanerinha": (9, 2, 93),
                "Kelce Gremista": (10, 0, 100)},
    "serie-d": {"LeandroGaucho": (1, 100, None), "VitorM05": (2, 100, None), "New England Patriotas": (3, 99, None),
                "Green N Gold": (4, 99, None), "Just Maried": (5, 81, None), "polvorje": (6, 68, None),
                "Claudianosilva": (7, 18, None), "Elieser": (8, 20, None), "DH8 Red&Gold": (9, 10, None),
                "Correia49 KHC": (10, 5, None)},
}

path = os.path.join(HERE, "data.json")
data = json.load(open(path, encoding="utf-8"))
for lg in data["leagues"]:
    for m in lg["matchups"]:
        for tm in m:
            pos, po, q = TABLE[lg["tier"]][tm["name"]]
            tm.update(pos=pos, playoffs=po, queda=q)
json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("ok")
