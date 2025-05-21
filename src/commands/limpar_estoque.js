// src/commands/limpar_estoque.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Estoque = require('../models/Estoque');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('limpar_estoque')
    .setDescription('🔐 [GERÊNCIA] Zera todas as quantidades do estoque')
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('confirmacao')
        .setDescription('Digite "CONFIRMAR" para executar')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      // 1. Verificação de cargo
      if (!interaction.member.roles.cache.has(process.env.CARGO_GERENCIA_ID)) {
        return interaction.reply({
          content: '❌ Apenas a Gerência pode executar este comando!',
          ephemeral: true
        });
      }

      // 2. Confirmação explícita
      const confirmacao = interaction.options.getString('confirmacao');
      if (confirmacao !== 'CONFIRMAR') {
        return interaction.reply({
          content: '❌ Comando cancelado. Digite "CONFIRMAR" para confirmar.',
          ephemeral: true
        });
      }

      // 3. Zerar estoque (preservando itens/histórico)
      const resultado = await Estoque.updateMany(
        {},
        { $set: { quantidade: 0 } }
      );

      // 4. Log e embed de confirmação
      console.log(`[LIMPEZA] Estoque zerado por ${interaction.user.tag}`);
      const embed = new EmbedBuilder()
        .setColor('#FF5555')
        .setTitle('♻️ ESTOQUE ZERADO')
        .setDescription(`**${resultado.modifiedCount} itens** resetados para 0 unidades`)
        .addFields({
          name: '📌 Aviso',
          value: 'Histórico e metas NÃO foram afetados',
          inline: false
        })
        .setFooter({ text: `Executado por: ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Erro ao limpar estoque:', error);
      await interaction.reply({
        content: '❌ Falha no sistema. Notifique o desenvolvedor.',
        ephemeral: true
      });
    }
  }
};