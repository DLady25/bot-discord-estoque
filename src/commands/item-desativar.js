const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Estoque = require('../models/Estoque');
const { CORES, EMOJIS, TEXTOS, formatarNomeItem } = require('../utils/visualHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('item-desativar')
    .setDescription('Desativa um item do sistema (sem remover do banco)')
    .addStringOption(option =>
      option.setName('item')
        .setDescription('Nome do item para desativar')
        .setRequired(true)
        .setAutocomplete(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.MANAGE_GUILD),
        
  async execute(interaction) {
    try {
      const itemNome = interaction.options.getString('item').toLowerCase().trim();
      
      // Buscar o item no estoque
      const item = await Estoque.findOne({ item: itemNome });
      
      if (!item) {
        return await interaction.reply({
          content: `${EMOJIS.ERRO} Item "${itemNome}" não encontrado no sistema.`,
          ephemeral: true
        });
      }

      if (!item.ativo) {
        return await interaction.reply({
          content: `${EMOJIS.ALERTA} O item "${formatarNomeItem(itemNome)}" já está desativado.`,
          ephemeral: true
        });
      }

      // Desativar o item
      item.ativo = false;
      item.dataAtualizacao = new Date();
      await item.save();

      const embed = new EmbedBuilder()
        .setColor(CORES.ALERTA)
        .setTitle(`${EMOJIS.DESATIVAR} Item Desativado`)
        .setDescription(`O item **${formatarNomeItem(itemNome)}** foi desativado com sucesso!`)
        .addFields(
          {
            name: 'Quantidade Atual',
            value: `${item.quantidade}`,
            inline: true
          },
          {
            name: 'Categoria',
            value: item.categoria || 'Não definida',
            inline: true
          }
        )
        .setFooter({ text: `Desativado por ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: false
      });
      
    } catch (error) {
      console.error('Erro ao desativar item:', error);
      await interaction.reply({
        content: `${EMOJIS.ERRO} ${TEXTOS.ERRO_GENERICO}`,
        ephemeral: true
      });
    }
  }
};
