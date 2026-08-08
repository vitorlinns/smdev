# smdev

Um servidor SMTP fake + UI web pra testar fluxos de email (confirmação de conta, código OTP, etc) 100% local, sem precisar de API key, internet ou serviço tipo Resend/Mailtrap.

Qualquer email enviado via SMTP pra essa ferramenta é capturado (não é entregue de verdade) e fica disponível numa caixa de entrada web, com detecção automática de código de confirmação (regex de 4 a 8 dígitos).

## Rodando com Docker (recomendado)

O `docker-compose.yml` usa uma rede externa chamada `mailnet`, pra permitir que outros projetos (também em Docker) consigam falar com esse serviço pelo nome. Crie a rede uma vez (só precisa fazer isso uma vez por máquina):

```bash
docker network create mailnet
```

Depois suba o serviço normalmente:

```bash
docker compose up
```

Isso sobe:
- **SMTP** em `localhost:1025` (sem autenticação, sem TLS)
- **Web UI + API** em `http://localhost:8025`

Se seu projeto de cadastro **não** roda em Docker (roda direto na sua máquina), é só apontar pra `localhost:1025` (sem usuário/senha) e abrir `http://localhost:8025` pra ver os emails chegando.

## Testando com outro projeto que também roda em Docker

Se o sistema que você quer testar (ex: cadastro com envio de código) também sobe via `docker compose`, `localhost` não funciona de container pra container — os dois containers precisam estar na mesma rede Docker e falar pelo nome do serviço.

No `docker-compose.yml` do **outro projeto**, adicione a mesma rede externa e configure o SMTP pra apontar pro nome do serviço (`smdev`), não `localhost`:

```yaml
services:
  app: # seu serviço de backend
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

Como a rede é externa e compartilhada, não importa em qual `docker-compose.yml` cada serviço foi definido — ambos enxergam um ao outro pelo nome do serviço assim que estão na mesma rede `mailnet`. A UI continua acessível em `http://localhost:8025` pela porta mapeada pro host, independente de onde o app estiver rodando.

## Rodando local sem Docker

O projeto é escrito em TypeScript (backend e frontend). Compile antes de rodar:

```bash
npm install
npm run build
npm start
```

`npm run build` compila o backend com `tsc` e empacota o frontend com `esbuild` em `dist/`; `npm start` roda `dist/index.js`. Pra só checar os tipos sem gerar build, use `npm run typecheck`.

Portas padrão: `SMTP_PORT=1025`, `HTTP_PORT=8025` (dá pra sobrescrever via variável de ambiente).

## Exemplo de configuração (Nodemailer)

```js
const transporter = nodemailer.createTransport({
  host: 'localhost',
  port: 1025,
  secure: false,
});
```

## API

- `GET /api/messages` — lista os emails (resumo)
- `GET /api/messages/:id` — detalhe completo (texto, html, headers, código detectado)
- `DELETE /api/messages/:id` — remove um email
- `DELETE /api/messages` — limpa a caixa inteira
