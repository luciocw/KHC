# Encerramento da temporada: passo a passo

Encerrar a temporada é gravar o resultado final no arquivo `data/<ano>.json`. Isso inclui a classificação, os troféus e os confrontos de todas as semanas. Depois disso:

- o site passa a mostrar a temporada como **encerrada**, com medalhas;
- os **Pontos KHC** do ano entram nas **Lendas** e no perfil de cada jogador;
- Rodada, Chaveamento, Copa e Champions KHC daquele ano passam a funcionar mesmo que o Sleeper saia do ar.

É uma vez por ano e leva uns 10 minutos.

## Quando fazer

Depois que a **final e a disputa do 3º lugar** de todas as séries terminarem: semana 17 da NFL, entre o fim de dezembro e o começo de janeiro.

Recomendo esperar **uns 10 dias** depois da última rodada. É o prazo em que o Sleeper ainda pode corrigir estatísticas, e o mesmo que o site usa para considerar um placar definitivo.

Se rodar cedo demais, nada se estraga: o encerramento para sozinho com o aviso "a final ainda não tem vencedor".

---

## Jeito 1 — Pelo GitHub, no navegador (recomendado)

Funciona no computador ou no celular e não precisa instalar nada. Você só precisa estar logado no GitHub com uma conta que tenha acesso ao repositório.

### Parte A: rodar o encerramento

1. Abra o repositório: https://github.com/luciocw/KHC
2. No menu de cima, clique em **Actions**.
3. Na lista da esquerda, clique em **Encerrar temporada**.
4. À direita aparece a faixa "This workflow has a workflow_dispatch event trigger". Clique no botão **Run workflow**.
5. No campo **Ano da temporada**, digite só o ano, por exemplo `2026`.
6. Clique no botão verde **Run workflow**.
7. Espere 1 ou 2 minutos e atualize a página. Aparece uma linha nova no topo da lista:
   - **✅ verde:** deu certo. Siga para a Parte B.
   - **❌ vermelho:** não deu certo. Veja "Se der erro", mais abaixo.

### Parte B: colocar no site

1. Clique na linha verde da execução que acabou de rodar.
2. No fim da página há o resumo **"Temporada 2026 fechada ✅"** com um link. Clique nele.
   - Outro caminho: na página inicial do repositório costuma aparecer uma faixa amarela, "encerramento-2026 had recent pushes", com o botão **Compare & pull request**.
3. Clique em **Create pull request**. Na tela seguinte, clique de novo em **Create pull request**.
4. Espere o check **testes** ficar ✅ verde (menos de 1 minuto).
5. Clique em **Merge pull request** e depois em **Confirm merge**.
6. Pronto. Em 1 a 2 minutos o site (https://luciocw.github.io/KHC/) mostra a temporada encerrada. Para conferir, escolha o ano no seletor de temporada e veja se aparecem as medalhas, e se as Lendas mudaram.

### Se der erro

Clique na linha vermelha, depois em **encerrar** e no passo que ficou com ❌, e leia a mensagem:

| Mensagem | O que fazer |
|---|---|
| "a final ainda não tem vencedor" / "a disputa do 3º lugar ainda não tem vencedor" | A temporada ainda não acabou no Sleeper. Espere e rode de novo |
| "Digite só o ano, com 4 números" | Rode de novo digitando só o ano, por exemplo `2026` |
| "Sleeper falhou" / "HTTP 5xx" | O Sleeper estava fora do ar. Tente de novo mais tarde |
| Erro nos **Testes das contas** | Não faça o merge. Peça ajuda (ao Claude ou a quem cuida do código) e mande o print da mensagem |

Se o resumo disser **"nada a fazer"**, a temporada já estava registrada exatamente assim no site: não há pull request para abrir. Se aparecer o aviso **"já tinha registro no site e este resultado é diferente"**, só faça o merge se a intenção for corrigir o registro.

Rodar de novo não causa problema: o arquivo da branch `encerramento-<ano>` é simplesmente substituído.

---

## Jeito 2 — Pedindo ao Claude

Numa sessão do Claude Code com este repositório, escreva:

> Encerre a temporada 2026 seguindo o ENCERRAMENTO-TEMPORADA.md e abra o pull request.

Ele roda o encerramento, confere os testes e abre o pull request. O merge continua com você (Parte B, a partir do passo 4).

---

## Jeito 3 — Pelo terminal (para quem já usa)

Precisa de [Node.js](https://nodejs.org) 22 ou mais novo e do Git instalados.

1. Baixe o repositório (só da primeira vez):
   ```bash
   git clone https://github.com/luciocw/KHC.git
   ```
2. Entre na pasta e atualize:
   ```bash
   cd KHC
   ```
   ```bash
   git checkout main && git pull
   ```
3. Rode o encerramento (troque o ano):
   ```bash
   node scripts/derive-season.mjs 2026
   ```
4. Confira os testes:
   ```bash
   node --test tests/*.test.mjs
   ```
5. Grave numa branch e envie:
   ```bash
   git checkout -b encerramento-2026
   ```
   ```bash
   git add data/2026.json && git commit -m "Encerramento da temporada 2026"
   ```
   ```bash
   git push -u origin encerramento-2026
   ```
6. Termine pelo navegador, a partir do passo 2 da Parte B do Jeito 1.

---

## Opções extras do script

- `--so-copa`: só confere o resultado da Copa, sem encerrar a temporada.
- `--so-placares`: só acrescenta os confrontos semana a semana a um `data/<ano>.json` que já existe.

O que o script faz por dentro e o formato do arquivo estão em [`docs/dados.md`](docs/dados.md).
