# Como integrar o smdev em outro projeto

## Passo 1 — Suba o smdev

Baixe o repositório do smdev (pode ser na raiz do seu projeto, num diretório irmão, ou em qualquer lugar — ele roda como serviço independente) e suba com Docker:

```bash
cd smdev
make up   # cria a rede mailnet automaticamente e sobe o container
```

Sem `make`, o equivalente é `docker network create mailnet` (só uma vez por máquina) seguido de `docker compose up`.

Isso expõe:
- **SMTP** em `localhost:1025` — para onde sua aplicação envia os emails
- **API HTTP + UI** em `http://localhost:8025` — para ler os emails capturados

## Passo 2 — Configure sua aplicação (`.env`)

Adicione no `.env` do **seu** projeto (o que envia os emails):

```bash
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
```

Se seu projeto também usa a API para ler emails em testes automatizados, adicione também:

```bash
SMDEV_API_URL=http://localhost:8025
```

Aponte a configuração de envio de email da sua aplicação (Nodemailer, `smtplib`, PHPMailer, etc.) para essas variáveis, no lugar de um provedor real (Resend, Mailtrap, SendGrid...). Não precisa de usuário, senha, nem TLS.

### Se seu projeto também roda em Docker

`localhost` não funciona de container para container. Os dois serviços precisam estar na mesma rede Docker (`mailnet`) e se falar pelo nome do serviço (`smdev`), não por `localhost`:

```yaml
# docker-compose.yml do seu projeto
services:
  app:
    # ...
    environment:
      SMTP_HOST: smdev
      SMTP_PORT: 1025
      SMDEV_API_URL: http://smdev:8025
    networks:
      - mailnet

networks:
  mailnet:
    external: true
```

A rede é externa e compartilhada — não importa em qual `docker-compose.yml` cada serviço foi declarado, ambos se enxergam pelo nome assim que estão em `mailnet`. A UI continua acessível em `http://localhost:8025` do seu navegador (porta mapeada pro host), independente de onde o app roda.

## Passo 3 — Configure o client SMTP na sua aplicação

### Node.js (Nodemailer)

```js
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
});
```

### Python (`smtplib`)

```python
import smtplib
import os

with smtplib.SMTP(os.environ["SMTP_HOST"], int(os.environ["SMTP_PORT"])) as server:
    server.sendmail(from_addr, to_addr, message)
```

### PHP (PHPMailer)

```php
$mail->isSMTP();
$mail->Host = getenv('SMTP_HOST');
$mail->Port = getenv('SMTP_PORT');
$mail->SMTPAuth = false;
$mail->SMTPAutoTLS = false;
```

## Passo 4 — Consumindo a API em testes automatizados

Para e2e (Playwright, Cypress, etc.) que precisam completar um fluxo de OTP sem um humano abrir a UI: envie o email normalmente pela sua aplicação, depois faça polling na API do smdev até a mensagem aparecer (o envio via SMTP é assíncrono).

```js
async function waitForOtp(toEmail, { timeoutMs = 10000, intervalMs = 500 } = {}) {
  const apiUrl = process.env.SMDEV_API_URL || 'http://localhost:8025';
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${apiUrl}/api/messages/latest?to=${encodeURIComponent(toEmail)}`);
    if (res.ok) {
      const { otp } = await res.json();
      if (otp) return otp;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Nenhum OTP recebido para ${toEmail} em ${timeoutMs}ms`);
}
```

Como a API tem CORS liberado, esse mesmo código funciona rodando direto no navegador (ex: dentro de um teste Playwright que roda no contexto da página), não só server-side.

Detalhes dos endpoints e formato de resposta: veja [`api-reference.md`](./api-reference.md).

### Esperando o smdev estar pronto (`depends_on` + healthcheck)

O `docker-compose.yml` do smdev já expõe um healthcheck (`GET /api/messages`). Se o projeto consumidor também roda em Docker, use `depends_on` com `condition: service_healthy` para garantir que os testes só rodem depois que o smdev estiver de fato aceitando conexões — não só com o container criado:

```yaml
services:
  app:
    # ...
    depends_on:
      smdev:
        condition: service_healthy
    networks:
      - mailnet
```

Isso exige que o serviço `smdev` esteja definido (ou importado via a rede `mailnet`) no mesmo projeto Compose que declara o `depends_on`.

## Variáveis de ambiente do próprio smdev

Essas vão no `.env` **do smdev** (não do projeto consumidor). Copie `.env.example` para `.env` na raiz do smdev e ajuste se precisar — todas têm um padrão, então isso é opcional. Tanto `docker compose up` (via substituição `${VAR}` no `docker-compose.yml`) quanto `npm start` local (via `dotenv`) leem esse `.env` automaticamente.

| Variável | Padrão | Descrição |
|---|---|---|
| `SMTP_PORT` | `1025` | Porta do servidor SMTP local |
| `HTTP_PORT` | `8025` | Porta da API HTTP + UI web |
| `INBOX_MAX_MESSAGES` | `200` | Quantas mensagens manter em memória antes de descartar as mais antigas |

## Limitações a ter em mente

- **Sem persistência**: a caixa vive em memória do processo Node. Reiniciar o container do smdev limpa todos os emails.
- **Sem autenticação**: é uma ferramenta só para ambiente local/dev — não exponha a porta publicamente. O CORS liberado (`*`) reforça isso: não é para rodar em produção ou em rede compartilhada não confiável.
