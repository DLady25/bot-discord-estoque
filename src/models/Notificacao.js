const mongoose = require("mongoose");

const NotificacaoSchema = new mongoose.Schema({
  destinatarioId: { type: String, required: true, index: true }, // ID do Usuário ou Cargo (para gerentes)
  tipo: {
    type: String,
    required: true,
    enum: [
      "meta_diaria_usuario",
      "meta_semanal_usuario",
      "proximidade_meta_usuario",
      "lembrete_meta_usuario",
      "resumo_diario_gerente",
      "alerta_alto_desempenho_gerente",
      "alerta_baixo_desempenho_gerente",
      "relatorio_semanal_gerente"
    ],
    index: true
  },
  mensagem: { type: String, required: true }, // Conteúdo da notificação
  embed: { type: Object }, // Opcional: Estrutura do Embed do Discord
  dadosRelacionados: { type: Object }, // Opcional: Contexto extra (ex: { itemId: "...", meta: 100, progresso: 85 })
  dataEnvio: { type: Date, default: Date.now, index: true },
  lida: { type: Boolean, default: false, index: true },
  dataLeitura: { type: Date }
}, { timestamps: true });

// Índice composto para consulta eficiente de notificações não lidas por destinatário
NotificacaoSchema.index({ destinatarioId: 1, lida: 1, dataEnvio: -1 });

module.exports = mongoose.model("Notificacao", NotificacaoSchema);

