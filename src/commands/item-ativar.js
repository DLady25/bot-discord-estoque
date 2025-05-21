const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Estoque = require('../models/Estoque');
const { CORES, EMOJIS, TEXTOS, formatarNomeItem } = require('../utils/visualHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('item-ativar')
    .setDescription('Reativa um item previamente desativado')
    .addStringOption(option =>
      option.setName('item')
        .setDescription('Nome do item para reativar')
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

      if (item.ativo) {
        return await interaction.reply({
          content: `${EMOJIS.ALERTA} O item "${formatarNomeItem(itemNome)}" já está ativo.`,
          ephemeral: true
        });
      }

      // Reativar o item
      item.ativo = true;
      item.dataAtualizacao = new Date();
      await item.save();

      const embed = new EmbedBuilder()
        .setColor(CORES.SUCESSO)
        .setTitle(`${EMOJIS.ATIVAR} Item Reativado`)
        .setDescription(`O item **${formatarNomeItem(itemNome)}** foi reativado com sucesso!`)
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
        .setFooter({ text: `Reativado por ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: false
      });
      
    } catch (error) {
      console.error('Erro ao reativar item:', error);
      await interaction.reply({
        content: `${EMOJIS.ERRO} ${TEXTOS.ERRO_GENERICO}`,
        ephemeral: true
      });
    }
  }
};
