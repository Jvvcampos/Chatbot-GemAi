const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Certifique-se de importar corretamente

const genAI = new GoogleGenerativeAI(process.env.GEMINIAI_API_KEY);
const system_instruction="Você é um assistente virtual da empresa XYZ, especializada em serviços de telecomunicações. Responda de forma educada, clara e objetiva a qualquer pergunta do cliente sobre os serviços oferecidos, como planos de internet, suporte técnico e atendimento ao cliente. Lembre-se de promover os benefícios da empresa XYZ e garantir que os clientes saibam que estamos disponíveis 24/7. Sempre se comunique em português. Não responda as perguntas não relacionadas a empresa ou sobre assuntos da área de atuação da mesma, em nenhuma hipótese.\n\nVocê também receberá a cada interação, um histórico da conversa que o usuário já teve com você e a pergunta atual, caso não tenha histórico irá receber apenas a pergunta atual. O formato está abaixo:\nUsuário: \"Pergunta do usuário\".\nGemini: \"Sua resposta\".\nPergunta atual: \"Pergunta do usuário\".\n\nContato para vendas: 62991890528";

generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
  }
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash", 
    generationConfig: generation_config,
    systemInstruction: system_instruction,
    tools: [
        {
          codeExecution: {},
        },
    ]
});

const app = express();
app.use(bodyParser.json());

// Função para chamar a API do Gemini
async function callGemini({ message, context }) {
    try {
        let prompt = '';
        context.messages.forEach(msg => {
            prompt += `${msg.sender}: ${msg.message}\n`;
        });
        prompt += `Pergunta atual: ${message}\n`;

        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error('Erro ao chamar a GeminiAi:', error);
        return 'Desculpe, houve um erro ao processar sua solicitação.';
    }
}

const clearHistoryAndSendConfirmation = (contactNumber) => {
    if (messageHistory[contactNumber]) {
        // Limpar o histórico de mensagens para o contato
        messageHistory[contactNumber] = {
            messages: []
        };

        // Enviar mensagem de confirmação
        const confirmationMessage = "Seu atendimento foi encerrado devido à inatividade. Para mais informações, entre em contato conosco novamente.";
        // Aqui você pode adicionar a lógica para enviar a mensagem de confirmação, como através do WhatsApp
        console.log("Mensagem de confirmação enviada:", confirmationMessage);
    }
};
/*
const messageHistory = {};

//Teste para verificar a técnica de montar o histórico de conversa
(async () => {
    const contactNumber = '62991890528'; // Número de contato fictício

    // Verifica se o histórico de mensagens para o contato já existe, senão cria
    if (!messageHistory[contactNumber]) {
        messageHistory[contactNumber] = {
            messages: []
        };
    }

    // Função para simular a interação com o Gemini AI
    const simulateInteraction = async (userMessage) => {
        const botResponse = await callGemini({ message: userMessage, context: messageHistory[contactNumber] });
        messageHistory[contactNumber].messages.push({ sender: 'Usuário', message: userMessage });
        messageHistory[contactNumber].messages.push({ sender: 'Gemini', message: botResponse });

        console.log("Resposta do Gemini AI:", botResponse); // Exibe a resposta gerada
    };

    // Simula várias interações com o Gemini AI
    await simulateInteraction("teste");
    await simulateInteraction("Qual o nome da sua empresa");
    await simulateInteraction("Quais são os serviços da empresa XYZ?");
    await simulateInteraction("Qual o nome da sua empresa?");

    console.log("Histórico de mensagens para o contato:", messageHistory[contactNumber]);
})();*/

/*
// Função para testar as respostas de forma direta do Gemini
(async () => {
    const userMessage = "Quais são os serviços da empresa XYZ?";  // Exemplo de mensagem do cliente
    const botResponse = await callGemini(userMessage);  // Chama o Vertex AI e obtém a resposta
    console.log("Resposta do Gemini AI:", botResponse);   // Exibe a resposta gerada
})();*/


// 1. Integração com WhatsApp
const messageHistory2 = {};

const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
});

whatsappClient.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => {
    console.log('WhatsApp Client is ready!');
});

whatsappClient.on('message', async message => {
    const contactNumber = message.from;

    if(contactNumber.endsWith('@c.us'))
    {
        const userMessage = message.body;

        if (!messageHistory2[contactNumber]) {
            messageHistory2[contactNumber] = {
                messages: []
            };
        }

        const gemResponse = await callGemini({ message: userMessage, context: messageHistory2[contactNumber] });
        messageHistory2[contactNumber].messages.push({ sender: 'Usuário', message: userMessage });
        messageHistory2[contactNumber].messages.push({ sender: 'Gemini', message: gemResponse });

        message.reply(gemResponse);
    }
        whatsappClient.initialize();

});

/*const inactivityTimeout = 5 * 60 * 1000;

setInterval(() => {
    const currentTimestamp = Date.now();
    Object.keys(messageHistory2).forEach(contactNumber => {
        const lastInteractionTime = messageHistory2[contactNumber].lastInteractionTime || 0;
        if (currentTimestamp - lastInteractionTime > inactivityTimeout) {
            clearHistoryAndSendConfirmation(contactNumber);
        }
    });
}, 60000);*/

