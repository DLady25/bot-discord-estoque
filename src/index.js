// Modificação do arquivo index.js para integrar validação de entrada
// nos handlers de entrada e saída

require("dotenv").config();
const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits
} = require("discord.js");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Estoque = require("./models/Estoque");
const { setTimeout } = require("timers/promises");
const { atualizarMetricas } = require("./utils/metricasHelper");
const { CORES, EMOJIS, TEXTOS } = require("./utils/visualHelper");
const { validarQuantidade } = require("./utils/validacaoHelper");
const cron = require("node-cron"); // Importar node-cron
const { 
    enviarLembretesMetasNaoAtingidas, 
    enviarAlertasBaixoDesempenho,
    gerarResumoDiario, // Função para chamada automática
    gerarRelatorioSemanal // Função para chamada automática
} = require("./services/notificacaoService"); // Importar funções de notificação agendada

// Configuração única do Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  retryLimit: 5,
  restRequestTimeout: 30000,
  shards: "auto"
});

// Sistema de reconexão
let isReconnecting = false;

// Carregar comandos
client.commands = new Map();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath)
  .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

// Configurações
const CARGO_GERENCIA_ID = process.env.CARGO_GERENCIA_ID;
const CANAL_NOTIFICACOES_ID = process.env.CANAL_NOTIFICACOES_ID;

// ==============================================
// FUNÇÕES AUXILIARES
// ==============================================

async function withRetry(operation, maxRetries = 3, delayMs = 100) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await setTimeout(delayMs);
      }
    }
  }
  throw lastError;
}

async function atualizarEstoque(item, quantidade, usuario, acao, interaction) {
  return await withRetry(async () => {
    const update = {
      $inc: { quantidade: acao === "entrada" ? quantidade : -quantidade },
      $push: {
        historico: {
          usuarioId: usuario.id,
          usuarioNome: usuario.username,
          acao,
          quantidade,
          data: new Date()
        }
      },
      $set: {
        dataAtualizacao: new Date()
      }
    };

    const resultado = await Estoque.findOneAndUpdate(
      { item },
      update,
      { upsert: true, new: true }
    );

    // Integração com o helper de métricas para garantir atualização consistente
    await atualizarMetricas(client, item, usuario, quantidade, acao, interaction); // Passar client para metricasHelper

    return resultado;
  });
}

// ==============================================
// HANDLERS DE ENTRADA E SAÍDA
// ==============================================

async function handleEntrada(interaction) {
  try {
    await interaction.update({
      content: `${EMOJIS.SUCESSO} Item selecionado: ${interaction.values[0]}. Digite a quantidade:`,
      components: [],
      ephemeral: true
    });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ 
      filter, 
      time: 60000,
      max: 1 
    });

    collector.on("collect", async m => {
      // Validar quantidade usando o helper de validação
      const quantidadeValidacao = validarQuantidade(m.content);
      
      if (!quantidadeValidacao.valido) {
        return interaction.followUp({
          content: `${EMOJIS.ERRO} ${quantidadeValidacao.mensagem}`,
          ephemeral: true
        });
      }
      
      const quantidade = quantidadeValidacao.valor;

      try {
        const resultadoEstoque = await atualizarEstoque(
          interaction.values[0], 
          quantidade, 
          interaction.user,
          "entrada",
          interaction
        );

        const embed = new EmbedBuilder()
          .setColor(CORES.SUCESSO)
          .setTitle(`${EMOJIS.SUCESSO} Entrada Registrada`)
          .setDescription(`**${quantidade} ${interaction.values[0]}** adicionados com sucesso!`)
          .addFields({
            name: "Estoque Atual",
            value: `${resultadoEstoque.quantidade}`,
            inline: true
          });

        await interaction.followUp({
          embeds: [embed],
          ephemeral: true
        });

      } catch (error) {
        console.error("Erro ao processar entrada:", error);
        await interaction.followUp({
          content: `${EMOJIS.ERRO} ${TEXTOS.ERRO_GENERICO}`,
          ephemeral: true
        });
      }
    });

    collector.on("end", collected => {
      if (collected.size === 0) {
        interaction.followUp({
          content: `${EMOJIS.TEMPO} ${TEXTOS.TEMPO_ESGOTADO}`,
          ephemeral: true
        });
      }
    });
  } catch (error) {
    console.error("Erro no handler de entrada:", error);
    // Não usar followUp aqui pois interaction pode ter sido respondida ou deferida
  }
}

async function handleSaida(interaction) {
  try {
    await interaction.update({
      content: `${EMOJIS.SUCESSO} Item selecionado: ${interaction.values[0]}. Digite a quantidade para saída:`,
      components: [],
      ephemeral: true
    });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ 
      filter, 
      time: 60000,
      max: 1 
    });

    collector.on("collect", async m => {
      // Validar quantidade usando o helper de validação
      const quantidadeValidacao = validarQuantidade(m.content);
      
      if (!quantidadeValidacao.valido) {
        return interaction.followUp({
          content: `${EMOJIS.ERRO} ${quantidadeValidacao.mensagem}`,
          ephemeral: true
        });
      }
      
      const quantidade = quantidadeValidacao.valor;

      try {
        const itemEstoque = await Estoque.findOne({ item: interaction.values[0] });
        const estoqueAtual = itemEstoque?.quantidade || 0;
        
        if (estoqueAtual < quantidade) {
          return interaction.followUp({
            content: `${EMOJIS.ERRO} Estoque insuficiente! Disponível: ${estoqueAtual}`,
            ephemeral: true
          });
        }

        const resultado = await atualizarEstoque(
          interaction.values[0],
          quantidade,
          interaction.user,
          "saída",
          interaction
        );

        const embed = new EmbedBuilder()
          .setColor(CORES.ALERTA)
          .setTitle(`${EMOJIS.SUCESSO} Saída Registrada`)
          .setDescription(`**${quantidade} ${interaction.values[0]}** removidos do estoque!`)
          .addFields(
            {
              name: "Estoque Atual",
              value: `${resultado.quantidade}`,
              inline: true
            },
            {
              name: "Registrado por",
              value: interaction.user.username,
              inline: true
            }
          );

        await interaction.followUp({
          embeds: [embed],
          ephemeral: true
        });

      } catch (error) {
        console.error("Erro ao processar saída:", error);
        await interaction.followUp({
          content: `${EMOJIS.ERRO} ${TEXTOS.ERRO_GENERICO}`,
          ephemeral: true
        });
      }
    });

    collector.on("end", collected => {
      if (collected.size === 0) {
        interaction.followUp({
          content: `${EMOJIS.TEMPO} ${TEXTOS.TEMPO_ESGOTADO}`,
          ephemeral: true
        });
      }
    });
  } catch (error) {
    console.error("Erro no handler de saída:", error);
     // Não usar followUp aqui pois interaction pode ter sido respondida ou deferida
  }
}

// ==============================================
// EVENTOS DO BOT
// ==============================================

client.on("ready", async () => {
  console.log(`${EMOJIS.STATUS} Bot online como ${client.user.tag}`);
  await Estoque.syncIndexes();
  console.log(`${EMOJIS.SUCESSO} Índices sincronizados`);

  // Configuração das Tarefas Agendadas (node-cron)
  console.log("[Agendador] Configurando tarefas...");
  const timezone = "America/Sao_Paulo"; // Defina seu fuso horário

  // Lembrete diário e Alerta de baixo desempenho diário às 23:50
  cron.schedule("50 23 * * *", () => {
      console.log("[Agendador] Executando tarefas diárias (Lembretes e Baixo Desempenho).");
      enviarLembretesMetasNaoAtingidas(client, "diario");
      enviarAlertasBaixoDesempenho(client, "diario");
  }, { scheduled: true, timezone: timezone });

  // Lembrete semanal, Alerta de baixo desempenho semanal e Relatório semanal aos Domingos às 23:55
  cron.schedule("55 23 * * 0", () => { // 0 = Domingo
      console.log("[Agendador] Executando tarefas semanais (Lembretes, Baixo Desempenho e Relatório).");
      enviarLembretesMetasNaoAtingidas(client, "semanal");
      enviarAlertasBaixoDesempenho(client, "semanal");
      gerarRelatorioSemanal(client); // Chamada automática
  }, { scheduled: true, timezone: timezone });
  
  // Resumo diário automático às 23:58
  cron.schedule("58 23 * * *", () => {
      console.log("[Agendador] Executando tarefa diária (Resumo Automático).");
      gerarResumoDiario(client); // Chamada automática
  }, { scheduled: true, timezone: timezone });

  console.log(`[Agendador] Tarefas configuradas para o fuso horário: ${timezone}`);

  // Keep-alive para Render/Heroku
  if (process.env.NODE_ENV === "production") {
    const http = require("http");
    const server = http.createServer((req, res) => {
      res.writeHead(200);
      res.end("Bot online");
    }).listen(process.env.PORT || 3000);
    
    setInterval(() => {
      if (client.isReady()) {
        console.log("[Keep-Alive] Enviando ping...");
        fetch(`http://localhost:${process.env.PORT || 3000}`).catch(() => {});
      }
    }, 5 * 60 * 1000);
  }
});

client.on("interactionCreate", async interaction => {
  // Tratamento de Comandos
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, client); // Passar client para comandos que precisam
    } catch (error) {
      console.error("Erro ao executar comando:", error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: `${EMOJIS.ERRO} ${TEXTOS.ERRO_GENERICO}`, ephemeral: true });
      } else {
        await interaction.reply({ content: `${EMOJIS.ERRO} ${TEXTOS.ERRO_GENERICO}`, ephemeral: true });
      }
    }
  }

  // Tratamento de Menus
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "entrada_item") {
      await handleEntrada(interaction);
    } else if (interaction.customId === "saida_item") {
      await handleSaida(interaction);
    }
    // Adicionar outros customIds de menus aqui se necessário
  }
  
  // Tratamento de Modals (Ex: /notificacoes configurar)
  if (interaction.isModalSubmit()) {
      const command = client.commands.get(interaction.customId.split("_")[0]); // Assumindo que customId começa com nome do comando
      if (command && command.handleModal) {
          try {
              await command.handleModal(interaction, client);
          } catch (error) {
              console.error("Erro ao processar modal:", error);
              await interaction.reply({ content: `${EMOJIS.ERRO} ${TEXTOS.ERRO_GENERICO}`, ephemeral: true });
          }
      }
  }

  // Tratamento de Autocomplete
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (!command || !command.autocomplete) return;

    try {
      await command.autocomplete(interaction, client);
    } catch (error) {
      console.error("Erro no autocomplete:", error);
    }
  }
});


// ==============================================
// INICIALIZAÇÃO
// ==============================================

async function initializeBot() {
  try {
    // Conexão com MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      retryWrites: true,
      w: "majority"
    });
    console.log(`${EMOJIS.SUCESSO} Conectado ao MongoDB`);

    // Login do bot Discord
    await client.login(process.env.TOKEN);
    
  } catch (error) {
    console.error(`${EMOJIS.ERRO} Falha na inicialização:`, error);
    if (!isReconnecting) {
      isReconnecting = true;
      console.log("Tentando reconectar em 10 segundos...");
      setTimeout(initializeBot, 10000);
    }
  }
}

// Iniciar o bot
initializeBot();

// Tratamento de erros globais
process.on("unhandledRejection", error => {
  console.error("Erro não tratado (unhandledRejection):", error);
});

process.on("uncaughtException", error => {
  console.error("Exceção não capturada (uncaughtException):", error);
  // Considerar encerrar o processo em caso de exceções não capturadas graves
  // process.exit(1);
});

