# Arquitetura da Aplicação: Servopa Pro Simulator com Firebase

Este documento descreve a arquitetura recomendada para a aplicação, utilizando a plataforma Firebase para criar um sistema moderno, seguro e escalável sem a necessidade de gerenciar um servidor de backend tradicional.

## Componentes da Arquitetura

A solução é baseada em uma arquitetura *serverless*, onde o frontend se comunica diretamente com os serviços do Firebase.

![Arquitetura Firebase](https://i.imgur.com/G4IdyL5.png)

1.  **Frontend (React + Tailwind CSS):**
    *   **O que é:** A interface do usuário que roda no navegador do consultor. É uma Single Page Application (SPA) construída com React.
    *   **Hospedagem:** O frontend compilado (arquivos estáticos HTML, CSS, JS) será hospedado no **Firebase Hosting**. Isso nos dá um CDN global, SSL gratuito e deployment simplificado.

2.  **Firebase Authentication:**
    *   **O que é:** Serviço de gerenciamento de identidade.
    *   **Função:** Lida com o login, logout e gerenciamento de sessão dos usuários. Substitui nosso sistema de login `mock` por um sistema real e seguro. Garante que apenas usuários autenticados possam acessar a aplicação.

3.  **Cloud Firestore (Banco de Dados):**
    *   **O que é:** Um banco de dados NoSQL, flexível e em tempo real.
    *   **Função:** Armazena todos os dados da aplicação, como:
        *   `/user_profiles/{userId}`: Perfis dos usuários com nome, cargo e equipe.
        *   `/simulations/{simulationId}`: Todas as simulações salvas, com seus inputs e outputs.
    *   **Segurança:** O acesso ao Firestore é controlado por **Regras de Segurança**, que são definidas no painel do Firebase. Elas garantem que um consultor não possa ver ou modificar dados de outro, e que um supervisor só veja dados de sua equipe.

4.  **Cloud Functions for Firebase (Backend Lógico):**
    *   **O que é:** Funções JavaScript/TypeScript que rodam em um ambiente gerenciado pelo Google.
    *   **Função Principal (Resolver o Problema do Webhook):** Atua como um intermediário seguro para interações com serviços externos.
        *   **Gatilho (Trigger):** Uma função será configurada para ser executada automaticamente sempre que uma nova simulação for salva na coleção `/simulations` do Firestore.
        *   **Ação:** A função irá ler os dados da nova simulação, formatar o payload exatamente como o Make.com espera, e fazer uma chamada **servidor-para-servidor** para a URL do webhook.
        *   **Benefício:** Como a chamada se origina dos servidores do Google (com IPs estáveis e confiáveis), o Make.com irá aceitá-la, resolvendo o erro "IP address is not valid".

## Fluxo de Geração de PDF (Solução do Webhook)

1.  O **Consultor** clica no botão "Gerar PDF da Proposta" na interface.
2.  A aplicação **React** salva um novo documento na coleção `simulations` do **Firestore**.
3.  O evento de criação (`onCreate`) no Firestore aciona a **Cloud Function** `generatePdfWebhook`.
4.  A **Cloud Function** lê os dados da simulação, formata o payload e envia uma requisição POST segura para o webhook do **Make.com**.
5.  O **Make.com** recebe os dados, gera o PDF e o salva no Google Drive, como já faz hoje.

Esta arquitetura é robusta, segura e aproveita ao máximo as vantagens de um ecossistema serverless, reduzindo drasticamente a complexidade de desenvolvimento e manutenção.
