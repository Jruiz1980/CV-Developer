import 'dotenv/config';
import express from 'express';
import { Resend } from 'resend';
import admin from 'firebase-admin';

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

// --- Firebase Admin SDK Initialization ---
let db; // This will hold the Firestore database instance

async function initializeFirebase() {
    // Read credentials from the environment variable provided by Render
    const serviceAccountJson = process.env.FIREBASE_CREDENTIALS_JSON;

    try {
        if (!serviceAccountJson) {
            // This error will be thrown if the environment variable is missing
            throw new Error('La variable de entorno FIREBASE_CREDENTIALS_JSON no está definida. Asegúrate de configurarla en Render.');
        }

        const serviceAccount = JSON.parse(serviceAccountJson);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        db = admin.firestore();
        console.log('✅ Conexión exitosa a Firebase y Firestore.');

    } catch (error) {
        console.error(
            '🔥 ERROR FATAL: No se pudo inicializar Firebase.',
            error
        );
        // Exit the process if the database connection fails, as the app is useless without it.
        process.exit(1);
    }
}

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', 'views');

// Serve static files and parse form bodies
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
app.get('/', (req, res) => res.render('index'));
app.get('/experiencia', (req, res) => res.render('experiencia'));
app.get('/estudios', (req, res) => res.render('estudios'));
app.get('/proyectos', (req, res) => res.render('proyectos'));
app.get('/contacto', (req, res) => res.render('contacto'));
app.get('/gracias', (req, res) => res.render('gracias'));

// --- Handle Contact Form Submission ---
app.post('/contacto', async (req, res) => {
    const { name, email, message } = req.body;
    try {
        const newContact = {
            name,
            email,
            message,
            receivedAt: new Date(),
        };

        const docRef = await db.collection('contacts').add(newContact);
        console.log(`Contacto guardado en Firestore con ID: ${docRef.id}`);

        resend.emails.send({
            from: 'onboarding@resend.dev',
            to: process.env.EMAIL_USER,
            subject: 'Nuevo Mensaje de Contacto ✔',
            html: `<p>Nombre: ${name}</p><p>Email: ${email}</p><p>Mensaje: ${message}</p>`
        })
        .then(() => console.log('Correo de notificación enviado.'))
        .catch(err => console.error('Error enviando correo:', err));
        
        res.redirect('/gracias');

    } catch (error) {
        console.error('Error al procesar el formulario y guardar en Firestore:', error);
        res.status(500).send('Error interno del servidor.');
    }
});

// Handle 404
app.use((req, res) => {
    res.status(404).render('404');
});

const port = process.env.PORT || 3000;
app.listen(port, async () => {
    // --- TEMPORARY DEBUGGING STEP ---
    console.log('--- INICIO DE DEPURACIÓN DE VARIABLES DE ENTORNO ---');
    console.log('El servidor ha recibido las siguientes claves de entorno:');
    console.log(Object.keys(process.env));
    console.log('--- FIN DE DEPURACIÓN ---');
    // ---------------------------------

    await initializeFirebase(); 
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
