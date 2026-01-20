# 🏈 Ultimate League KHC - Hub Oficial

Hub central para visualização de ligas de Fantasy Football da KHC (Serie A, B, C e Elite).
Desenvolvido como uma **Single Page Application (SPA)** leve, sem backend, consumindo diretamente a API pública do Sleeper.

## 🚀 Funcionalidades

- **Multi-Ligas:** Agrega dados de várias ligas em uma única visualização.
- **Ranking Global:** Tabela unificada comparando pontuações entre diferentes divisões.
- **Hall da Fama Automático:** Lê a árvore de playoffs (`/winners_bracket`) para determinar campeões e classificados dinamicamente.
- **Power Ranking:** Análise de força dos times baseada em Pontos por Jogo (PF/G).
- **Matchups ao Vivo:** Placar da rodada atual em tempo real.
- **Mobile First:** Layout 100% responsivo e otimizado para celulares.

---

## ⚙️ Como Atualizar as Ligas (Manutenção Anual)

Todo ano, quando a Sleeper renova as ligas, novos IDs são gerados. Para atualizar o site, você só precisa editar o arquivo `index.html`.

### Passo a Passo:

1. Abra o arquivo `index.html`.
2. Procure pela constante `CONFIG` (por volta da linha 480).
3. Dentro de `SEASONS`, localize o ano desejado ou adicione um novo bloco.

Exemplo da estrutura:

```javascript
const CONFIG = {
    API: '[https://api.sleeper.app/v1](https://api.sleeper.app/v1)',
    SEASONS: {
        // ... anos anteriores ...
        '2026': {
            leagues: [
                // Substitua 'placeholder_X' pelo ID numérico da Sleeper
                { id: '123456789012345678', name: 'KHC Serie A', tier: 'serie-a' },
                { id: '987654321098765432', name: 'KHC Serie B', tier: 'serie-b' },
                // Adicione novas ligas conforme necessário
                { id: 'SEU_NOVO_ID_AQUI', name: 'KHC Serie C', tier: 'serie-c' }
            ]
        }
    }
};
