const mongoose = require("mongoose");

const NotificacaoConfigUsuarioSchema = new mongoose.Schema({
  usuarioId: { type: String, required: true, unique: true, index: true },
  notificarMetaDiariaAtingida: { type: Boolean, default: true },
  notificarMetaSemanalAtingida: { type: Boolean, default: true },
  notificarProximidadeMeta: { type: Boolean, default: true },
  limiarProximidadeMeta: { type: Number, default: 80, min: 1, max: 99 }, // Percentual
  notificarMetasNaoAtingidas: { type: Boolean, default: true }, // Para lembretes diários/semanais
  canalPreferencial: { type: String, default: "DM" } // "DM" ou ID do canal
}, { timestamps: true });

module.exports = mongoose.model("NotificacaoConfigUsuario", NotificacaoConfigUsuarioSchema);

