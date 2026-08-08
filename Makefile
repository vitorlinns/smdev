.DEFAULT_GOAL := help

.PHONY: help install build start typecheck network up down restart logs build-image clean

help: ## Lista os comandos disponíveis
	@echo "Comandos disponíveis:"
	@echo "  make install      instala as dependências (npm install)"
	@echo "  make build        compila backend (tsc) e frontend (esbuild)"
	@echo "  make start        roda localmente, sem Docker (node dist/index.js)"
	@echo "  make typecheck    checa os tipos sem gerar build"
	@echo ""
	@echo "  make up           cria a rede mailnet (se precisar) e sobe via Docker Compose"
	@echo "  make down         para e remove o container"
	@echo "  make restart      down + up"
	@echo "  make logs         acompanha os logs do container"
	@echo "  make build-image  rebuilda a imagem Docker sem subir"
	@echo ""
	@echo "  make clean        remove dist/"

install: ## Instala as dependências
	npm install

build: ## Compila backend e frontend
	npm run build

start: ## Roda localmente (sem Docker)
	npm start

typecheck: ## Checa os tipos sem gerar build
	npm run typecheck

network: ## Cria a rede Docker externa mailnet, se ainda não existir
	@docker network inspect mailnet >/dev/null 2>&1 || docker network create mailnet

up: network ## Sobe o smdev via Docker Compose (cria a rede antes, se precisar)
	docker compose up -d --build

down: ## Para e remove o container
	docker compose down

restart: down up ## Reinicia o container

logs: ## Acompanha os logs do container
	docker compose logs -f

build-image: ## Rebuilda a imagem Docker sem subir o container
	docker compose build

clean: ## Remove os artefatos de build (dist/)
	rm -rf dist
