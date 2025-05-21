const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Estoque = require('../models/Estoque');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('full_rollback')
    .setDescription('[ADMIN] Zera todos os estoques e metas (uso emergencial)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('confirmacao')
        .setDescription('Digite "CONFIRMAR" para executar')
        .setRequired(true)),

  async execute(interaction) {
    try {
      const confirmacao = interaction.options.getString('confirmacao');

      // Verificação de segurança
      if (confirmacao !== 'CONFIRMAR') {
        return interaction.reply({
          content: '❌ Rollback cancelado. Digite "CONFIRMAR" para executar.',
          ephemeral: true
        });
      }

      // 1. Primeiro atualiza documentos que já possuem os campos
      const updateResults = await Estoque.bulkWrite([
        {
          updateMany: {
            filter: { quantidade: { $exists: true } },
            update: { $set: { quantidade: 0 } }
          }
        },
        {
          updateMany: {
            filter: { metasUsuarios: { $exists: true } },
            update: {
              $set: {
                'metasUsuarios.$[].progressoDiario': 0,
                'metasUsuarios.$[].progressoSemanal': 0
              }
            }
          }
        },
        {
          updateMany: {
            filter: { metasCargos: { $exists: true } },
            update: {
              $set: {
                'metasCargos.$[].progressoDiario': 0,
                'metasCargos.$[].progressoSemanal': 0
              }
            }
          }
        }
      ]);

      // 2. Atualiza documentos mais antigos que podem não ter os campos
      await Estoque.updateMany(
        {
          $or: [
            { metasUsuarios: { $exists: false } },
            { metasCargos: { $exists: false } }
          ]
        },
        {
          $set: {
            metasUsuarios: [],
            metasCargos: []
          }
        }
      );

      // 3. Cria o embed de resposta
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('⚠️ ROLLBACK COMPLETO')
        .setDescription('Todos os estoques e metas foram resetados!')
        .addFields(
          { name: '📦 Documentos modificados', value: `${updateResults.modifiedCount}`, inline: true },
          { name: '🕒 Executado em', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true }
        )
        .setFooter({ text: `Executado por: ${interaction.user.tag}` });

      await interaction.reply({ embeds: [embed], ephemeral: true });

      // Log no console
      console.log(`[ROLLBACK] Executado por ${interaction.user.tag} em ${new Date().toISOString()}`);

    } catch (error) {
      console.error('Erro no rollback:', error);
      await interaction.reply({
        content: '❌ Erro durante o rollback. Verifique os logs.',
        ephemeral: true
      });
    }
  }
};