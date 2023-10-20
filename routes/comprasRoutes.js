const express = require('express');
const { verifyToken } = require('../controllers/controllers');

const CarritoSchema = require('../models/cart');
const BitacoraSchema = require('../models/bitacora');

const router = express.Router();

// Módulo Compra
// GET - TODAS LAS COMPRAS DE UN CLIENTE
router.get('/compra', verifyToken, async (req, res) => {
    try {
        const carritoEncontrado = await BitacoraSchema.findOne({ "dpi": req.dpi });
        if (carritoEncontrado !== null) {
            res.json(carritoEncontrado);
        } else {
            res.status(404).json({ error: 'No se encontraron productos' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


router.post('/compra', verifyToken, async (req, res) => {
    try {
        const productosComprados = await CarritoSchema.find({ "dpi": req.dpi });

        for (const carrito2 of productosComprados) {
            if (carrito2.productos.length === 0) {
                return res.status(404).json({ error: 'No hay productos agregados' });
            }
        }

        let nuevaCompra = await BitacoraSchema.findOne({ "dpi": req.dpi });

        if (!nuevaCompra) {
            nuevaCompra = new BitacoraSchema({
                dpi: req.dpi,
                productos: [],
                total: 0,
            });
        }

        const productosTotales = {};

        for (const carrito of productosComprados) {
            const productosCarrito = carrito.productos;

            productosCarrito.forEach((producto) => {
                const identificador = producto.identificador;

                if (!productosTotales[identificador]) {
                    productosTotales[identificador] = {
                        ...producto,
                        cantidad: 0,
                    };
                }

                // Incrementa la cantidad total para este identificador
                productosTotales[identificador].cantidad += producto.cantidad;
            });
        }

        // Actualiza o agrega productos con cantidades consolidadas a la bitácora
        nuevaCompra.productos.forEach((producto, index) => {
            const identificador = producto.identificador;
            if (productosTotales[identificador]) {
                producto.cantidad += productosTotales[identificador].cantidad;
                nuevaCompra.productos[index] = producto; // Actualiza el producto existente
                delete productosTotales[identificador]; // Elimina el producto consolidado
            }
        });

        // Agrega productos consolidados restantes a la bitácora
        nuevaCompra.productos = nuevaCompra.productos.concat(Object.values(productosTotales));

        // Calcula el total en función de los productos en la bitácora
        nuevaCompra.total = nuevaCompra.productos.reduce((total, producto) => {
            return total + producto.precioDescuento * producto.cantidad;
        }, 0);

        await nuevaCompra.save();

        // Elimina todos los productos del carrito
        for (const carrito of productosComprados) {
            await CarritoSchema.updateOne({ "_id": carrito._id }, { $set: { productos: [], total: 0 } });
        }

        return res.status(200).json({ mensaje: 'Compra realizada con éxito' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});













module.exports = router;