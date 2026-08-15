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
      url: `https://graph.facebook.com/${phoneId}/messages`,
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
// Route for POST requests
app.post('/', (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const body = req.body;

  if (body.object === 'whatsapp_business_account') {
    
    // Verifica che la struttura dati sia quella corretta di Meta
    if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value) {
      const value = body.entry[0].changes[0].value;

      // ----------------------------------------------------
      // CASE 1: LOG DEGLI STATI DEI MESSAGGI (Sent, Delivered, Read, Failed)
      // ----------------------------------------------------
      if (value.statuses) {
        const statusUpdate = value.statuses[0];
        const messageId = statusUpdate.id;      // ID del messaggio a cui si riferisce lo stato
        const status = statusUpdate.status;    // "sent", "delivered", "read", "failed"
        const recipientId = statusUpdate.recipient_id; // Numero di telefono del destinatario

        console.log(`\n--- [STATUS UPDATE] ${timestamp} ---`);
        console.log(`Messaggio ID: ${messageId}`);
        console.log(`Inviato a: ${recipientId}`);
        console.log(`Stato attuale: ➡️ ${status.toUpperCase()} ⬅️`);

        // Gestione specifica in caso di errore di invio (failed)
        if (status === 'failed' && statusUpdate.errors) {
          console.error(`⚠️ Errore di consegna per ID ${messageId}:`, JSON.stringify(statusUpdate.errors, null, 2));
        }
        console.log(`-------------------------------------\n`);
      }

      // ----------------------------------------------------
      // CASE 2: GESTIONE DEI MESSAGGI IN ENTRATA (Il tuo codice esistente)
      // ----------------------------------------------------
      if (value.messages) {
        const message = value.messages[0];
        const from = message.from; 
        const tipo = message.type;

        console.log(`\n--- [NUOVO MESSAGGIO] ${timestamp} ---`);
        sendAutoReply(from);

        const userText = message?.text?.body?.toLowerCase().trim() || "";
        console.log(`L'utente ${from} ha scritto: ${userText}`);

        // Gestione del click sui bottoni
        if (message.type === 'button') {
          const buttonId = message.button.payload;
          const parts = buttonId.split('_'); 
          const id = parts[1];    
          const stato = parts[2]; 

          console.log(`L'utente ${from} ha cliccato: ${stato} (ID: ${id})`);

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
        console.log(`--------------------------------------\n`);
      }
    }

    // Rispondi sempre 200 OK a Meta il prima possibile per evitare re-invii
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});


// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});
