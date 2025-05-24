# Definição Detalhada dos Tipos e Fluxos de Notificação

Este documento descreve a estrutura, gatilhos, conteúdo e fluxos para cada tipo de notificação a ser implementada no bot Discord, com base no planejamento do modelo de dados (`docs/notificacao_model_plan.md`) e nos requisitos do usuário.

## 1. Notificações para Usuários Individuais

Estas notificações são enviadas diretamente ao usuário (preferencialmente via DM, configurável).

### 1.1. Meta Diária Atingida

*   **Tipo (Enum):** `meta_diaria_usuario`
*   **Destinatário:** Usuário individual.
*   **Gatilho:** Após atualização do `progressoDiario` (em `utils/metricasHelper.js` ou similar) que faça o progresso atingir ou superar a `metaDiaria` para um item específico.
*   **Verificação de Configuração:** Checar se `NotificacaoConfigUsuario.notificarMetaDiariaAtingida` é `true` para o usuário.
*   **Conteúdo (Exemplo):**
    *   Mensagem: "Parabéns, <@usuarioId>! 🎉 Você atingiu sua meta diária de X para o item Y!"
    *   Embed (Opcional): Título "Meta Diária Atingida!", Descrição detalhando item, meta, progresso.
*   **Canal:** `NotificacaoConfigUsuario.canalPreferencial` (DM por padrão).
*   **Dados Relacionados:** `{ itemId: '...', meta: 100, progresso: 105 }`
*   **Lógica de Leitura:** Marcada como lida via comando `/notificacoes marcar-lida` ou implicitamente ao usar `/notificacoes ver`.

### 1.2. Meta Semanal Atingida

*   **Tipo (Enum):** `meta_semanal_usuario`
*   **Destinatário:** Usuário individual.
*   **Gatilho:** Após atualização do `progressoSemanal` (em `utils/metricasHelper.js` ou similar) que faça o progresso atingir ou superar a `metaSemanal` para um item específico.
*   **Verificação de Configuração:** Checar se `NotificacaoConfigUsuario.notificarMetaSemanalAtingida` é `true`.
*   **Conteúdo (Exemplo):**
    *   Mensagem: "Incrível, <@usuarioId>! 🏆 Você bateu sua meta semanal de X para o item Y! Continue assim!"
    *   Embed (Opcional): Similar à meta diária, mas focado na semanal.
*   **Canal:** `NotificacaoConfigUsuario.canalPreferencial`.
*   **Dados Relacionados:** `{ itemId: '...', meta: 500, progresso: 510 }`
*   **Lógica de Leitura:** Similar à meta diária.

### 1.3. Alerta de Proximidade de Meta

*   **Tipo (Enum):** `proximidade_meta_usuario`
*   **Destinatário:** Usuário individual.
*   **Gatilho:** Após atualização do `progressoDiario` ou `progressoSemanal` que faça o progresso atingir ou superar o limiar configurado (`NotificacaoConfigUsuario.limiarProximidadeMeta`, padrão 80%) da respectiva meta, mas *sem* ainda tê-la atingido.
*   **Verificação de Configuração:** Checar se `NotificacaoConfigUsuario.notificarProximidadeMeta` é `true`.
*   **Conteúdo (Exemplo):**
    *   Mensagem: "Atenção, <@usuarioId>! 🔥 Você está quase lá! Atingiu Z% da sua meta [diária/semanal] de X para o item Y."
    *   Embed (Opcional): Título "Quase Lá!", Descrição mostrando progresso vs meta.
*   **Canal:** `NotificacaoConfigUsuario.canalPreferencial`.
*   **Dados Relacionados:** `{ itemId: '...', tipoMeta: 'diaria' | 'semanal', meta: 100, progresso: 85, limiar: 80 }`
*   **Lógica de Leitura:** Similar à meta diária.
*   **Observação:** Evitar enviar múltiplos alertas de proximidade para a mesma meta no mesmo período (dia/semana) - talvez checar se já existe notificação recente desse tipo.

### 1.4. Lembrete de Metas Não Atingidas

*   **Tipo (Enum):** `lembrete_meta_usuario`
*   **Destinatário:** Usuário individual.
*   **Gatilho:** Tarefa agendada (`node-cron`):
    *   **Diário:** No final do dia (ex: 23:50), verifica metas diárias não atingidas.
    *   **Semanal:** No final da semana (ex: Domingo 23:50), verifica metas semanais não atingidas.
*   **Verificação de Configuração:** Checar se `NotificacaoConfigUsuario.notificarMetasNaoAtingidas` é `true`.
*   **Conteúdo (Exemplo):**
    *   Mensagem: "Olá, <@usuarioId>. Um lembrete sobre suas metas [diárias/semanais] não atingidas: [Lista de itens e progresso/meta]."
    *   Embed (Opcional): Título "Lembrete de Metas", Lista de campos para cada meta não atingida.
*   **Canal:** `NotificacaoConfigUsuario.canalPreferencial`.
*   **Dados Relacionados:** `{ tipoPeriodo: 'diario' | 'semanal', metasPendentes: [{ itemId: '...', meta: 100, progresso: 50 }, ...] }`
*   **Lógica de Leitura:** Similar à meta diária.

## 2. Notificações para Gerentes

Estas notificações são enviadas para um canal específico (`CANAL_NOTIFICACOES_ID`) acessível por usuários com o cargo de gerência (`CARGO_GERENCIA_ID`).

### 2.1. Resumo Diário de Metas Atingidas

*   **Tipo (Enum):** `resumo_diario_gerente`
*   **Destinatário:** Canal de Gerência (`CANAL_NOTIFICACOES_ID`).
*   **Gatilho:** Tarefa agendada (`node-cron`), no final do dia (ex: 23:55), após o lembrete de usuário.
*   **Verificação de Configuração:** N/A (sempre enviado para o canal configurado).
*   **Conteúdo (Exemplo):**
    *   Embed: Título "Resumo Diário de Metas Atingidas", Descrição geral, Campos por Cargo/Equipe mostrando nº de usuários que atingiram metas diárias, talvez lista dos top X.
*   **Canal:** `CANAL_NOTIFICACOES_ID`.
*   **Dados Relacionados:** `{ data: 'YYYY-MM-DD', resumoPorCargo: { 'cargoId1': { atingiram: 5, total: 10 }, ... } }`
*   **Lógica de Leitura:** N/A (mensagens de canal não têm status de leitura individual gerenciado pelo bot).

### 2.2. Alertas de Usuários com Alto Desempenho

*   **Tipo (Enum):** `alerta_alto_desempenho_gerente`
*   **Destinatário:** Canal de Gerência.
*   **Gatilho:** Após atualização de progresso (`utils/metricasHelper.js`) que exceda significativamente a meta (ex: >150% da meta diária/semanal) OU tarefa agendada que identifique os top performers do dia/semana.
*   **Verificação de Configuração:** N/A.
*   **Conteúdo (Exemplo):**
    *   Mensagem: "🚀 Desempenho Excepcional! <@usuarioId> superou a meta [diária/semanal] de Y, atingindo Z!"
    *   Embed (Opcional): Detalhes do usuário, item, meta e progresso.
*   **Canal:** `CANAL_NOTIFICACOES_ID`.
*   **Dados Relacionados:** `{ usuarioId: '...', itemId: '...', tipoMeta: 'diaria' | 'semanal', meta: 100, progresso: 160 }`
*   **Lógica de Leitura:** N/A.

### 2.3. Alertas de Usuários que Não Atingiram Metas

*   **Tipo (Enum):** `alerta_baixo_desempenho_gerente`
*   **Destinatário:** Canal de Gerência.
*   **Gatilho:** Tarefa agendada (diária/semanal) que identifica usuários que consistentemente não atingem metas ou têm progresso muito baixo (ex: < 25% da meta no final do período).
*   **Verificação de Configuração:** N/A.
*   **Conteúdo (Exemplo):**
    *   Mensagem: "⚠️ Atenção ao Desempenho: <@usuarioId> não atingiu a meta [diária/semanal] para o item Y (Progresso: Z/W)."
    *   Embed (Opcional): Lista de usuários com baixo desempenho e seus detalhes.
*   **Canal:** `CANAL_NOTIFICACOES_ID`.
*   **Dados Relacionados:** `{ usuarioId: '...', itemId: '...', tipoMeta: 'diaria' | 'semanal', meta: 100, progresso: 20 }`
*   **Lógica de Leitura:** N/A.

### 2.4. Relatório Semanal Comparativo

*   **Tipo (Enum):** `relatorio_semanal_gerente`
*   **Destinatário:** Canal de Gerência.
*   **Gatilho:** Tarefa agendada (`node-cron`), no final da semana (ex: Domingo 23:58).
*   **Verificação de Configuração:** N/A.
*   **Conteúdo (Exemplo):**
    *   Embed: Título "Relatório Semanal Comparativo", Comparação de desempenho entre cargos/equipes, progresso médio, top/bottom performers da semana, tendências.
*   **Canal:** `CANAL_NOTIFICACOES_ID`.
*   **Dados Relacionados:** `{ dataInicio: '...', dataFim: '...', dadosComparativos: { ... } }`
*   **Lógica de Leitura:** N/A.

## 3. Comandos Relacionados

*   `/notificacoes configurar`: Abre um menu (modal ou select menu) para o usuário ajustar suas preferências (`NotificacaoConfigUsuario`).
*   `/notificacoes ver [pagina]`: Lista as últimas X notificações *não lidas* do usuário, paginadas. Mostra tipo, resumo da mensagem e data.
*   `/notificacoes marcar-lida [id|todas]`: Permite marcar uma notificação específica (pelo ID, talvez mostrado no `/notificacoes ver`) ou todas as não lidas como lidas.

## 4. Próximos Passos

Com esta definição, o próximo passo é implementar a lógica de:
1.  Criação dos novos Schemas Mongoose (`NotificacaoConfigUsuario`, `Notificacao`).
2.  Criação do `notificacaoService.js`.
3.  Integração dos gatilhos em `metricasHelper.js`.
4.  Configuração das tarefas agendadas (`node-cron`).
5.  Implementação dos novos comandos (`/notificacoes ...`).

