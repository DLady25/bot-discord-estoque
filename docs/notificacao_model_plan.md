# Planejamento da Expansão do Modelo de Dados para Notificações

Este documento detalha a expansão proposta para o modelo de dados do bot Discord, visando suportar o sistema avançado de notificações.

## 1. Novos Modelos (Coleções Separadas)

Propõe-se a criação de novas coleções no MongoDB para gerenciar as configurações, o histórico e o estado das notificações de forma escalável e organizada.

### 1.1. `NotificacaoConfigUsuario`

Armazena as preferências de notificação para cada usuário individual.

```javascript
const mongoose = require('mongoose');

const NotificacaoConfigUsuarioSchema = new mongoose.Schema({
  usuarioId: { type: String, required: true, unique: true, index: true },
  notificarMetaDiariaAtingida: { type: Boolean, default: true },
  notificarMetaSemanalAtingida: { type: Boolean, default: true },
  notificarProximidadeMeta: { type: Boolean, default: true },
  limiarProximidadeMeta: { type: Number, default: 80, min: 1, max: 99 }, // Percentual
  notificarMetasNaoAtingidas: { type: Boolean, default: true }, // Para lembretes diários/semanais
  canalPreferencial: { type: String, default: 'DM' } // 'DM' ou ID do canal
}, { timestamps: true });

module.exports = mongoose.model('NotificacaoConfigUsuario', NotificacaoConfigUsuarioSchema);
```

### 1.2. `Notificacao`

Registra cada notificação enviada, seu conteúdo, destinatário, tipo e status de leitura.

```javascript
const mongoose = require('mongoose');

const NotificacaoSchema = new mongoose.Schema({
  destinatarioId: { type: String, required: true, index: true }, // ID do Usuário ou Cargo (para gerentes)
  tipo: {
    type: String,
    required: true,
    enum: [
      'meta_diaria_usuario',
      'meta_semanal_usuario',
      'proximidade_meta_usuario',
      'lembrete_meta_usuario',
      'resumo_diario_gerente',
      'alerta_alto_desempenho_gerente',
      'alerta_baixo_desempenho_gerente',
      'relatorio_semanal_gerente'
    ],
    index: true
  },
  mensagem: { type: String, required: true }, // Conteúdo da notificação
  embed: { type: Object }, // Opcional: Estrutura do Embed do Discord
  dadosRelacionados: { type: Object }, // Opcional: Contexto extra (ex: { itemId: '...', meta: 100, progresso: 85 })
  dataEnvio: { type: Date, default: Date.now, index: true },
  lida: { type: Boolean, default: false, index: true },
  dataLeitura: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Notificacao', NotificacaoSchema);
```

### 1.3. `NotificacaoConfigGerente` (Opcional/Alternativa)

Se as configurações para gerentes forem complexas, pode-se criar um modelo similar ao `NotificacaoConfigUsuario`. Alternativamente, as permissões de cargo e um canal de notificações dedicado (`CANAL_NOTIFICACOES_ID` já existente) podem ser suficientes. Inicialmente, focaremos em usar o canal dedicado e permissões de cargo.

## 2. Integração com Modelos Existentes

Nenhuma modificação direta nos schemas `Estoque`, `MetaUsuarioSchema` ou `MetaCargoSchema` é planejada inicialmente para armazenar dados de *notificação*. A lógica de notificação será acionada com base nas atualizações desses modelos.

## 3. Pontos de Integração e Lógica

*   **Gatilhos:** A lógica de verificação e envio de notificações será acionada principalmente:
    *   Dentro de `utils/metricasHelper.js` (ou função similar) após a atualização do progresso de metas (`progressoDiario`, `progressoSemanal`).
    *   Através de tarefas agendadas (`node-cron` ou similar) para:
        *   Lembretes de metas não atingidas (fim do dia/semana).
        *   Resumos diários para gerentes.
        *   Relatórios semanais para gerentes.
        *   Resetar `progressoDiario` (e talvez `progressoSemanal` dependendo da lógica).
*   **Serviço de Notificação:** Criar um novo módulo (ex: `src/services/notificacaoService.js`) responsável por:
    *   Receber eventos (ex: meta atualizada, fim do dia).
    *   Consultar `NotificacaoConfigUsuario` para verificar preferências.
    *   Formatar mensagens/embeds apropriados para cada tipo de notificação.
    *   Enviar a notificação via DM ou canal especificado usando a API do Discord.
    *   Salvar um registro na coleção `Notificacao`.
*   **Comandos:** Criar novos comandos para:
    *   `/notificacoes configurar`: Permitir que usuários ajustem suas preferências (`NotificacaoConfigUsuario`).
    *   `/notificacoes ver`: Listar notificações não lidas do usuário.
    *   `/notificacoes marcar-lida [id]`: Marcar uma notificação específica como lida.

## 4. Considerações Adicionais

*   **Performance:** Indexar campos chave (`usuarioId`, `destinatarioId`, `tipo`, `dataEnvio`, `lida`) nas novas coleções.
*   **Gerenciamento de Erros:** Implementar tratamento robusto para falhas no envio de notificações ou acesso ao banco de dados.
*   **Escalabilidade:** Usar coleções separadas ajuda a evitar que o documento `Estoque` se torne excessivamente grande.

