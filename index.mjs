import 'dotenv/config'; // Load environment variables
import express from 'express';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import { Resend } from 'resend'; // Import Resend

// Determine the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Resend Client Setup ---
// Initialize Resend with the API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Set the views directory
app.set('views', 'views');

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Middleware to parse URL-encoded bodies (from HTML forms)
app.use(express.urlencoded({ extended: true }));

// Define the path to the contacts file
const contactsFilePath = path.join(__dirname, 'data/contacts.json');

// --- Routes ---

app.get('/', (req, res) => res.render('index'));
app.get('/experiencia', (req, res) => res.render('experiencia'));
app.get('/estudios', (req, res) => res.render('estudios'));
app.get('/proyectos', (req, res) => res.render('proyectos'));
app.get('/contacto', (req, res) => res.render('contacto'));
app.get('/gracias', (req, res) => res.render('gracias'));

// Contacto Page (POST - Handle form submission)
app.post('/contacto', async (req, res) => {
    try {
        const { name, email, message } = req.body;

        const newContact = {
            id: Date.now(),
            name,
            email,
            message,
            receivedAt: new Date().toISOString(),
        };

        let contacts = [];
        try {
            const data = await fs.readFile(contactsFilePath, 'utf8');
            contacts = JSON.parse(data);
        } catch (readError) {
            if (readError.code !== 'ENOENT') throw readError;
        }

        contacts.push(newContact);
        await fs.writeFile(contactsFilePath, JSON.stringify(contacts, null, 2), 'utf8');
        console.log(`Contacto guardado: ${name} (${email})`);

        // --- Send Email Notification using Resend (in the background) ---
        resend.emails.send({
            from: 'onboarding@resend.dev', // Required for the free plan
            to: process.env.EMAIL_USER, // Your email address to receive notifications
            subject: 'Nuevo Mensaje de Contacto ✔',
            html: `
                <p>Has recibido un nuevo mensaje desde tu portafolio.</p>
                <ul>
                    <li><strong>Nombre:</strong> ${name}</li>
                    <li><strong>Email:</strong> ${email}</li>
                </ul>
                <p><strong>Mensaje:</strong></p>
                <p>${message}</p>
            `,
        })
        .then(response => console.log('Correo de notificación enviado con Resend:', response.id))
        .catch(error => console.error('Error al enviar correo con Resend:', error));

        // Immediately redirect to the thank you page
        res.redirect('/gracias');

    } catch (error) {
        console.error('Error al procesar el formulario de contacto:', error);
        res.status(500).send('Error interno del servidor al procesar el contacto.');
    }
});

// Handle 404 - Not Found
app.use((req, res) => {
    res.status(404).render('404');
});

const port = parseInt(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});