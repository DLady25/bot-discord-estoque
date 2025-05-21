// src/commands/entrada.js
const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const Estoque = require('../models/Estoque');

const ITENS_DISPONIVEIS = ['ópio', 'éter', 'metileno', 'plástico'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('entrada')
    .setDescription('Registra entrada de itens no estoque'),
    
  async execute(interaction) {
    try {
      // Menu de seleção (mantido igual)
      const selectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('entrada_item')
          .setPlaceholder('Selecione o item')
          .addOptions(
            ITENS_DISPONIVEIS.map(item => ({
              label: item,
              value: item,
              description: `Registrar entrada de ${item}`
            }))
          ));

      await interaction.reply({
        content: '📥 Selecione o item para ENTRADA:',
        components: [selectMenu],
        ephemeral: true
      });

    } catch (error) {
      console.error('Erro no comando /entrada:', error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ Erro ao processar o comando de entrada!',
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: '❌ Erro ao processar o comando de entrada!',
          ephemeral: true
        });
      }
    }
  }
};