const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Estoque = require('../models/Estoque');
const { CORES, EMOJIS, TEXTOS, formatarNomeItem } = require('../utils/visualHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ver')
    .setDescription('Mostra o estoque atual de todos os itens')
    .addStringOption(option =>
      option.setName('categoria')
        .setDescription('Filtrar por categoria específica')
        .setRequired(false)),
        
  async execute(interaction) {
    try {
      const categoriaFiltro = interaction.options.getString('categoria')?.toLowerCase().trim();
      
      // Filtro condicional baseado na categoria (se fornecida)
      const filtro = categoriaFiltro ? { ativo: true, categoria: categoriaFiltro } : { ativo: true };
      
      // Buscar itens ativos no estoque
      const itens = await Estoque.find(filtro).sort({ categoria: 1, item: 1 });
      
      if (itens.length === 0) {
        return await interaction.reply({
          content: categoriaFiltro 
            ? `${EMOJIS.ERRO} Não há itens cadastrados na categoria "${categoriaFiltro}".`
            : TEXTOS.SEM_ITENS,
          ephemeral: true
        });
      }

      // Agrupar itens por categoria
      const itensPorCategoria = {};
      itens.forEach(item => {
        if (!itensPorCategoria[item.categoria]) {
          itensPorCategoria[item.categoria] = [];
        }
        itensPorCategoria[item.categoria].push({
          nome: item.item,
          quantidade: item.quantidade,
          descricao: item.descricao
        });
      });
      
      // Criar embed com os itens agrupados por categoria
      const embed = new EmbedBuilder()
        .setColor(CORES.INFO)
        .setTitle(`${EMOJIS.ESTOQUE} Estoque Atual`)
        .setDescription(categoriaFiltro 
          ? `Mostrando itens da categoria: **${categoriaFiltro}**`
          : 'Mostrando todos os itens disponíveis')
        .setTimestamp();

      // Adicionar campos para cada categoria
      Object.keys(itensPorCategoria).sort().forEach(categoria => {
        let listaItens = '';
        itensPorCategoria[categoria].forEach(item => {
          listaItens += `**${formatarNomeItem(item.nome)}**: ${item.quantidade}\n`;
        });
        
        embed.addFields({
          name: `📂 ${categoria.toUpperCase()}`,
          value: listaItens,
          inline: false
        });
      });

      // Adicionar rodapé com total de itens
      embed.setFooter({ 
        text: `Total: ${itens.length} ${itens.length === 1 ? 'item' : 'itens'} em estoque` 
      });

      await interaction.reply({
        embeds: [embed],
        ephemeral: false
      });
      
    } catch (error) {
      console.error('Erro ao listar estoque:', error);
      await interaction.reply({
        content: `${EMOJIS.ERRO} ${TEXTOS.ERRO_GENERICO}`,
        ephemeral: true
      });
    }
  }
};
