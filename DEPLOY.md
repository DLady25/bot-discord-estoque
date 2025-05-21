# Guia de Deploy e Manutenção do Bot de Estoque

## Opções de Hospedagem

### Hospedagem Gratuita
- **Render**: Oferece plano gratuito com limitações
- **Railway**: Oferece créditos gratuitos para novos usuários
- **Replit**: Bom para testes e desenvolvimento

### Hospedagem Paga
- **DigitalOcean**: Droplets a partir de $5/mês
- **Heroku**: Planos pagos com mais recursos
- **AWS/GCP/Azure**: Para necessidades mais avançadas

## Instruções de Deploy

### Deploy no Render

1. Crie uma conta no [Render](https://render.com/)
2. Selecione "New Web Service"
3. Conecte ao repositório GitHub
4. Configure:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
   - **Environment Variables**: Adicione todas as variáveis do arquivo `.env`

### Deploy no Railway

1. Crie uma conta no [Railway](https://railway.app/)
2. Crie um novo projeto
3. Selecione "Deploy from GitHub repo"
4. Configure:
   - **Environment Variables**: Adicione todas as variáveis do arquivo `.env`
   - **Start Command**: `node src/index.js`

## Manutenção

### Monitoramento

- Verifique regularmente os logs para identificar erros
- Configure alertas para falhas de conexão
- Monitore o uso de recursos (CPU, memória)

### Backup do Banco de Dados

#### MongoDB Atlas
Se estiver usando MongoDB Atlas:
1. Acesse o painel do Atlas
2. Vá para "Backup"
3. Configure backups automáticos

#### Backup Manual
```bash
# Exportar dados
mongodump --uri="sua_uri_mongodb" --out=./backup

# Importar dados (se necessário)
mongorestore --uri="sua_uri_mongodb" ./backup
```

### Atualizações

1. Teste todas as alterações em ambiente de desenvolvimento
2. Faça backup do banco de dados antes de atualizações importantes
3. Atualize dependências regularmente:
   ```bash
   npm update
   ```
4. Verifique atualizações da API do Discord.js

### Reinicialização Periódica

Para garantir estabilidade, configure reinicializações periódicas:

#### No Render/Railway
Configure o serviço para reiniciar automaticamente a cada 24 horas.

#### Em VPS/Servidor Dedicado
Use o crontab para reiniciar o serviço:
```bash
# Adicione ao crontab (reinicia às 4h da manhã)
0 4 * * * cd /caminho/para/bot && pm2 restart index
```

### Resolução de Problemas Comuns

#### Bot Offline
1. Verifique se o token do bot está correto
2. Verifique os logs para erros
3. Confirme se o bot tem as permissões necessárias no servidor

#### Erros de Conexão com MongoDB
1. Verifique se a URI de conexão está correta
2. Confirme se o IP do servidor está na lista de IPs permitidos
3. Verifique se o usuário tem permissões adequadas

#### Comandos Não Funcionando
1. Verifique se os comandos foram registrados corretamente
2. Confirme se o bot tem as permissões necessárias
3. Verifique os logs para erros específicos

## Escalonamento

Se o bot precisar atender a múltiplos servidores com alto volume:

1. Considere usar sharding do Discord.js
2. Otimize consultas ao banco de dados
3. Migre para uma hospedagem mais robusta
4. Implemente cache para reduzir consultas ao banco

## Contato e Suporte

Para problemas ou dúvidas, entre em contato com o desenvolvedor:
- GitHub: [DLady25](https://github.com/DLady25)
