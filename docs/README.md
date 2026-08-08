# Documentação técnica — smdev

Índice da documentação técnica do smdev. Para visão geral e quickstart, veja o [README](../README.md) na raiz.

- [`api-reference.md`](./api-reference.md) — referência completa da API HTTP (endpoints, formatos de request/response, exemplos com `curl`).
- [`integration.md`](./integration.md) — como integrar o smdev em outro projeto: variáveis de ambiente, rede Docker, exemplos de configuração SMTP em várias linguagens, e como consumir a API em testes automatizados (E2E).

## Visão geral rápida

O smdev expõe duas superfícies de integração:

1. **SMTP** (`SMTP_PORT`, padrão `1025`) — é aqui que sua aplicação envia os emails. Qualquer client SMTP funciona (Nodemailer, `smtplib`, PHPMailer, etc). Não tem autenticação nem TLS.
2. **API HTTP** (`HTTP_PORT`, padrão `8025`) — é aqui que você lê os emails capturados programaticamente (útil em testes automatizados que precisam pegar um código OTP sem um humano abrir a UI).

A UI web (`http://localhost:8025`) consome essa mesma API HTTP.
