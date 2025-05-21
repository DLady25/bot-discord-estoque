const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Estoque = require('../models/Estoque');
const { CORES, EMOJIS, TEXTOS, formatarNomeItem } = require('../utils/visualHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('retirar')
    .setDescription('Retira quantidade de itens do estoque'),
        
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
        itensPorCategoria[item.categoria].push({
          nome: item.item,
          quantidade: item.quantidade
        });
      });
      
      // Criar opções para o menu de seleção
      const options = [];
      Object.keys(itensPorCategoria).sort().forEach(categoria => {
        itensPorCategoria[categoria].sort((a, b) => a.nome.localeCompare(b.nome)).forEach(item => {
          options.push({
            label: formatarNomeItem(item.nome),
            description: `Disponível: ${item.quantidade} | Categoria: ${categoria}`,
            value: item.nome
          });
        });
      });

      const row = new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('saida_item')
            .setPlaceholder('Selecione um item')
            .addOptions(options)
        );

      const embed = new EmbedBuilder()
        .setColor(CORES.ALERTA)
        .setTitle(`${EMOJIS.SAIDA} Saída de Itens`)
        .setDescription('Selecione o item que deseja retirar do estoque:')
        .setFooter({ text: TEXTOS.RODAPE_TEMPO });

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
      
    } catch (error) {
      console.error('Erro ao listar itens para saída:', error);
      await interaction.reply({
        content: `${EMOJIS.ERRO} ${TEXTOS.ERRO_GENERICO}`,
        ephemeral: true
      });
    }
  }
};
