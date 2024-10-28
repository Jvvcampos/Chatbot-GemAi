const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Certifique-se de importar corretamente

const genAI = new GoogleGenerativeAI(process.env.GEMINIAI_API_KEY);
const system_instruction="1. Você é um assistente virtual da empresa XYZ, especializada em serviços de telecomunicações. \n2. Responda de forma educada, clara e objetiva a qualquer pergunta do cliente sobre os serviços oferecidos, como planos de internet, suporte técnico e atendimento ao cliente. \n3. Lembre-se de promover os benefícios da empresa XYZ e garantir que os clientes saibam que estamos disponíveis 24/7. \n4. Sempre se comunique em português. \n5. Não responda as perguntas não relacionadas a empresa ou sobre assuntos da área de atuação da mesma, em nenhuma hipótese.\n\nContato somente sobre as vendas: 62991890528";

generation_config = 
{
    "temperature": 0.7,
    "top_p": 0.8,
    "top_k": 48,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}
const model = genAI.getGenerativeModel
({ 
    model: "gemini-1.5-flash", 
    generationConfig: generation_config,
    systemInstruction: system_instruction,
    tools: 
    [
        {
          codeExecution: {},
        },
    ]
});

const app = express();
app.use(bodyParser.json());

// Função para chamar a API do Gemini
async function callGemini(chat, message) {
    try 
    {
        const result = await chat.sendMessage(message);
        return result.response.text();
    } 
    catch (error) 
    {
        console.error('Erro ao chamar a GeminiAi:', error);
        return 'Desculpe, houve um erro ao processar sua solicitação.';
    }
}
async function checkContactExists(client, phoneNumber) 
{
    try 
    {
        const contact = await client.getContactById(`${phoneNumber}@c.us`);
        return contact ? true : false;
    } 
    catch (error) 
    {
        console.error('Erro ao verificar contato:', error);
        return false;
    }
}
async function extractPhoneNumber(responseText) 
{
    const phoneRegex = /(\+\d{1,3}\s?)?(\d{10,15})/g;
    const matches = responseText.match(phoneRegex);
    return matches ? matches[0] : null;
}

// 1. Integração com WhatsApp
const chats = new Map();
const programStartTime = Date.now();

const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
});

whatsappClient.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => {
    console.log('WhatsApp Client is ready!');

});

whatsappClient.on('message', async message => 
{
    const messageTimestamp = message.timestamp * 1000; // Convertendo o timestamp da mensagem para milissegundos
    const contactNumber = message.from;
    const inactivityTimeout = 600;

    if(contactNumber.endsWith('@c.us') && messageTimestamp > programStartTime)
    {
        lastInteractionTime = Date.now();
        const userMessage = message.body;
        try
        {
            if(!chats.has(contactNumber))
            {
                const newChat = await model.startChat();
                chats.set(contactNumber, newChat);
                await message.reply('Olá como posso te ajudar?');
            }
            else
            {
                const chat = chats.get(contactNumber);
                const response = await callGemini(chat, userMessage);
                await message.reply(response);
                const responseNumber = await extractPhoneNumber(response);
                const contactExists = await checkContactExists(whatsappClient, responseNumber);

                if(contactExists)
                {
                    const contact = await whatsappClient.getContactById(`55${responseNumber}@c.us`);
                    await message.reply(contact);
                }
            }

            if(chats.has(message.from + '_timer'))
            {
                clearTimeout(chats.get(message.from + '_timer'));
            }

            chats.set(message.from + '_timer', setTimeout(() => 
            {
                chats.delete(message.from);
                console.log('Chat com', message.from, 'encerrado por inatividade.');
                whatsappClient.sendMessage(contactNumber, 'O atendimento foi encerrado por inatividade. Caso precise de mais ajuda, entre em contato novamente.');
            }, inactivityTimeout * 1000));
        }
        catch(error)
        {
            console.error('Erro ao processar mensagem:', error);
            await msg.reply('Desculpe, ocorreu um erro ao processar sua mensagem.');
        }
    }    
});

whatsappClient.initialize();
