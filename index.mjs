
import express from 'express';

const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Set the views directory
app.set('views', 'views');

// Serve static files from the 'public' directory
app.use(express.static('public'));

// --- Routes ---

// Home Page (Introduction)
app.get('/', (req, res) => {
    res.render('index');
});

// Experiencia Page
app.get('/experiencia', (req, res) => {
    res.render('experiencia');
});

// Proyectos Page
app.get('/proyectos', (req, res) => {
    res.render('proyectos');
});

// Contacto Page
app.get('/contacto', (req, res) => {
    res.render('contacto');
});

// Handle 404 - Not Found
app.use((req, res) => {
    res.status(404).render('404');
});


const port = parseInt(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
