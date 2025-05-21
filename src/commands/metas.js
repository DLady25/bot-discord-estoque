const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Estoque = require('../models/Estoque');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('metas')
        .setDescription('Consulta metas de usuários/cargos')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false)
        .addMentionableOption(option =>
            option.setName('alvo')
                .setDescription('Usuário ou cargo para consulta')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Item específico')
                .setRequired(true)
                .addChoices(
                    { name: 'Ópio', value: 'ópio' },
                    { name: 'Éter', value: 'éter' },
                    { name: 'Metileno', value: 'metileno' },
                    { name: 'Plástico', value: 'plástico' }
                )
        ),

    async execute(interaction) {
        try {
            // 1. Verificação de Permissão
            const allowedRoles = [process.env.CARGO_ADMIN_ID, process.env.CARGO_GERENCIA_ID];
            if (!interaction.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
                return interaction.reply({
                    content: '❌ Apenas administradores e gerentes podem usar este comando!',
                    ephemeral: true
                });
            }

            const alvo = interaction.options.getMentionable('alvo');
            const item = interaction.options.getString('item');
            const isCargo = alvo.constructor.name === 'Role';
            const campoId = isCargo ? 'metasCargos.roleId' : 'metasUsuarios.usuarioId';

            // 2. Consulta simplificada
            const doc = await Estoque.findOne({
                item,
                [campoId]: alvo.id
            });

            if (!doc) {
                return interaction.reply({
                    content: `❌ Nenhuma meta encontrada para ${isCargo ? 'o cargo' : 'o usuário'} no item ${item}!`,
                    ephemeral: true
                });
            }

            // 3. Extração dos dados de meta
            const metaArray = isCargo ? doc.metasCargos : doc.metasUsuarios;
            const metas = metaArray.find(m => 
                (isCargo ? m.roleId === alvo.id : m.usuarioId === alvo.id)
            );

            if (!metas) {
                return interaction.reply({
                    content: '❌ Configuração de metas inconsistente!',
                    ephemeral: true
                });
            }

            // 4. Cálculos com valores padrão seguros
            const progressoDiario = metas.progressoDiario || 0;
            const metaDiaria = metas.metaDiaria || 1; // Evita divisão por zero
            const progressoSemanal = metas.progressoSemanal || 0;
            const metaSemanal = metas.metaSemanal || 1;

            // 5. Cálculo de porcentagem com tratamento para meta zero
            const porcentagemDiaria = metaDiaria > 0 
                ? Math.round((progressoDiario / metaDiaria) * 100)
                : 0;
            
            const porcentagemSemanal = metaSemanal > 0
                ? Math.round((progressoSemanal / metaSemanal) * 100)
                : 0;

            // 6. Construção do Embed
            const embed = new EmbedBuilder()
                .setColor(getColorForProgress(porcentagemSemanal))
                .setTitle(`📊 METAS DE ${item.toUpperCase()}`)
                .setDescription(`**Alvo:** ${alvo.toString()}`)
                .addFields(
                    {
                        name: '📅 Diária',
                        value: `${progressoDiario}/${metaDiaria} (${porcentagemDiaria}%)`,
                        inline: true
                    },
                    {
                        name: '🗓️ Semanal',
                        value: `${progressoSemanal}/${metaSemanal} (${porcentagemSemanal}%)`,
                        inline: true
                    },
                    {
                        name: '⏱️ Últ. Atualização',
                        value: metas.ultimaAtualizacao 
                            ? `<t:${Math.floor(new Date(metas.ultimaAtualizacao).getTime()/1000)}:R>`
                            : 'Nunca',
                        inline: true
                    }
                );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Erro no /metas:', error);
            await interaction.reply({
                content: '❌ Erro ao consultar metas. Tente novamente ou verifique os logs.',
                ephemeral: true
            });
        }
    }
};

// Função auxiliar para determinar a cor com base no progresso
function getColorForProgress(progress) {
    if (progress >= 100) return '#00FF00'; // Verde
    if (progress >= 75) return '#FFFF00';  // Amarelo
    if (progress >= 50) return '#FFA500';  // Laranja
    return '#FF0000';                      // Vermelho
}