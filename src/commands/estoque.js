// src/commands/estoque.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Estoque = require('../models/Estoque');

// Itens permitidos para o cargo ESTOQUE
const ITENS_ESTOQUE = ['ópio', 'metileno', 'éter', 'plástico'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('estoque')
    .setDescription('Mostra o estoque atual com diferentes níveis de acesso'),
    
  async execute(interaction) {
    try {
      const isEstoque = interaction.member.roles.cache.has(process.env.CARGO_ESTOQUE_ID);
      const allItems = await Estoque.find({});

      // Filtra itens baseado no cargo
      const itemsToShow = isEstoque 
        ? allItems.filter(item => ITENS_ESTOQUE.includes(item.item))
        : allItems;

      // Cria embed com visualização gráfica
      const embed = new EmbedBuilder()
        .setTitle('📊 Relatório de Estoque')
        .setColor('#0099ff')
        .setTimestamp();

      // Adiciona cada item com barra visual
      itemsToShow.forEach(item => {
        const maxBarLength = 20;
        const barLength = Math.min(Math.round((item.quantidade / 100) * maxBarLength), maxBarLength);
        const progressBar = '▰'.repeat(barLength) + '▱'.repeat(maxBarLength - barLength);
        
        let itemInfo = [
          `**Quantidade:** ${item.quantidade}`,
          `**Barra de Progresso:** ${progressBar}`,
          `**Atualizado:** ${new Date(item.updatedAt).toLocaleString()}`
        ];

        // Mostra histórico apenas para não-ESTOQUE (outros cargos)
        if (!isEstoque && item.historico?.length > 0) {
          const lastEntries = item.historico
            .slice(-3)
            .map(entry => `- ${entry.acao === 'entrada' ? '📥' : '📤'} ${entry.quantidade} (${entry.usuarioNome})`)
            .join('\n');
          
          itemInfo.push(`**Últimas movimentações:**\n${lastEntries}`);
        }

        embed.addFields({
          name: `**${item.item.toUpperCase()}**`,
          value: itemInfo.join('\n'),
          inline: true
        });
      });

      // Adiciona legenda de acesso
      if (isEstoque) {
        embed.setFooter({ text: 'Visão do Time de Estoque - Itens restritos' });
      } else {
        embed.setFooter({ text: 'Visão Completa - Todos os itens' });
      }

      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });

    } catch (error) {
      console.error('Erro no comando /estoque:', error);
      await interaction.reply({
        content: '❌ Erro ao gerar relatório de estoque!',
        ephemeral: true
      });
    }
  }
};