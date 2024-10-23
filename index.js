const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Certifique-se de importar corretamente

const genAI = new GoogleGenerativeAI(process.env.GEMINIAI_API_KEY);
const system_instruction="Você é um assistente virtual da empresa XYZ, especializada em serviços de telecomunicações. Responda de forma educada, clara e objetiva a qualquer pergunta do cliente sobre os serviços oferecidos, como planos de internet, suporte técnico e atendimento ao cliente. Lembre-se de promover os benefícios da empresa XYZ e garantir que os clientes saibam que estamos disponíveis 24/7, também sempre se comunique em português. Não responda a perguntas não relacionadas a empresa ou sobre assuntos da área de atuação da mesma, em nenhuma hipótese.\n\nContato para vendas: 62991890528";

generation_config = {
    "temperature": 0.8,
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
  }
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash", 
    generationConfig: generation_config,
    systemInstruction: system_instruction
});

const app = express();
app.use(bodyParser.json());


// Função para chamar a API do Gemini
async function callGemini(userMessage) {
    try {
        const result = await model.generateContent(userMessage);
        return result.response.text();
    } catch (error) {
        console.error('Erro ao chamar a GeminiAi:', error);
        return 'Desculpe, houve um erro ao processar sua solicitação.';
    }
}
/*
// Função para testar as respostas de forma direta do Gemini
(async () => {
    const userMessage = "Quais são os serviços da empresa XYZ?";  // Exemplo de mensagem do cliente
    const botResponse = await callGemini(userMessage);  // Chama o Vertex AI e obtém a resposta
    console.log("Resposta do Gemini AI:", botResponse);   // Exibe a resposta gerada
})();*/

// 1. Integração com WhatsApp
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
    const gemResponse = await callGemini(message.body);
    message.reply(gemResponse);
});

whatsappClient.initialize();
