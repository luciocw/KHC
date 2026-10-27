#!/usr/bin/env python3
"""Junta ao data.json da Prévia S7 a posição, a chance de playoffs e a de queda
após a rodada 6. Fonte: as imagens de classificação do site, enviadas pelo
usuário. Valores "<1%" viram 0 e ">99%" vira 99.

Uso: python3 video/previa7/standings.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
# nome: (posição, playoffs %, queda % ou None)
TABLE = {
    "elite": {"Los Pollos Hermanos": (1, 97, None), "GORDINHAS AJEITADAS": (2, 98, None), "Poker do Neymar": (3, 72, None),
              "Public Enemy #1": (4, 59, None), "Diogoashura": (5, 33, None), "Fofura e Fé": (6, 35, None),
              "Quack Attack": (7, 4, None), "Timbatível": (8, 1, None)},
    "serie-a": {"VoliBEARS": (1, 95, 2), "Imperius Rex FC": (2, 87, 7), "Public Enemy #1": (3, 83, 9),
                "Los Pollos Hermanos": (4, 84, 9), "Timbatível": (5, 71, 17), "Fofura e Fé": (6, 63, 23),
                "سانتا کروز": (7, 49, 36), "Diogoashura": (8, 25, 62), "Caipiracicaba": (9, 22, 65),
                "Cruzeiro do Neymar SFC": (10, 20, 69)},
    "serie-b": {"GORDINHAS AJEITADAS": (1, 99, 0), "RegisCarrara": (2, 95, 2), "Quack Attack": (3, 92, 3),
                "BigFieldMS": (4, 80, 10), "SiaraBigheads": (5, 65, 20), "Explosion Raiders": (6, 59, 25),
                "alb2106": (7, 56, 26), "wladspfc": (8, 35, 49), "Gumagol971": (9, 10, 81), "Ceará Dolphins": (10, 9, 83)},
    "serie-c": {"San Andreas Chiefs": (1, 99, 0), "joaoW7": (2, 99, 0), "Fogo na Bomba": (3, 96, 1),
                "086 Football": (4, 86, 4), "Mangue Chiefs 🦀": (5, 85, 4), "DMK Steel Curtain": (6, 81, 6),
                "romanerinha": (7, 11, 71), "Pandemônio FC": (8, 38, 31), "WI Redentor": (9, 4, 88),
                "Kelce Gremista": (10, 0, 97)},
    "serie-d": {"LeandroGaucho": (1, 97, None), "VitorM05": (2, 95, None), "New England Patriotas": (3, 79, None),
                "polvorje": (4, 76, None), "Green N Gold": (5, 81, None), "Just Maried": (6, 62, None),
                "Correia49 KHC": (7, 41, None), "Claudianosilva": (8, 20, None), "Elieser": (9, 30, None),
                "DH8 Red&Gold": (10, 19, None)},
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
