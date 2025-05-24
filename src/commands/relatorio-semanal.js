const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { gerarRelatorioSemanal } = require("../services/notificacaoService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("relatorio-semanal")
        .setDescription("Gera e envia o relatório semanal comparativo para o canal de gerência.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) // Permissão inicial, refinar com cargo
        .setDMPermission(false),

    async execute(interaction) {
        // Verificação de cargo de gerência
        const cargoGerenciaId = process.env.CARGO_GERENCIA_ID;
        if (!cargoGerenciaId || !interaction.member.roles.cache.has(cargoGerenciaId)) {
            return interaction.reply({
                content: "❌ Apenas gerentes podem usar este comando!",
                ephemeral: true
            });
        }

        try {
            await interaction.deferReply({ ephemeral: true });
            
            // Chama a função do serviço de notificação
            await gerarRelatorioSemanal(interaction.client, interaction);
            
            // A função gerarRelatorioSemanal já envia a confirmação
            // await interaction.editReply({ content: "Relatório semanal gerado e enviado para o canal de notificações." });

        } catch (error) {
            console.error("Erro no comando /relatorio-semanal:", error);
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: "❌ Ocorreu um erro ao gerar o relatório semanal.", ephemeral: true });
            } else {
                await interaction.reply({ content: "❌ Ocorreu um erro ao gerar o relatório semanal.", ephemeral: true });
            }
        }
    }
};

