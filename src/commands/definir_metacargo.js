// src/commands/definir_metacargo.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Estoque = require('../models/Estoque');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('definir_metacargo')
    .setDescription('[ADMIN] Define metas diárias/semanais para um cargo (progresso zera)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('item')
        .setDescription('Item para definir meta')
        .setRequired(true)
        .addChoices(
          { name: 'ópio', value: 'ópio' },
          { name: 'éter', value: 'éter' },
          { name: 'metileno', value: 'metileno' },
          { name: 'plástico', value: 'plástico' }
        )
    )
    .addRoleOption(option =>
      option.setName('cargo')
        .setDescription('Cargo alvo da meta')
        .setRequired(true)
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
    console.log('[LOG] Comando definir_metacargo iniciado');

    try {
      // 1. Verificar permissões
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        console.log('[LOG] Usuário sem permissões:', interaction.user.tag);
        return interaction.reply({
          content: '❌ Você precisa ser administrador para usar este comando!',
          ephemeral: true
        });
      }

      // 2. Coletar dados
      const item = interaction.options.getString('item');
      const cargo = interaction.options.getRole('cargo');
      const metaDiaria = interaction.options.getInteger('diaria');
      const metaSemanal = interaction.options.getInteger('semanal');

      console.log('[LOG] Dados recebidos:', {
        item,
        cargo: cargo.name,
        metaDiaria,
        metaSemanal
      });

      // 3. Validar metas
      if (metaSemanal < metaDiaria) {
        console.log('[LOG] Metas inválidas: semanal < diária');
        return interaction.reply({
          content: '❌ A meta semanal não pode ser menor que a diária!',
          ephemeral: true
        });
      }

      // 4. Remover meta existente (se houver)
      await Estoque.updateOne(
        { item },
        { $pull: { metasCargos: { roleId: cargo.id } } }
      );
      console.log('[LOG] Meta existente removida (se aplicável)');

      // 5. Preparar nova meta (progresso SEMPRE em 0)
      const metaData = {
        roleId: cargo.id,
        roleNome: cargo.name,
        metaDiaria,
        metaSemanal,
        progressoDiario: 0, // Garantido que começa em 0
        progressoSemanal: 0, // Garantido que começa em 0
        ultimaAtualizacao: new Date()
      };

      // 6. Salvar no MongoDB
      const resultado = await Estoque.findOneAndUpdate(
        { item },
        { $push: { metasCargos: metaData } },
        { upsert: true, new: true }
      );
      console.log('[LOG] Banco de dados atualizado:', resultado);

      // 7. Embed de confirmação com aviso de progresso zerado
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Meta de Cargo Atualizada!')
        .setDescription(`Progresso reiniciado para 0%`)
        .addFields(
          { name: '📦 Item', value: item, inline: true },
          { name: '👥 Cargo', value: cargo.toString(), inline: true },
          { name: '🔄 Status', value: 'Progresso zerado', inline: true },
          { name: '📅 Meta Diária', value: metaDiaria.toString(), inline: true },
          { name: '🗓️ Meta Semanal', value: metaSemanal.toString(), inline: true }
        )
        .setFooter({ text: `Definido por: ${interaction.user.username}` });

      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });

      console.log('[LOG] Comando concluído com sucesso');

    } catch (error) {
      console.error('[ERRO CRÍTICO] Falha ao executar comando:', {
        error: error.message,
        stack: error.stack,
        interaction: {
          user: interaction.user?.tag,
          guild: interaction.guild?.name
        }
      });

      await interaction.reply({
        content: '❌ Erro crítico ao definir meta. Verifique os logs.',
        ephemeral: true
      });
    }
  }
};