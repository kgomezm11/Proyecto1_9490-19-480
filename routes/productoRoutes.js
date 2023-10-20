const express = require('express');
const jwt = require('jsonwebtoken');

const { verifyToken, noEsUnNumeroVacio2, noEsUnTextoVacio } = require('../controllers/controllers');

const ProductoSchema = require('../models/product');

const router = express.Router();

// Módulo Catálogo de Productos
// GET - TODOS LOS PRODUCTOS
router.get('/productos', verifyToken, async (req, res) => {
    if (req.rol === 'admin') {
        try {
            const productosEncontrados = await ProductoSchema.find({});
            if (productosEncontrados !== null) {
                res.json(productosEncontrados);
            } else {
                res.status(404).json({ error: 'No existen productos' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    } else if (req.rol === 'usuario') {
        try {
            const productosEncontrados = await ProductoSchema.find({ "habilitado": 1 }).select('-habilitado');
            if (productosEncontrados !== null) {
                res.json(productosEncontrados);
            } else {
                res.status(404).json({ error: 'No existen productos' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
});

// GET - PRODUCTO ESPECÍFICO
router.get('/producto/:identificador', verifyToken, async (req, res) => {
    const idBuscar = req.params.identificador;
    try {
        const productoEncontrado = await ProductoSchema.findOne({ "identificador": idBuscar });
        if (productoEncontrado !== null) {
            res.json(productoEncontrado);
        } else {
            res.status(404).json({ error: 'No existe el producto solicitado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Módulo Gestión de Productos
// POST - CREAR NUEVOS PRODUCTOS
router.post('/producto', verifyToken, async (req, res) => {
    try {
        if (req.rol === 'admin') {
            const {
                identificador,
                nombre,
                marca,
                disponibilidad,
                descuento,
                precio,
                imagen,
                descripcion,
                categorias,
                habilitado
            } = req.body;

            const habilitadoValidar = habilitado;
            const precioDescuento = precio - descuento;

            if (descuento >= precio) {
                res.status(400).json({ error: 'Descuento no puede ser mayor o igual al precio' });
                return;
            }

            if (habilitadoValidar === 1 || habilitadoValidar === 0) {
                // Verificar si ya existe un producto con el mismo identificador
                const existingProduct = await ProductoSchema.findOne({ identificador });

                if (existingProduct) {
                    res.status(400).json({ error: 'Ya existe un producto con el mismo identificador' });
                } else {
                    // Si no existe, crea el nuevo producto
                    const nuevoProducto = await ProductoSchema.create({
                        identificador,
                        nombre,
                        marca,
                        disponibilidad,
                        descuento,
                        precio,
                        precioDescuento,
                        imagen,
                        descripcion,
                        categorias,
                        habilitado
                    });
                    res.status(201).json({ mensaje: 'Producto creado con éxito' });
                }
            } else {
                res.status(400).json({ error: 'Valor habilitado no admitido' });
            }
        } else {
            res.status(400).json({ error: 'Privilegios insuficientes' });
        }
    } catch (error) {
        res.status(400).json({ error: 'Hubo un error al crear el producto' });
    }
});



// PATCH - MODIFICAR DATOS DEL PRODUCTO
// PATCH - MODIFICAR DATOS DEL PRODUCTO
router.patch('/producto/:identificador', verifyToken, async (req, res) => {
    const idBuscar = req.params.identificador;
    try {
        if (req.rol === 'admin') {
            const fieldsToValidate = [
                'nombre',
                'marca',
                'disponibilidad',
                'imagen',
                'descripcion',
                'categorias',
                'habilitado'
            ];

            const updateFields = {};

            for (const field of fieldsToValidate) {
                if (req.body[field] !== undefined) {
                    if (field === 'disponibilidad' || field === 'habilitado') {
                        if (!noEsUnNumeroVacio2(req.body[field])) {
                            return res.status(400).json({ error: "Todos los campos son requeridos" });
                        }
                    } else {
                        if (!noEsUnTextoVacio(req.body[field])) {
                            return res.status(400).json({ error: "Todos los campos son requeridos" });
                        }
                    }
                    // Realizar la conversión de categorías a un array y limpiar los valores
                    if (field === 'categorias') {
                        const contenidoCategorias = req.body[field].toString();
                        const categoríasArray = contenidoCategorias.split(',');
                        const categoríasLimpio = categoríasArray.map(categoría => categoría.trim());
                        updateFields[field] = categoríasLimpio;
                    } else {
                        updateFields[field] = req.body[field];
                    }
                }
            }

            // Realiza una consulta para obtener los valores actuales de "precio" y "descuento"
            const productoActual = await ProductoSchema.findOne({ identificador: idBuscar });
            if (!productoActual) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }

            if ((req.body.precio !== undefined && !noEsUnNumeroVacio2(req.body.precio)) ||
                (req.body.descuento !== undefined && !noEsUnNumeroVacio2(req.body.descuento))) {
                return res.status(400).json({ error: 'Los campos "precio" y "descuento" son requeridos si se proporcionan' });
            }

            if (req.body.precio !== undefined) {
                updateFields.precio = req.body.precio;
            }

            if (req.body.descuento !== undefined) {
                updateFields.descuento = req.body.descuento;
            }

            // Recalcula el precioDescuento
            if (req.body.precio !== undefined || req.body.descuento !== undefined) {
                let nuevoPrecio = req.body.precio !== undefined ? req.body.precio : productoActual.precio;
                let nuevoDescuento = req.body.descuento !== undefined ? req.body.descuento : productoActual.descuento;
                if (nuevoDescuento < 0) {
                    return res.status(400).json({ error: 'El descuento no puede ser negativo' });
                }
                if (nuevoDescuento >= nuevoPrecio) {
                    return res.status(400).json({ error: 'El descuento no puede ser mayor o igual al precio' });
                }
                updateFields.precioDescuento = nuevoPrecio - nuevoDescuento;
            }

            if (req.body.habilitado !== undefined) {
                if (req.body.habilitado !== 0 && req.body.habilitado !== 1) {
                    return res.status(400).json({ error: 'Valor de habilitado no admitido' });
                }
            }

            const productoActualizado = await ProductoSchema.findOneAndUpdate(
                { identificador: idBuscar },
                { $set: updateFields },
                { new: true }
            );
            if (productoActualizado) {
                const camposActualizados = {};
                for (const key in updateFields) {
                    if (updateFields.hasOwnProperty(key)) {
                        camposActualizados[key] = productoActualizado[key];
                    }
                }
                res.json({ mensaje: 'Producto actualizado con éxito', camposActualizados });
            } else {
                res.status(404).json({ error: 'Producto no encontrado' });
            }
        } else {
            res.status(400).json({ error: 'Privilegios insuficientes' });
        }
    } catch (error) {
        res.status(400).json({ error: 'Hubo un error al modificar el producto' });
    }
});








// DELETE - ELIMINA A NIVEL EL PRODUCTO (habilitado/deshabilitado)
router.delete('/producto/:identificador', verifyToken, async (req, res) => {
    const idBuscar = req.params.identificador;
    try {
        if (req.rol === 'admin') {
            const cambiarEstado = 0;
            const updateFields = {};

            updateFields.habilitado = cambiarEstado;
            const productoActualizado = await ProductoSchema.findOneAndUpdate(
                { identificador: idBuscar },
                { $set: updateFields },
                { new: true }
            );
            if (productoActualizado) {
                const camposActualizados = {};
                for (const key in updateFields) {
                    if (updateFields.hasOwnProperty(key)) {
                        camposActualizados[key] = productoActualizado[key];
                    }
                }
                res.json({ mensaje: 'Producto eliminado con éxito', camposActualizados });
            } else {
                res.status(404).json({ error: 'Producto no encontrado' });
            }

        } else {
            res.status(400).json({ error: 'Privilegios insuficientes' });
        }
    } catch (error) {
        res.status(400).json({ error: 'Hubo un error al modificar el producto' });
    }
});

module.exports = router;