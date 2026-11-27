# Ultimate League KHC — Hub Oficial

Hub das ligas KHC de Fantasy Football no Sleeper: **Elite**, **Séries A–D** (com acesso e rebaixamento), **KHC Guilhotina** e **Copa KHC**, além da Cocoricó Premier League e da KHC NBA em "Também na KHC".

Site em **HTML/CSS/JS puro**: sem framework, sem build e sem backend. Publicado pelo GitHub Pages em https://luciocw.github.io/KHC/.

> **Chegou agora?** Comece pelo [`COMECE-AQUI.md`](COMECE-AQUI.md): mapa do repositório, rotina da semana e do ano, acessos e o que está pendente.

## O que tem no site

- **Ligas:** tabela de cada série com zonas e medalhas, **Chances** de playoffs e de queda, e **Chaveamento** dos playoffs.
- **Rodada:** confrontos e placares da semana, com destaques.
- **Top Scorers** e **Power Ranking**.
- **Copa KHC:** mata-mata do site em paralelo às divisões, e **Champions KHC**, a simulação do formato Champions.
- **Busca "Como estou na KHC?"** (topo de Ligas): digite o usuário do Sleeper e veja a situação na temporada (divisão, chances, Elite, Guilhotina, Copa, Hall da Fama); "Minha situação" para quem se lembrar no aparelho.
- **Lendas KHC:** Hall da Fama por Pontos KHC, mais o perfil de cada jogador.
- **Temporadas**, **Regras** e **Também na KHC** (Guilhotina, Premier League e NBA).
- Todas as telas exportam PNG, e o site pode ser instalado como app na tela inicial.

## Documentação

| Documento | Conteúdo |
|---|---|
| [`COMECE-AQUI.md`](COMECE-AQUI.md) | Guia de entrada: mapa, rotina, acessos, pendências |
| [`ENCERRAMENTO-TEMPORADA.md`](ENCERRAMENTO-TEMPORADA.md) | **Encerrar a temporada, passo a passo para leigos** (pelo GitHub, pelo Claude ou pelo terminal) |
| [`docs/funcionalidades.md`](docs/funcionalidades.md) | Cada tela em detalhe, com endereço e arquivo |
| [`docs/copa.md`](docs/copa.md) | Copa KHC (clássica e estilo Champions) e a simulação Champions KHC |
| [`docs/lendas.md`](docs/lendas.md) | Pontos KHC, Lendas e desempates |
| [`docs/dados.md`](docs/dados.md) | De onde vêm os dados, formato do `data/<ano>.json`, fechar temporada, temporada nova, registro das chances |
| [`docs/arquitetura.md`](docs/arquitetura.md) | Estrutura do código, identidade visual, decisões, como rodar e testar |
| [`video/README.md`](video/README.md) | Vídeos curtos: motor, índice dos vídeos de 2026, regras da zoeira |
| [`scripts/trilha/README.md`](scripts/trilha/README.md) | Trilhas 8-bit dos vídeos |
| [`CLAUDE.md`](CLAUDE.md) | Regras da casa (valem para pessoas também) |

Para o público, as regras ficam explicadas no próprio site, na aba **Regras** (`js/tabs/regras.js`).

## Começo rápido

```bash
python3 -m http.server 8000      # e abra http://localhost:8000
```

```bash
node --test tests/*.test.mjs     # testes das contas
```

Encerrar a temporada (depois da semana 17): pelo GitHub em **Actions → Encerrar temporada**, ou com `node scripts/derive-season.mjs 2026`. Passo a passo em [`ENCERRAMENTO-TEMPORADA.md`](ENCERRAMENTO-TEMPORADA.md).
