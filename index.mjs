import 'dotenv/config'; // Load environment variables
import express from 'express';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import nodemailer from 'nodemailer'; // Import nodemailer

// Determine the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Nodemailer Transporter Setup ---
// Create a transporter object using Gmail SMTP
// We use environment variables to keep credentials secure
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your Gmail address from .env
        pass: process.env.EMAIL_PASS, // Your Gmail App Password from .env
    },
});

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

// Home Page (Introduction)
app.get('/', (req, res) => {
    res.render('index');
});

// Experiencia Page
app.get('/experiencia', (req, res) => {
    res.render('experiencia');
});

// Estudios Page
app.get('/estudios', (req, res) => {
    res.render('estudios');
});

// Proyectos Page
app.get('/proyectos', (req, res) => {
    res.render('proyectos');
});

// Contacto Page (GET - Display form)
app.get('/contacto', (req, res) => {
    res.render('contacto');
});

// Contacto Page (POST - Handle form submission)
app.post('/contacto', async (req, res) => {
    try {
        const { name, email, message } = req.body;

        // Create a new contact object
        const newContact = {
            id: Date.now(), // Use a timestamp as a simple unique ID
            name,
            email,
            message,
            receivedAt: new Date().toISOString(),
        };

        // Read the existing contacts
        let contacts = [];
        try {
            const data = await fs.readFile(contactsFilePath, 'utf8');
            contacts = JSON.parse(data);
        } catch (readError) {
            if (readError.code !== 'ENOENT') throw readError;
        }

        // Add the new contact to the list
        contacts.push(newContact);

        // Write the updated list back to the file
        await fs.writeFile(contactsFilePath, JSON.stringify(contacts, null, 2), 'utf8');
        console.log(`Contacto guardado: ${name} (${email})`);

        // --- Send Email Notification ---
        try {
            const mailOptions = {
                from: `"Notificación Portafolio" <${process.env.EMAIL_USER}>`, // sender address
                to: process.env.EMAIL_USER, // list of receivers (yourself)
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
            };

            await transporter.sendMail(mailOptions);
            console.log('Correo de notificación enviado con éxito.');

        } catch (emailError) {
            console.error('Error al enviar el correo de notificación:', emailError);
            // We don't block the user response for this, just log the error
        }

        // Redirect to a simple "thank you" page
        res.redirect('/gracias');

    } catch (error) {
        console.error('Error al procesar el formulario de contacto:', error);
        res.status(500).send('Error interno del servidor al procesar el contacto.');
    }
});

// Gracias page
app.get('/gracias', (req, res) => {
    res.render('gracias');
});

// Handle 404 - Not Found
app.use((req, res) => {
    res.status(404).render('404');
});


const port = parseInt(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});