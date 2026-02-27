// Import Express.js
const express = require('express');

// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Set port and verify_token
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;

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
  if (body.object === 'whatsapp_business_account'){
    if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
      
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from; // Numero di telefono del cliente

      // Gestione del click sui bottoni (tipo 'interactive')
      if (message.type === 'interactive' && message.interactive.type === 'button_reply') {
        const buttonId = message.interactive.button_reply.id;
        const buttonText = message.interactive.button_reply.title;

        console.log(`L'utente ${from} ha cliccato: ${buttonText} (ID: ${buttonId})`);

        // Logica per aggiornare il database
        if (buttonId === 'tuo_id_ok') {
          console.log("Stato: Confermato. Eseguo query UPDATE...");
          // queryDatabase('UPDATE appuntamenti SET stato = "confermato" WHERE telefono = ?', [from]);
        } else if (buttonId === 'tuo_id_annulla') {
          console.log("Stato: Annullato. Eseguo query UPDATE...");
          // queryDatabase('UPDATE appuntamenti SET stato = "annullato" WHERE telefono = ?', [from]);
        }

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
