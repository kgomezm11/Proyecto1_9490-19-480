/*
KELVIN JOSÉ GÓMEZ MORALRES          9490-19-480
LESTER HAROLDO BLANCO MELENDRES     9490-19-5517
*/



const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');

const usuarioRoutes = require('./routes/usuarioRoutes');
const productoRoutes = require('./routes/productoRoutes');
const carritoRoutes = require('./routes/carritoRoutes');
const comprasRoutes = require('./routes/comprasRoutes');


const app = express();

const port = 3000;

app.use(bodyParser.json());

mongoose.connect('mongodb+srv://kelvin:mongopass@ht6-kelvin.ns2oilw.mongodb.net/Proyecto1', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Conexión exitosa a MongoDB'))
    .catch(error => console.error('MongoDB retornó un error en su conexión: ', error));

// se establecen las ruta predefinida con sus futuros módulos o variaciones
app.use(cors()); //En los middlewares
app.use('/api', usuarioRoutes);
app.use('/api', productoRoutes);
app.use('/api', carritoRoutes);
app.use('/api', comprasRoutes);

app.listen(port, () => {
    console.log(`Se está ejecutando en localhost, puerto: ${port}`);
});