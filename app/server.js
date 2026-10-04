const path = require('path');
const express = require('express');
const { PORT, BUGS } = require('./config');
const { resetDatabase } = require('./db');

const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', bugs: BUGS ? 'on' : 'off' }));

// Endpoint de apoyo SOLO para pruebas: reinicia la BD con schema.sql + seed.sql.
app.post('/api/test/reset', (_req, res) => {
  resetDatabase();
  res.json({ status: 'reset' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart').router);
app.use('/api/orders', require('./routes/orders'));

app.get('/api/docs', (_req, res) => res.json(require('./openapi.json')));
app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta de API no encontrada' }));

app.use(express.static(path.join(__dirname, 'public')));
app.get('/api-docs', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'api-docs.html')));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`TiendaQA escuchando en http://localhost:${PORT}  (BUGS=${BUGS ? 'on' : 'off'})`);
});
