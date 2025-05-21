const { SlashCommandBuilder } = require('discord.js');
const Estoque = require('../models/Estoque');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('additem')
    .setDescription('Adiciona um item ao estoque')
    .addStringOption(option =>
      option.setName('item')
        .setDescription('Nome do item')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('quantidade')
        .setDescription('Quantidade a adicionar')
        .setRequired(true)),
        
  async execute(interaction) {
    const item = interaction.options.getString('item');
    const quantidade = interaction.options.getInteger('quantidade');

    try {
      await Estoque.findOneAndUpdate(
        { item },
        { $inc: { quantidade } },
        { upsert: true, new: true }
      );

      await interaction.reply(`✅ ${quantidade} ${item}(s) adicionado(s) ao estoque!`);
    } catch (error) {
      console.error(error);
      await interaction.reply('❌ Erro ao adicionar item!');
    }
  }
};