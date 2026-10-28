#!/usr/bin/env python3
"""Junta ao data.json da Prévia S8 a posição, a chance de playoffs e a de queda
após a rodada 7. Fonte: as imagens de classificação do site, enviadas pelo
usuário. Valores "<1%" viram 0 e ">99%" vira 99.

Uso: python3 video/previa8/standings.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
# nome: (posição, playoffs %, queda % ou None)
TABLE = {
    "elite": {"GORDINHAS AJEITADAS": (1, 99, None), "Los Pollos Hermanos": (2, 99, None), "Poker do Neymar": (3, 70, None),
              "Diogoashura": (4, 57, None), "Public Enemy #1": (5, 44, None), "Fofura e Fé": (6, 25, None),
              "Timbatível": (7, 3, None), "Quack Attack": (8, 2, None)},
    "serie-a": {"VoliBEARS": (1, 99, 0), "Imperius Rex FC": (2, 92, 3), "Public Enemy #1": (3, 93, 3),
                "Timbatível": (4, 82, 9), "Los Pollos Hermanos": (5, 76, 14), "Fofura e Fé": (6, 49, 34),
                "سانتا کروز": (7, 42, 41), "Cruzeiro do Neymar SFC": (8, 38, 46), "Caipiracicaba": (9, 15, 74),
                "Diogoashura": (10, 14, 76)},
    "serie-b": {"GORDINHAS AJEITADAS": (1, 99, 0), "Quack Attack": (2, 96, 1), "RegisCarrara": (3, 93, 2),
                "Explosion Raiders": (4, 79, 9), "BigFieldMS": (5, 81, 9), "SiaraBigheads": (6, 71, 13),
                "wladspfc": (7, 38, 41), "alb2106": (8, 36, 40), "Gumagol971": (9, 3, 91), "Ceará Dolphins": (10, 2, 94)},
    "serie-c": {"San Andreas Chiefs": (1, 99, 0), "joaoW7": (2, 99, 0), "Fogo na Bomba": (3, 99, 0),
                "Mangue Chiefs 🦀": (4, 96, 1), "DMK Steel Curtain": (5, 91, 2), "086 Football": (6, 83, 4),
                "romanerinha": (7, 6, 75), "Pandemônio FC": (8, 19, 43), "WI Redentor": (9, 6, 76),
                "Kelce Gremista": (10, 0, 99)},
    "serie-d": {"LeandroGaucho": (1, 99, None), "VitorM05": (2, 99, None), "New England Patriotas": (3, 90, None),
                "Green N Gold": (4, 92, None), "polvorje": (5, 74, None), "Just Maried": (6, 48, None),
                "Claudianosilva": (7, 39, None), "Correia49 KHC": (8, 31, None), "Elieser": (9, 17, None),
                "DH8 Red&Gold": (10, 10, None)},
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
