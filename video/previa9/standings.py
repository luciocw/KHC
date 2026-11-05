#!/usr/bin/env python3
"""Junta ao data.json da Prévia S9 a posição, a chance de playoffs e a de queda
após a rodada 8. Fonte: as imagens de classificação do site, enviadas pelo
usuário. Valores "<1%" viram 0 e ">99%" vira 100.

Uso: python3 video/previa9/standings.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
# nome: (posição, playoffs %, queda % ou None)
TABLE = {
    "elite": {"GORDINHAS AJEITADAS": (1, 100, None), "Los Pollos Hermanos": (2, 99, None), "Poker do Neymar": (3, 82, None),
              "Diogoashura": (4, 61, None), "Fofura e Fé": (5, 32, None), "Public Enemy #1": (6, 25, None),
              "Timbatível": (7, 1, None), "Quack Attack": (8, 0, None)},
    "serie-a": {"VoliBEARS": (1, 98, 0), "Public Enemy #1": (2, 98, 1), "Timbatível": (3, 92, 3),
                "Imperius Rex FC": (4, 89, 5), "سانتا کروز": (5, 47, 37), "Los Pollos Hermanos": (6, 61, 25),
                "Fofura e Fé": (7, 42, 42), "Caipiracicaba": (8, 29, 56), "Diogoashura": (9, 25, 61),
                "Cruzeiro do Neymar SFC": (10, 19, 69)},
    "serie-b": {"GORDINHAS AJEITADAS": (1, 100, 0), "Quack Attack": (2, 99, 0), "RegisCarrara": (3, 97, 1),
                "SiaraBigheads": (4, 88, 3), "BigFieldMS": (5, 67, 13), "Explosion Raiders": (6, 69, 13),
                "alb2106": (7, 56, 22), "wladspfc": (8, 19, 62), "Ceará Dolphins": (9, 3, 91), "Gumagol971": (10, 1, 96)},
    "serie-c": {"joaoW7": (1, 100, 0), "San Andreas Chiefs": (2, 100, 0), "Fogo na Bomba": (3, 98, 0),
                "Mangue Chiefs 🦀": (4, 98, 0), "086 Football": (5, 92, 2), "DMK Steel Curtain": (6, 81, 5),
                "Pandemônio FC": (7, 17, 46), "WI Redentor": (8, 12, 59), "romanerinha": (9, 2, 88),
                "Kelce Gremista": (10, 0, 100)},
    "serie-d": {"VitorM05": (1, 100, None), "LeandroGaucho": (2, 100, None), "Green N Gold": (3, 98, None),
                "polvorje": (4, 86, None), "New England Patriotas": (5, 81, None), "Claudianosilva": (6, 61, None),
                "Just Maried": (7, 39, None), "Elieser": (8, 19, None), "Correia49 KHC": (9, 13, None),
                "DH8 Red&Gold": (10, 4, None)},
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
