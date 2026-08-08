# smdev

Servidor SMTP local e API HTTP para captura de email em ambiente de desenvolvimento, com interface web para inspeção das mensagens.

## Visão geral

O smdev intercepta mensagens enviadas via SMTP pela aplicação em desenvolvimento e as retém localmente, sem entregá-las a um destinatário real. Isso remove a dependência de um provedor externo (Resend, Mailtrap, SendGrid, etc.) e de acesso à internet durante o desenvolvimento e a execução de testes automatizados de fluxos que envolvem envio de email — confirmação de cadastro, recuperação de senha, autenticação por código, entre outros.

As mensagens capturadas ficam disponíveis em uma interface web e em uma API HTTP, com detecção automática de código de verificação (OTP) no corpo do email.

## Funcionalidades

- Servidor SMTP local, sem autenticação nem TLS, compatível com qualquer client SMTP padrão
- Interface web para inspeção das mensagens (lista, detalhe, filtro de não lidas)
- Detecção automática de código de verificação, com heurística de contexto para reduzir falsos positivos
- API HTTP com CORS liberado, incluindo um endpoint dedicado para obter a mensagem mais recente por destinatário — voltado a testes automatizados (e2e)
- Backend e frontend em TypeScript, imagem Docker multi-stage, healthcheck integrado

## Executando com Docker (recomendado)

O jeito mais direto é via `make`, que cria a rede Docker `mailnet` automaticamente (se ainda não existir) e sobe o serviço:

```bash
make up      # sobe (cria a rede mailnet, se necessário)
make logs    # acompanha os logs
make down    # para e remove o container
```

Rode `make help` para ver todos os comandos disponíveis. Sem `make`, os comandos equivalentes são:

```bash
docker network create mailnet   # uma única vez por máquina
docker compose up
```

Isso expõe:
- **SMTP** em `localhost:1025` (sem autenticação, sem TLS)
- **Interface web + API** em `http://localhost:8025`

Para alterar as portas padrão ou outras configurações, copie `.env.example` para `.env` antes de subir o serviço — o `docker-compose.yml` lê essas variáveis automaticamente.

Se a aplicação a ser testada **não** roda em Docker (executa diretamente na máquina), basta apontar o client SMTP para `localhost:1025` (sem usuário/senha) e abrir `http://localhost:8025` para acompanhar as mensagens.

## Executando junto com outro projeto em Docker

Se a aplicação a ser testada também sobe via `docker compose`, `localhost` não resolve de container para container — os dois precisam estar na mesma rede Docker e se comunicar pelo nome do serviço.

No `docker-compose.yml` do **outro projeto**, declare a mesma rede externa e aponte o SMTP para o nome do serviço (`smdev`), não para `localhost`:

```yaml
services:
  app: # serviço de backend da aplicação
    # ...
    environment:
      SMTP_HOST: smdev
      SMTP_PORT: 1025
    networks:
      - mailnet

networks:
  mailnet:
    external: true
```

Como a rede é externa e compartilhada, não importa em qual `docker-compose.yml` cada serviço foi declarado — ambos se enxergam pelo nome assim que estão na rede `mailnet`. A interface web continua acessível em `http://localhost:8025` pela porta mapeada para o host, independentemente de onde a aplicação estiver rodando.

## Executando localmente, sem Docker

O projeto é escrito em TypeScript (backend e frontend) e precisa ser compilado antes de rodar:

```bash
make install build start
# ou, sem make:
npm install
npm run build
npm start
```

`npm run build` compila o backend com `tsc` e empacota o frontend com `esbuild` em `dist/`; `npm start` executa `dist/index.js`. Para checar os tipos sem gerar build, use `npm run typecheck`.

Portas padrão: `SMTP_PORT=1025`, `HTTP_PORT=8025` — configuráveis copiando `.env.example` para `.env`, ou via variável de ambiente.

## Configuração de client SMTP (exemplo com Nodemailer)

```js
const transporter = nodemailer.createTransport({
  host: 'localhost',
  port: 1025,
  secure: false,
});
```

Exemplos equivalentes em Python e PHP estão em [`docs/integration.md`](./docs/integration.md).

## API

- `GET /api/messages` — lista as mensagens (resumo); aceita `?to=<email>` para filtrar por destinatário
- `GET /api/messages/latest?to=<email>` — retorna o detalhe completo da mensagem mais recente enviada a esse destinatário
- `GET /api/messages/:id` — detalhe completo (texto, HTML, headers, código detectado)
- `DELETE /api/messages/:id` — remove uma mensagem
- `DELETE /api/messages` — limpa a caixa inteira

CORS liberado para qualquer origem — a API pode ser chamada diretamente do navegador ou de um runner de testes automatizados. Referência completa em [`docs/api-reference.md`](./docs/api-reference.md).

## Documentação técnica

Para integrar o smdev em outro projeto (variáveis de ambiente, exemplos de configuração SMTP, consumo da API em testes automatizados) e a referência completa da API, veja a pasta [`docs/`](./docs/README.md).

## Licença

Distribuído sob a licença ISC. Veja [LICENSE](./LICENSE).
