// firebase/config.ts
//
// INSTRUÇÕES PARA CONFIGURAÇÃO DO FIREBASE:
//
// 1. Acesse o console do Firebase: https://console.firebase.google.com/
// 2. Selecione o seu projeto (ou crie um novo).
// 3. Vá para "Configurações do Projeto" (ícone de engrenagem no canto superior esquerdo).
// 4. Na aba "Geral", role para baixo até a seção "Seus apps".
// 5. Clique no ícone da web (</>) para "Adicionar app".
// 6. Dê um apelido para o seu app (ex: "Simulador Servopa") e clique em "Registrar app".
// 7. O Firebase irá exibir um objeto de configuração `firebaseConfig`.
// 8. Copie os valores desse objeto e cole-os no objeto `firebaseConfig` abaixo,
//    substituindo os valores de exemplo.
//
// =================================================================================
// NÃO FAÇA COMMIT DESTE ARQUIVO COM CHAVES REAIS EM UM REPOSITÓRIO PÚBLICO
// Em um projeto real, use variáveis de ambiente (process.env) para proteger suas chaves.
// =================================================================================

export const firebaseConfig = {
  apiKey: "COLE_SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJECT_ID.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_PROJECT_ID.appspot.com",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID"
};
