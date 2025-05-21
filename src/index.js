// Modificação do arquivo index.js para integrar validação de entrada
// nos handlers de entrada e saída

require('dotenv').config();
const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits
} = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Estoque = require('./models/Estoque');
const { setTimeout } = require('timers/promises');
const { atualizarMetricas } = require('./utils/metricasHelper');
const { CORES, EMOJIS, TEXTOS } = require('./utils/visualHelper');
const { validarQuantidade } = require('./utils/validacaoHelper');

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
  shards: 'auto'
});

// Sistema de reconexão
let isReconnecting = false;

// Carregar comandos
client.commands = new Map();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath)
  .filter(file => file.endsWith('.js'));

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
      $inc: { quantidade: acao === 'entrada' ? quantidade : -quantidade },
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
    await atualizarMetricas(item, usuario, quantidade, acao, interaction);

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

    collector.on('collect', async m => {
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
          'entrada',
          interaction
        );

        const embed = new EmbedBuilder()
          .setColor(CORES.SUCESSO)
          .setTitle(`${EMOJIS.SUCESSO} Entrada Registrada`)
          .setDescription(`**${quantidade} ${interaction.values[0]}** adicionados com sucesso!`)
          .addFields({
            name: 'Estoque Atual',
            value: `${resultadoEstoque.quantidade}`,
            inline: true
          });

        await interaction.followUp({
          embeds: [embed],
          ephemeral: true
        });

      } catch (error) {
        console.error('Erro ao processar entrada:', error);
        await interaction.followUp({
          content: `${EMOJIS.ERRO} ${TEXTOS.ERRO_GENERICO}`,
          ephemeral: true
        });
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.followUp({
          content: `${EMOJIS.TEMPO} ${TEXTOS.TEMPO_ESGOTADO}`,
          ephemeral: true
        });
      }
    });
  } catch (error) {
    console.error('Erro no handler de entrada:', error);
    await interaction.followUp({
      content: `${EMOJIS.ERRO} ${TEXTOS.ERRO_GENERICO}`,
      ephemeral: true
    });
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

    collector.on('collect', async m => {
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
          'saída',
          interaction
        );

        const embed = new EmbedBuilder()
          .setColor(CORES.ALERTA)
          .setTitle(`${EMOJIS.SUCESSO} Saída Registrada`)
          .setDescription(`**${quantidade} ${interaction.values[0]}** removidos do estoque!`)
          .addFields(
            {
              name: 'Estoque Atual',
              value: `${resultado.quantidade}`,
              inline: true
            },
            {
              name: 'Registrado por',
              value: interaction.user.username,
              inline: true
            }
          );

        await interaction.followUp({
          embeds: [embed],
          ephemeral: true
        });

      } catch (error) {
        console.error('Erro ao processar saída:', error);
        await interaction.followUp({
          content: `${EMOJIS.ERRO} ${TEXTOS.ERRO_GENERICO}`,
          ephemeral: true
        });
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.followUp({
          content: `${EMOJIS.TEMPO} ${TEXTOS.TEMPO_ESGOTADO}`,
          ephemeral: true
        });
      }
    });
  } catch (error) {
    console.error('Erro no handler de saída:', error);
    await interaction.followUp({
      content: `${EMOJIS.ERRO} ${TEXTOS.ERRO_GENERICO}`,
      ephemeral: true
    });
  }
}

// ==============================================
// EVENTOS DO BOT
// ==============================================

client.on('ready', async () => {
  console.log(`${EMOJIS.STATUS} Bot online como ${client.user.tag}`);
  await Estoque.syncIndexes();
  console.log(`${EMOJIS.SUCESSO} Índices sincronizados`);

  // Keep-alive para Render/Heroku
  if (process.env.NODE_ENV === 'production') {
    const http = require('http');
    const server = http.createServer((req, res) => {
      res.writeHead(200);
      res.end('Bot online');
    }).listen(process.env.PORT || 3000);
    
    setInterval(() => {
      if (client.isReady()) {
        console.log('[Keep-Alive] Enviando ping...');
        fetch(`http://localhost:${process.env.PORT || 3000}`).catch(() => {});
      }
    }, 5 * 60 * 1000);
  }
});

client.on('interactionCreate', async interaction => {
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ 
        content: `${EMOJIS.ERRO} ${TEXTOS.ERRO_GENERICO}`, 
        ephemeral: true 
      });
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'entrada_item') {
      await handleEntrada(interaction);
    } else if (interaction.customId === 'saida_item') {
      await handleSaida(interaction);
    }
  }
});
client.on('interactionCreate', async interaction => {
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      if (interaction.commandName === 'item-desativar' || 
          interaction.commandName === 'item-ativar' || 
          interaction.commandName === 'zerar' ||
          interaction.commandName === 'ver') {
        
        const focusedValue = interaction.options.getFocused().toLowerCase();
        let itens = [];
        
        // Buscar itens baseado no comando
        if (interaction.commandName === 'item-ativar') {
          // Para ativar, buscamos itens inativos
          itens = await Estoque.find({ 
            ativo: false,
            item: { $regex: focusedValue, $options: 'i' }
          }).limit(25);
        } else {
          // Para outros comandos, buscamos itens ativos
          const filtroAtivo = interaction.commandName === 'item-desativar' ? true : true;
          itens = await Estoque.find({ 
            ativo: filtroAtivo,
            item: { $regex: focusedValue, $options: 'i' }
          }).limit(25);
        }
        
        const choices = itens.map(item => ({
          name: item.item.charAt(0).toUpperCase() + item.item.slice(1),
          value: item.item
        }));
        
        await interaction.respond(choices);
      }
    } catch (error) {
      console.error('Erro no autocomplete:', error);
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
      w: 'majority'
    });
    console.log(`${EMOJIS.SUCESSO} Conectado ao MongoDB`);

    // Login do bot Discord
    await client.login(process.env.TOKEN);
    
  } catch (error) {
    console.error(`${EMOJIS.ERRO} Falha na inicialização:`, error);
    if (!isReconnecting) {
      isReconnecting = true;
      setTimeout(initializeBot, 10000);
    }
  }
}

// Iniciar o bot
initializeBot();

// Tratamento de erros globais
process.on('unhandledRejection', error => {
  console.error('Erro não tratado:', error);
});

process.on('uncaughtException', error => {
  console.error('Exceção não capturada:', error);
});
