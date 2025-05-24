const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { gerarResumoDiario } = require("../services/notificacaoService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("resumo-diario")
        .setDescription("Gera e envia o resumo diário de metas para o canal de gerência.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) // Permissão inicial, pode ser refinada com verificação de cargo
        .setDMPermission(false),

    async execute(interaction) {
        // Verificação de cargo de gerência (ajuste CARGO_GERENCIA_ID no .env)
        const cargoGerenciaId = process.env.CARGO_GERENCIA_ID;
        if (!cargoGerenciaId || !interaction.member.roles.cache.has(cargoGerenciaId)) {
            return interaction.reply({
                content: "❌ Apenas gerentes podem usar este comando!",
                ephemeral: true
            });
        }

        try {
            // Adia a resposta, pois a geração do resumo pode levar um tempo
            await interaction.deferReply({ ephemeral: true });
            
            // Chama a função do serviço de notificação para gerar e enviar o resumo
            await gerarResumoDiario(interaction.client, interaction); 
            
            // Edita a resposta inicial para confirmar o envio
            // A função gerarResumoDiario já envia uma resposta efêmera de confirmação
            // await interaction.editReply({ content: "Resumo diário gerado e enviado para o canal de notificações." });

        } catch (error) {
            console.error("Erro no comando /resumo-diario:", error);
            // Garante que o usuário receba um feedback mesmo em caso de erro
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: "❌ Ocorreu um erro ao gerar o resumo diário.", ephemeral: true });
            } else {
                await interaction.reply({ content: "❌ Ocorreu um erro ao gerar o resumo diário.", ephemeral: true });
            }
        }
    }
};

