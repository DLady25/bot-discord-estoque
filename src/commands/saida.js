// src/commands/saida.js
const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const Estoque = require('../models/Estoque');

const ITENS_DISPONIVEIS = ['ópio', 'éter', 'metileno', 'plástico'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('saida')
    .setDescription('Registra saída de itens do estoque (Apenas Gerência/Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Opcional: só aparece para admins
    .setDMPermission(false),
    
  async execute(interaction) {
    // Verifica cargos permitidos
    const cargosPermitidos = [
      process.env.CARGO_GERENCIA_ID, 
      process.env.CARGO_ADMIN_ID
    ];

    if (!interaction.member.roles.cache.some(role => cargosPermitidos.includes(role.id))) {
      return interaction.reply({
        content: '❌ Apenas membros da gerência/admins podem registrar saídas!',
        ephemeral: true
      });
    }

    try {
      // Restante do código (menu de seleção)...
      const selectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('saida_item')
          .setPlaceholder('Selecione o item')
          .addOptions(
            ITENS_DISPONIVEIS.map(item => ({
              label: item,
              value: item,
              description: `Registrar saída de ${item}`
            }))
      ));

      await interaction.reply({
        content: '📤 Selecione o item para SAÍDA:',
        components: [selectMenu],
        ephemeral: true
      });

    } catch (error) {
      console.error('Erro no comando /saida:', error);
      await interaction.reply({
        content: '❌ Erro ao processar o comando de saída!',
        ephemeral: true
      });
    }
  }
};