#!/usr/bin/env python3
"""Junta ao data.json da Prévia S10 a posição, a chance de playoffs e a de queda
após a rodada 9. Fonte: as imagens de classificação do site, enviadas pelo
usuário. Valores "<1%" viram 0 e ">99%" vira 100.

Uso: python3 video/previa10/standings.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
# nome: (posição, playoffs %, queda % ou None)
TABLE = {
    "elite": {"GORDINHAS AJEITADAS": (1, 100, None), "Los Pollos Hermanos": (2, 98, None), "Diogoashura": (3, 81, None),
              "Poker do Neymar": (4, 68, None), "Public Enemy #1": (5, 34, None), "Fofura e Fé": (6, 18, None),
              "Quack Attack": (7, 0, None), "Timbatível": (8, 0, None)},
    "serie-a": {"VoliBEARS": (1, 100, 0), "Timbatível": (2, 98, 1), "Public Enemy #1": (3, 96, 1),
                "Imperius Rex FC": (4, 81, 9), "سانتا کروز": (5, 67, 20), "Fofura e Fé": (6, 61, 23),
                "Diogoashura": (7, 33, 50), "Los Pollos Hermanos": (8, 39, 43), "Caipiracicaba": (9, 15, 72),
                "Cruzeiro do Neymar SFC": (10, 10, 81)},
    "serie-b": {"GORDINHAS AJEITADAS": (1, 100, 0), "RegisCarrara": (2, 99, 0), "Quack Attack": (3, 99, 0),
                "SiaraBigheads": (4, 96, 0), "Explosion Raiders": (5, 79, 4), "alb2106": (6, 68, 8),
                "BigFieldMS": (7, 51, 13), "wladspfc": (8, 7, 78), "Ceará Dolphins": (9, 0, 97), "Gumagol971": (10, 0, 99)},
    "serie-c": {"joaoW7": (1, 100, 0), "San Andreas Chiefs": (2, 100, 0), "Fogo na Bomba": (3, 97, 0),
                "Mangue Chiefs 🦀": (4, 97, 0), "086 Football": (5, 82, 5), "DMK Steel Curtain": (6, 81, 5),
                "Pandemônio FC": (7, 30, 33), "romanerinha": (8, 5, 78), "WI Redentor": (9, 7, 78),
                "Kelce Gremista": (10, 0, 100)},
    "serie-d": {"LeandroGaucho": (1, 100, None), "VitorM05": (2, 100, None), "New England Patriotas": (3, 92, None),
                "Green N Gold": (4, 96, None), "polvorje": (5, 81, None), "Just Maried": (6, 52, None),
                "Claudianosilva": (7, 43, None), "Elieser": (8, 29, None), "DH8 Red&Gold": (9, 4, None),
                "Correia49 KHC": (10, 4, None)},
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
