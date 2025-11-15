
import 'dotenv/config';
import express from 'express';
import { Resend } from 'resend';
import admin from 'firebase-admin';
import { I18n } from 'i18n';
import path from 'path';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';

// --- Basic Setup ---
const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- i18n Configuration ---
const i18n = new I18n({
    locales: ['es', 'en'],
    defaultLocale: 'es',
    cookie: 'lang', // Name of the cookie that stores the language
    directory: path.join(__dirname, 'locales'),
    autoReload: true, // Reload translations on change in development
    syncFiles: true, // Create new locale files automatically
});

// --- Firebase Admin SDK Initialization ---
let db; // This will hold the Firestore database instance
async function initializeFirebase() {
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (!projectId) throw new Error('La variable de entorno FIREBASE_PROJECT_ID no está definida.');
        if (!clientEmail) throw new Error('La variable de entorno FIREBASE_CLIENT_EMAIL no está definida.');
        if (!privateKey) throw new Error('La variable de entorno FIREBASE_PRIVATE_KEY no está definida o está vacía.');

        const serviceAccount = {
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
        };

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        db = admin.firestore();
        console.log('✅ Conexión exitosa a Firebase y Firestore.');
    } catch (error) {
        console.error('🔥 ERROR FATAL: No se pudo inicializar Firebase.', error);
        process.exit(1);
    }
}

// --- Middlewares ---
app.set('view engine', 'ejs');
app.set('views', 'views');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Use cookie-parser middleware
app.use(i18n.init); // Initialize i18n middleware

// Middleware to make the translation function available in all templates
app.use((req, res, next) => {
    res.locals.__ = res.__; // This is the magic function for translation
    res.locals.lang = req.getLocale(); // Pass current language to views
    next();
});

// --- Language Switcher Route ---
app.get('/lang/:locale', (req, res) => {
    const { locale } = req.params;
    if (i18n.getLocales().includes(locale)) {
        res.cookie('lang', locale, { maxAge: 900000, httpOnly: true });
    }
    res.redirect(req.header('Referer') || '/');
});

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
        const newContact = { name, email, message, receivedAt: new Date() };
        const docRef = await db.collection('contacts').add(newContact);
        console.log(`Contacto guardado en Firestore con ID: ${docRef.id}`);

        resend.emails.send({
            from: 'onboarding@resend.dev',
            to: process.env.EMAIL_USER,
            subject: res.__('Nuevo Mensaje de Contacto ✔'), // Translated subject
            html: `<p>${res.__('Nombre')}: ${name}</p><p>Email: ${email}</p><p>${res.__('Mensaje')}: ${message}</p>`
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
    await initializeFirebase();
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
