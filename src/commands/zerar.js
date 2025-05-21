const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Estoque = require('../models/Estoque');
const { CORES, EMOJIS, TEXTOS, formatarNomeItem } = require('../utils/visualHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zerar')
    .setDescription('Zera o estoque de um item específico')
    .addStringOption(option =>
      option.setName('item')
        .setDescription('Nome do item para zerar')
        .setRequired(true)
        .setAutocomplete(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.MANAGE_GUILD),
        
  async execute(interaction) {
    try {
      const itemNome = interaction.options.getString('item').toLowerCase().trim();
      
      // Buscar o item no estoque
      const item = await Estoque.findOne({ item: itemNome, ativo: true });
      
      if (!item) {
        return await interaction.reply({
          content: `${EMOJIS.ERRO} Item "${itemNome}" não encontrado no estoque ou está inativo.`,
          ephemeral: true
        });
      }

      // Guardar a quantidade anterior para o histórico
      const quantidadeAnterior = item.quantidade;
      
      if (quantidadeAnterior === 0) {
        return await interaction.reply({
          content: `${EMOJIS.ALERTA} O estoque de "${formatarNomeItem(itemNome)}" já está zerado.`,
          ephemeral: true
        });
      }

      // Zerar o estoque e registrar no histórico
      item.quantidade = 0;
      item.dataAtualizacao = new Date();
      
      // Adicionar ao histórico se havia quantidade
      if (quantidadeAnterior > 0) {
        item.historico.push({
          usuarioId: interaction.user.id,
          usuarioNome: interaction.user.username,
          acao: 'saída',
          quantidade: quantidadeAnterior,
          data: new Date()
        });
      }
      
      await item.save();

      const embed = new EmbedBuilder()
        .setColor(CORES.ALERTA)
        .setTitle(`${EMOJIS.ZERAR} Estoque Zerado`)
        .setDescription(`O estoque de **${formatarNomeItem(itemNome)}** foi zerado com sucesso!`)
        .addFields(
          {
            name: 'Quantidade Anterior',
            value: `${quantidadeAnterior}`,
            inline: true
          },
          {
            name: 'Quantidade Atual',
            value: '0',
            inline: true
          }
        )
        .setFooter({ text: `Zerado por ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: false
      });
      
    } catch (error) {
      console.error('Erro ao zerar estoque:', error);
      await interaction.reply({
        content: `${EMOJIS.ERRO} ${TEXTOS.ERRO_GENERICO}`,
        ephemeral: true
      });
    }
  }
};
