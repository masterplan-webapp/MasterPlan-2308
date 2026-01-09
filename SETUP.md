# Configuração do Ambiente (Setup)

Para rodar este projeto, você precisa do **Node.js** e **npm** instalados no seu computador.

## 1. Verificar Instalação
Abra seu terminal e rode:
```bash
node -v
npm -v
```
Se aparecerem números de versão (ex: `v20.x.x`), você já está pronto. Se der "command not found", siga o passo 2.

## 2. Instalar Node.js (macOS)
A maneira mais simples é baixar o instalador oficial:

1. Acesse **[nodejs.org](https://nodejs.org/)**.
2. Baixe a versão **LTS** (Long Term Support).
3. Execute o instalador (.pkg) e siga as instruções.

> **Nota:** Após instalar, pode ser necessário **fechar e reabrir** seu terminal (ou VS Code) para que o comando `npm` seja reconhecido.

## 3. Instalar Dependências do Projeto
Na pasta do projeto, execute:
```bash
npm install
```

## 4. Rodar o Projeto
Para iniciar o servidor de desenvolvimento:
```bash
npm run dev
```
O app estará disponível em `http://localhost:5173`.
