const { SlashCommandBuilder } = require('discord.js');
const mongoose = require('mongoose');

/**
 * Esquema para registrar histórico de operações no estoque
 */
const HistoricoSchema = new mongoose.Schema({
  usuarioId: { type: String, required: true },
  usuarioNome: { type: String, required: true },
  acao: { type: String, enum: ['entrada', 'saída'], required: true },
  quantidade: { type: Number, required: true, min: 1 },
  data: { type: Date, default: Date.now }
}, { _id: false });

/**
 * Esquema para metas individuais de usuários
 */
const MetaUsuarioSchema = new mongoose.Schema({
  usuarioId: { type: String, required: true },
  usuarioNome: { type: String, required: true },
  metaDiaria: { type: Number, default: 0, min: 0 },
  metaSemanal: { type: Number, default: 0, min: 0 },
  progressoDiario: { type: Number, default: 0, min: 0 },
  progressoSemanal: { type: Number, default: 0, min: 0 },
  ultimaAtualizacao: { type: Date, default: Date.now }
}, { _id: false });

/**
 * Esquema para metas de cargos
 */
const MetaCargoSchema = new mongoose.Schema({
  roleId: { type: String, required: true },
  roleNome: { type: String, required: true },
  metaDiaria: { type: Number, default: 0, min: 0 },
  metaSemanal: { type: Number, default: 0, min: 0 },
  progressoDiario: { type: Number, default: 0, min: 0 },
  progressoSemanal: { type: Number, default: 0, min: 0 },
  ultimaAtualizacao: { type: Date, default: Date.now }
}, { _id: false });

/**
 * Esquema principal de estoque
 * Modificado para permitir itens dinâmicos (removida a enumeração fixa)
 */
const EstoqueSchema = new mongoose.Schema({
  item: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  categoria: {
    type: String,
    default: 'geral',
    trim: true,
    lowercase: true
  },
  descricao: {
    type: String,
    default: '',
    trim: true
  },
  ativo: {
    type: Boolean,
    default: true
  },
  quantidade: { type: Number, default: 0, min: 0 },
  historico: [HistoricoSchema],
  metasUsuarios: [MetaUsuarioSchema],
  metasCargos: [MetaCargoSchema],
  dataCriacao: { type: Date, default: Date.now },
  dataAtualizacao: { type: Date, default: Date.now }
});

// Índice para melhorar a performance de buscas por item
EstoqueSchema.index({ item: 1 }, { unique: true });
EstoqueSchema.index({ categoria: 1 });
EstoqueSchema.index({ ativo: 1 });

module.exports = mongoose.model('Estoque', EstoqueSchema);
