# Funcionalidades do site

Cada tela, com o endereço e o arquivo onde ela está. A Copa tem página própria ([`copa.md`](copa.md)) e as Lendas também ([`lendas.md`](lendas.md)).

## Navegação

- **7 abas:** Ligas, Rodada, Top Scorers, Power Ranking, Lendas KHC, Temporadas e Regras, mais Também na KHC, que fica fora do menu.
- **Endereço por tela** (dá para compartilhar): `#/ligas/2026/a`, `#/top/2026`, `#/jogador/<usuario>`. Roteamento em `js/app.js` (`hashFor` / `parseHash`).
- **Landing** (`js/landing.js`): na 1ª visita pela raiz do site, abre uma apresentação curta da KHC. "Ver as ligas" leva ao hub e, dali em diante, a raiz abre o hub direto. Links com endereço (`#/ligas/…`, compartilhados ou do app instalado) nunca passam pela landing, e quem já usava o hub também não. `#/inicio` abre a landing a qualquer momento (link de divulgação e botão em Regras). O botão "Quero jogar" ainda não tem destino: entra quando houver link de inscrição.
- **App na tela inicial:** manifest e ícones em `assets/app/`. No Android, instala pelo Chrome; no iPhone, pelo Safari (Compartilhar → Adicionar à Tela de Início).

## Telas

- **Ligas** (`tabs/ligas.js`): uma série por vez, com zonas de acesso, playoffs e rebaixamento por temporada, e medalhas (com o número dentro) na classificação final. Os botões Baixar e Compartilhar geram um PNG da tabela. O seletor **Tabela | Chances | Chaveamento** troca a visão.
  - **Chances** (`tabs/chances.js`, `simulateOdds`): Playoffs % e Queda %, por simulação do resto da temporada regular, calibrada com o histórico de ligas 10/6 do Sleeper. Atualiza quando a rodada fecha.
  - **Chaveamento** (`tabs/chaveamento.js`): playoffs de cada série.
    - Elite: semis 1º×4º e 2º×3º (semana 15), final e 3º lugar (16).
    - Séries A–D: 1º e 2º folgam; quartas 4º×5º e 3º×6º (15), semis e 5º lugar (16), final e 3º lugar (17).
    - Na temporada regular mostra a projeção pela tabela de hoje, com a chance de playoffs de cada time; depois, o chaveamento do Sleeper com placares. Nas semanas de playoff, Ligas abre direto no Chaveamento. Exporta em imagem.
- **Rodada** (`tabs/rodada.js`): confrontos e placar da semana por série (‹ semana ›), rótulos de playoff (Final, 3º lugar, Semifinal…) e exportação em PNG. Destaques da semana: maior pontuação, maior vitória e jogo mais apertado.
- **Top Scorers** (`tabs/top-scorers.js`): filtro por série e "Incluir Elite" (desligado por padrão, para não duplicar time). Baixar e Compartilhar geram PNG da lista com o filtro atual; em "Todas", só o Top 20.
- **Power Ranking** (`tabs/power-ranking.js`): tiers S Favoritos · A Candidatos · B Meio de tabela · C Pressionados · D Lanternas, por posição (10/20/40/20/10%). PWR = 50% força (all-play semana a semana contra as Séries A–D) + 30% aproveitamento + 20% fase (últimas 3 semanas). Sem Elite. Exporta PNG.
- **Lendas KHC** (`tabs/lendas.js`): ver [`lendas.md`](lendas.md).
- **Temporadas** (`tabs/temporadas.js`) e **Regras** (`tabs/regras.js`, que explica as contas para o público).
- **Perfil do jogador** (`ui/drawer.js`): lateral no desktop, bottom sheet no celular.

## Também na KHC

`tabs/tambem.js`: página fora do menu, com abas por liga, botão Voltar para a NFL e um atalho discreto (ícone de grade) no topo. Aparece em Regras e, na entressafra da NFL, como cartão na aba Ligas.

- **KHC Guilhotina** (`#/guilhotina`, `tabs/guilhotina.js`; o link antigo `#/ligas/<ano>/g` redireciona): vivos ordenados pela pontuação da semana, zona de corte quando todos já pontuaram, e os cortados com a rodada do corte. Fica fora de Rodada, Top, Power e Chances. Exporta PNG.
- **Champions KHC** (`#/copa-champions`): ver [`copa.md`](copa.md).
- **Premier League** (`#/premier`): tabela da Cocoricó Premier League (V–E–D, PF, PC, eficiência de escalação) com exportação.
- **NBA** (`#/nba`): KHC NBA League · National Burgundy Association, liga nova em 2026/27 (6 times). Mesma tabela, com V–D, e Rodada (`#/nba/rodada/<semana>`) com destaques e exportação, como a da NFL. Antes do draft, mostra só os times que já entraram.

## Qualidade

- **Estados:** carregando (skeleton), erro com "Tentar de novo", cache, falha parcial e vazio.
- **Mobile-first:** navegação inferior fixa abaixo de 1024px, contraste AA e alvos de pelo menos 44px.
