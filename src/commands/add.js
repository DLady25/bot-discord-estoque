const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const Estoque = require('../models/Estoque');
const { CORES, EMOJIS, TEXTOS, formatarNomeItem } = require('../utils/visualHelper');
const { validarQuantidade } = require('../utils/validacaoHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Adiciona quantidade de itens ao estoque'),
        
  async execute(interaction) {
    try {
      // Buscar todos os itens ativos no estoque
      const itens = await Estoque.find({ ativo: true }).sort({ categoria: 1, item: 1 });
      
      if (itens.length === 0) {
        return await interaction.reply({
          content: `${EMOJIS.ERRO} ${TEXTOS.SEM_ITENS}`,
          ephemeral: true
        });
      }

      // Agrupar itens por categoria para o menu de seleção
      const itensPorCategoria = {};
      itens.forEach(item => {
        if (!itensPorCategoria[item.categoria]) {
          itensPorCategoria[item.categoria] = [];
        }
        itensPorCategoria[item.categoria].push(item.item);
      });
      
      // Criar opções para o menu de seleção
      const options = [];
      Object.keys(itensPorCategoria).sort().forEach(categoria => {
        itensPorCategoria[categoria].sort().forEach(item => {
          options.push({
            label: formatarNomeItem(item),
            description: `Categoria: ${categoria}`,
            value: item
          });
        });
      });

      const row = new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('entrada_item')
            .setPlaceholder('Selecione um item')
            .addOptions(options)
        );

      const embed = new EmbedBuilder()
        .setColor(CORES.PRIMARIO)
        .setTitle(`${EMOJIS.ENTRADA} Entrada de Itens`)
        .setDescription('Selecione o item que deseja adicionar ao estoque:')
        .setFooter({ text: TEXTOS.RODAPE_TEMPO });

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
      
    } catch (error) {
      console.error('Erro ao listar itens para entrada:', error);
      await interaction.reply({
        content: `${EMOJIS.ERRO} ${TEXTOS.ERRO_GENERICO}`,
        ephemeral: true
      });
    }
  }
};
