const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Estoque = require('../models/Estoque');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('definir_metausuario')
    .setDescription('[ADMIN] Define/atualiza metas para um usuário (progresso zera)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuário alvo')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('item')
        .setDescription('Item da meta')
        .setRequired(true)
        .addChoices(
          { name: 'ópio', value: 'ópio' },
          { name: 'éter', value: 'éter' },
          { name: 'metileno', value: 'metileno' },
          { name: 'plástico', value: 'plástico' }
        )
    )
    .addIntegerOption(option =>
      option.setName('diaria')
        .setDescription('Meta diária (unidades)')
        .setRequired(true)
        .setMinValue(1)
    )
    .addIntegerOption(option =>
      option.setName('semanal')
        .setDescription('Meta semanal (unidades)')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    try {
      const usuario = interaction.options.getUser('usuario');
      const item = interaction.options.getString('item');
      const metaDiaria = interaction.options.getInteger('diaria');
      const metaSemanal = interaction.options.getInteger('semanal');

      // Validação reforçada
      if (metaSemanal < metaDiaria) {
        return interaction.reply({
          content: '❌ A meta semanal deve ser ≥ à diária!',
          ephemeral: true
        });
      }

      if (metaSemanal % metaDiaria !== 0) {
        return interaction.reply({
          content: `❌ A meta semanal (${metaSemanal}) deve ser um múltiplo da diária (${metaDiaria})!`,
          ephemeral: true
        });
      }

      // Remove meta existente (se houver)
      await Estoque.updateOne(
        { item },
        { $pull: { metasUsuarios: { usuarioId: usuario.id } } }
      );

      // Adiciona nova meta
      await Estoque.findOneAndUpdate(
        { item },
        {
          $push: {
            metasUsuarios: {
              usuarioId: usuario.id,
              usuarioNome: usuario.username,
              metaDiaria,
              metaSemanal,
              progressoDiario: 0,
              progressoSemanal: 0,
              ultimaAtualizacao: new Date()
            }
          }
        },
        { upsert: true }
      );

      // Embed atualizado
      const embed = new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle('✅ Meta Definida')
        .setDescription(`**${usuario.username}** | ${item}`)
        .addFields(
          { name: '🔄 Progresso', value: 'Reiniciado para 0%', inline: true },
          { name: '📅 Diária', value: `${metaDiaria} un`, inline: true },
          { name: '🗓️ Semanal', value: `${metaSemanal} un`, inline: true },
          { name: '⏰ Última Atualização', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      console.error('Erro ao definir meta:', error);
      await interaction.reply({
        content: '❌ Erro crítico ao atualizar o banco de dados. Verifique os logs.',
        ephemeral: true
      });
    }
  }
};