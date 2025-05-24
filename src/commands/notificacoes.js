const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const NotificacaoConfigUsuario = require("../models/NotificacaoConfigUsuario");
const { CORES, EMOJIS } = require("../utils/visualHelper");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("notificacoes")
        .setDescription("Gerencia suas preferências e visualiza notificações.")
        .setDMPermission(true) // Permitir em DMs para conveniência
        .addSubcommand(subcommand =>
            subcommand
                .setName("configurar")
                .setDescription("Ajusta suas preferências de notificação."))
        .addSubcommand(subcommand =>
            subcommand
                .setName("ver")
                .setDescription("Mostra suas notificações não lidas.")
                .addIntegerOption(option => 
                    option.setName("pagina")
                        .setDescription("Número da página a exibir")
                        .setMinValue(1)
                        .setRequired(false)))
         .addSubcommand(subcommand =>
            subcommand
                .setName("marcar-lida")
                .setDescription("Marca notificações como lidas.")
                .addStringOption(option =>
                    option.setName("id")
                        .setDescription("ID da notificação a marcar como lida (ou 'todas')")
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "configurar") {
            await handleConfigurar(interaction);
        } else if (subcommand === "ver") {
            await handleVer(interaction);
        } else if (subcommand === "marcar-lida") {
            await handleMarcarLida(interaction);
        }
    }
};

async function handleConfigurar(interaction) {
    try {
        let config = await NotificacaoConfigUsuario.findOne({ usuarioId: interaction.user.id });
        if (!config) {
            config = new NotificacaoConfigUsuario({ usuarioId: interaction.user.id });
            // Valores padrão já definidos no schema
        }

        const modal = new ModalBuilder()
            .setCustomId(`config_notificacoes_modal_${interaction.user.id}`)
            .setTitle("Configurar Notificações");

        const metaDiariaInput = new TextInputBuilder()
            .setCustomId("notificarMetaDiariaAtingida")
            .setLabel("Meta Diária Atingida (sim/não)")
            .setStyle(TextInputStyle.Short)
            .setValue(config.notificarMetaDiariaAtingida ? 'sim' : 'não')
            .setRequired(true);

        const metaSemanalInput = new TextInputBuilder()
            .setCustomId("notificarMetaSemanalAtingida")
            .setLabel("Meta Semanal Atingida (sim/não)")
            .setStyle(TextInputStyle.Short)
            .setValue(config.notificarMetaSemanalAtingida ? 'sim' : 'não')
            .setRequired(true);

        const proximidadeInput = new TextInputBuilder()
            .setCustomId("notificarProximidadeMeta")
            .setLabel("Alerta Proximidade Meta (sim/não)")
            .setStyle(TextInputStyle.Short)
            .setValue(config.notificarProximidadeMeta ? 'sim' : 'não')
            .setRequired(true);
        
        const limiarInput = new TextInputBuilder()
            .setCustomId("limiarProximidadeMeta")
            .setLabel("Limiar Proximidade (%) Ex: 80")
            .setStyle(TextInputStyle.Short)
            .setValue(config.limiarProximidadeMeta.toString())
            .setRequired(true);

        const lembreteInput = new TextInputBuilder()
            .setCustomId("notificarMetasNaoAtingidas")
            .setLabel("Lembrete Metas Não Atingidas (sim/não)")
            .setStyle(TextInputStyle.Short)
            .setValue(config.notificarMetasNaoAtingidas ? 'sim' : 'não')
            .setRequired(true);

        // Adiciona os inputs ao modal em ActionRows
        modal.addComponents(
            new ActionRowBuilder().addComponents(metaDiariaInput),
            new ActionRowBuilder().addComponents(metaSemanalInput),
            new ActionRowBuilder().addComponents(proximidadeInput),
            new ActionRowBuilder().addComponents(limiarInput),
            new ActionRowBuilder().addComponents(lembreteInput)
        );

        await interaction.showModal(modal);

        // Coletor para o submit do modal
        const filter = (i) => i.customId === `config_notificacoes_modal_${interaction.user.id}` && i.user.id === interaction.user.id;
        
        interaction.awaitModalSubmit({ filter, time: 120_000 })
            .then(async modalInteraction => {
                const getBooleanValue = (id) => modalInteraction.fields.getTextInputValue(id).toLowerCase() === 'sim';
                const getIntValue = (id) => parseInt(modalInteraction.fields.getTextInputValue(id), 10);

                const limiar = getIntValue('limiarProximidadeMeta');
                if (isNaN(limiar) || limiar < 1 || limiar > 99) {
                    return modalInteraction.reply({ content: "❌ Limiar de proximidade inválido. Deve ser um número entre 1 e 99.", ephemeral: true });
                }

                config.notificarMetaDiariaAtingida = getBooleanValue('notificarMetaDiariaAtingida');
                config.notificarMetaSemanalAtingida = getBooleanValue('notificarMetaSemanalAtingida');
                config.notificarProximidadeMeta = getBooleanValue('notificarProximidadeMeta');
                config.limiarProximidadeMeta = limiar;
                config.notificarMetasNaoAtingidas = getBooleanValue('notificarMetasNaoAtingidas');
                // config.canalPreferencial = modalInteraction.fields.getTextInputValue('canalPreferencial'); // Adicionar se necessário

                await config.save();

                await modalInteraction.reply({ content: "✅ Suas preferências de notificação foram salvas!", ephemeral: true });
            })
            .catch(err => {
                // Ocorre se o usuário não submeter o modal a tempo
                console.log("Modal de configuração de notificações expirou ou falhou.", err);
                // Não precisa notificar o usuário aqui, ele simplesmente não submeteu.
            });

    } catch (error) {
        console.error("Erro em /notificacoes configurar:", error);
        await interaction.reply({ content: "❌ Ocorreu um erro ao carregar suas configurações.", ephemeral: true });
    }
}

async function handleVer(interaction) {
    try {
        const pagina = interaction.options.getInteger("pagina") || 1;
        const porPagina = 5; // Quantas notificações por página

        const query = { destinatarioId: interaction.user.id, lida: false };
        const totalNaoLidas = await Notificacao.countDocuments(query);
        const totalPaginas = Math.ceil(totalNaoLidas / porPagina);

        if (totalNaoLidas === 0) {
            return interaction.reply({ content: "Você não tem notificações não lidas.", ephemeral: true });
        }

        if (pagina > totalPaginas) {
             return interaction.reply({ content: `❌ Página inválida. Existem apenas ${totalPaginas} páginas de notificações não lidas.`, ephemeral: true });
        }

        const notificacoes = await Notificacao.find(query)
            .sort({ dataEnvio: -1 })
            .skip((pagina - 1) * porPagina)
            .limit(porPagina);

        const embed = new EmbedBuilder()
            .setColor(CORES.INFO)
            .setTitle(`🔔 Suas Notificações Não Lidas (Página ${pagina}/${totalPaginas})`)
            .setFooter({ text: `Total não lidas: ${totalNaoLidas}` });

        if (notificacoes.length === 0 && pagina === 1) {
             embed.setDescription("Nenhuma notificação não lida encontrada.");
        } else {
            notificacoes.forEach(notif => {
                embed.addFields({
                    name: `(${notif.tipo.replace(/_/g, ' ')}) - <t:${Math.floor(notif.dataEnvio.getTime() / 1000)}:R>`, // Formata tipo e data relativa
                    value: `*ID: ${notif._id}*\n${notif.mensagem.substring(0, 150)}${notif.mensagem.length > 150 ? '...' : ''}` // Mostra ID e preview
                });
            });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error("Erro em /notificacoes ver:", error);
        await interaction.reply({ content: "❌ Ocorreu um erro ao buscar suas notificações.", ephemeral: true });
    }
}

async function handleMarcarLida(interaction) {
    try {
        const idInput = interaction.options.getString("id");

        if (idInput.toLowerCase() === 'todas') {
            const resultado = await Notificacao.updateMany(
                { destinatarioId: interaction.user.id, lida: false },
                { $set: { lida: true, dataLeitura: new Date() } }
            );
            await interaction.reply({ content: `✅ ${resultado.modifiedCount} notificações marcadas como lidas.`, ephemeral: true });
        } else {
            // Valida se é um ObjectId válido do MongoDB
            if (!mongoose.Types.ObjectId.isValid(idInput)) {
                 return interaction.reply({ content: "❌ ID de notificação inválido.", ephemeral: true });
            }
            
            const resultado = await Notificacao.findOneAndUpdate(
                { _id: idInput, destinatarioId: interaction.user.id, lida: false },
                { $set: { lida: true, dataLeitura: new Date() } }
            );

            if (resultado) {
                await interaction.reply({ content: "✅ Notificação marcada como lida.", ephemeral: true });
            } else {
                await interaction.reply({ content: "❌ Notificação não encontrada, já lida ou pertence a outro usuário.", ephemeral: true });
            }
        }
    } catch (error) {
        console.error("Erro em /notificacoes marcar-lida:", error);
        await interaction.reply({ content: "❌ Ocorreu um erro ao marcar a notificação como lida.", ephemeral: true });
    }
}

