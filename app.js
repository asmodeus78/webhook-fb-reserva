// Import Express.js
const express = require('express');
const axios = require('axios');

// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Set port and verify_token
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const accessToken = process.env.WHATSAPP_TOKEN; 
const phoneId = process.env.PHONE_NUMBER_ID; 

// Funzione per inviare il messaggio di avviso
const sendAutoReply = async (to) => {
  try {
    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v20.0/{phoneId}/messages`,
      data: {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: "⚠️ ATTENZIONE: questo è un sistema automatico, i messaggi inviati a questo numero non verranno letti ." },
      },
      headers: { "Authorization": `Bearer ${accessToken}` },
    });
    console.log(`Risposta automatica inviata a ${to}`);
  } catch (error) {
    console.error("Errore invio risposta:", error.response ? error.response.data : error.message);
  }
};

// Route for GET requests
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// Route for POST requests
app.post('/', (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  //console.log(JSON.stringify(req.body, null, 2));
  //res.status(200).end();

  const body = req.body;
  const oggetto = body.object;
  console.log(`\n\nOggetto: ${oggetto}`);
  if (body.object === 'whatsapp_business_account'){
    if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
      
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from; // Numero di telefono del cliente
      const tipo = message.type;

      console.log("Messaggio ricevuto:", JSON.stringify(message, null, 2));


      // 1. Invia SEMPRE la risposta automatica a chi scrive
      sendAutoReply(from);


      const userText = message?.text?.body?.toLowerCase().trim() || "";
      
      

      console.log(`Numero del cliente: ${from}\n`);
      console.log(`Tipo messaggio: ${tipo}\n`);
      console.log(`L'utente ${from} ha scritto: ${userText}`);

      // Gestione del click sui bottoni (tipo 'interactive')
      if (message.type === 'button' ) { //&& message.interactive.type === 'button_reply'
        const buttonId = message.button.payload;
        const buttonText = message.button.text;

        const parts = buttonId.split('_'); 
        const id = parts[1];    // "1234"
        const stato = parts[2]; // "OK"

        console.log(`L'utente ${from} ha cliccato: ${stato} (ID: ${id})`);

        // Chiamata asincrona
        axios.post('https://reserva-app.it/SW/webhook/incoming.php', {
            id_appuntamento: id,
            telefono: from,
            azione: stato
        })
        .then(response => {
            console.log("Risposta server remoto:", response.data);
        })
        .catch(error => {
            console.error("Errore chiamata remota:", error.message);
        });

      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
  





  
});

// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});
