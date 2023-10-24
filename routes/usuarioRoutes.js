const express = require('express');
const jwt = require('jsonwebtoken');
const secretKey = 'desarrolloweb';
const Segundos = 3000;
const { verifyToken, noEsUnNumeroVacio, noEsUnTextoVacio, validarCorreo, validarContraseña } = require('../controllers/controllers');

const UsuarioSchema = require('../models/user');

const router = express.Router();

// Módulo Login
// POST - INICIA SESIÓN MEDIANTE LAS CREDENCIALES
router.post('/login', async (req, res) => {
    const correo = req.body.correoElectronico;
    const clave = req.body.clave;
    try {
        const usuarioEncontrado = await UsuarioSchema.findOne({ "correoElectronico": correo, "clave": clave });
        if (usuarioEncontrado !== null) {
            const token = jwt.sign({ usuarioEncontrado }, secretKey, { expiresIn: Segundos + 's' });
            res.json({ "mensaje": "Inicio de sesión exitoso", token });
        } else {
            res.status(404).json({ error: 'Error con los datos o no existe' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Módulo Registro de Usuario
// POST - SE CREA UN NUEVO USUARIO SEGÚN LOS DATOS INGRESADOS
router.post('/registro/:dpi', async (req, res) => {
    try {
        const regex = /^[A-Za-z\sáéíóúÁÉÍÓÚüÜñÑ]+$/;
        const dpi = req.params.dpi;
        const {
            nombres,
            apellidos,
            fechaNacimiento,
            direccionEntrega,
            nit,
            numeroTelefonico,
            correoElectronico,
            clave,
            validacionClave,
            rol
        } = req.body;

        const existingUser = await UsuarioSchema.findOne({
            $or: [
                { dpi: dpi },
                { nit: nit },
                { correoElectronico: correoElectronico }
            ]
        });
        if (existingUser) {
            return res.status(400).json({ error: 'Ya existe un usuario con algunos de los datos ingresados' });
        }
        if (!dpi || !nombres || !apellidos || !fechaNacimiento || !direccionEntrega || !nit || !numeroTelefonico || !correoElectronico || !clave || !validacionClave || !rol) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }
        if (!regex.test(nombres) || !regex.test(apellidos)) {
            return res.status(400).json({ error: 'El nombre completo no puede contener números' });
        }
        if (!validarCorreo(correoElectronico)) {
            return res.status(400).json({ error: 'Correo electrónico no válido' });
        }
        if (!validarContraseña(clave)) {
            return res.status(400).json({ error: 'La contraseña no cumple con los requisitos de seguridad' });
        }
        if (clave !== validacionClave) {
            return res.status(400).json({ error: 'La contraseña no coincide' });
        }

        const nuevoUsuario = await UsuarioSchema.create({
            dpi,
            nombres,
            apellidos,
            fechaNacimiento,
            direccionEntrega,
            nit,
            numeroTelefonico,
            correoElectronico,
            clave,
            validacionClave,
            rol
        });

        res.status(201).json({ "mensaje": "Usuario creado con éxito" });
    } catch (error) {
        res.status(400).json({ error: 'Hubo un error al crear el usuario' });
    }
});

// Módulo de Gestión de Perfil
// GET - MUESTRA TODOS LOS DATOS ASOCIADOS AL USUARIO Y SU TOKEN
router.get('/perfil/:dpi', verifyToken, (req, res) => {
    const dpiBuscar = req.params.dpi;
    if (dpiBuscar == req.dpi) {
        res.json({
            "message": "Información protegida",
            "dpi": req.dpi,
            "nombres": req.nombres,
            "apellidos": req.apellidos,
            "fechaNacimiento": req.fechaNacimiento,
            "direccionEntrega": req.direccionEntrega,
            "nit": req.nit,
            "numeroTelefonico": req.numeroTelefonico,
            "correoElectronico": req.correoElectronico,
            "clave": req.clave,
            "validacionClave": req.validacionClave,
            "rol": req.rol
        });
    } else {
        res.sendStatus(403); // Forbidden
    }
});


//PATCH - MODIFICA LOS DATOS ASOCIADOS AL USUARIO
router.patch('/perfil/:dpi', verifyToken, async (req, res) => {
    const regex = /^[A-Za-z\sáéíóúÁÉÍÓÚüÜñÑ]+$/;
    const dpiBuscar = req.params.dpi;
    if (dpiBuscar == req.dpi) {

        try {
            const updateFields = {};
            const fieldsToValidate = [
                'nombres',
                'apellidos',
                'fechaNacimiento',
                'direccionEntrega',
                'nit',
                'correoElectronico',
                'numeroTelefonico',
                'clave',
                'validacionClave'
            ];

            for (const field of fieldsToValidate) {
                if (req.body[field] !== undefined) {
                    if (field === 'nit' || field === 'numeroTelefonico') {
                        if (!noEsUnNumeroVacio(req.body[field])) {
                            return res.status(400).json({ error: "Todos los campos son requeridos" });
                        }
                    } else {
                        if (!noEsUnTextoVacio(req.body[field])) {
                            return res.status(400).json({ error: "Todos los campos son requeridos" });
                        }
                    }
                    if (field === 'nombres' || field === 'apellidos') {
                        if (!regex.test(req.body[field])) {
                            return res.status(400).json({ error: 'El nombre completo no puede contener números' });
                        }
                    }

                    updateFields[field] = req.body[field];
                }
            }

            if (req.body.correoElectronico !== undefined) {
                if (!validarCorreo(req.body.correoElectronico)) {
                    return res.status(400).json({ error: 'Correo electrónico no válido' });
                }
            }

            if (req.body.clave !== undefined) {
                if (!validarContraseña(req.body.clave)) {
                    return res.status(400).json({ error: 'La contraseña no cumple con los requisitos de seguridad' });
                }
            }

            if (req.body.nit !== undefined || req.body.correoElectronico !== undefined) {
                const existingUser = await UsuarioSchema.findOne({
                    $or: [
                        { dpi: dpiBuscar },
                        { nit: req.body.nit },
                        { correoElectronico: req.body.correoElectronico }
                    ]
                });

                if (existingUser) {
                    if (existingUser.dpi !== req.dpi && existingUser.nit === req.body.nit) {
                        return res.status(400).json({ error: 'Ya existe un registro con este nit' });
                    }
                    if (existingUser.dpi !== req.dpi && existingUser.correoElectronico === req.body.correoElectronico) {
                        return res.status(400).json({ error: 'Ya existe un registro con este correo' });
                    }
                }
            }

            const usuarioActualizado = await UsuarioSchema.findOneAndUpdate(
                { dpi: dpiBuscar },
                { $set: updateFields },
                { new: true }
            );

            if (usuarioActualizado) {
                const camposActualizados = {};
                for (const key in updateFields) {
                    if (updateFields.hasOwnProperty(key)) {
                        camposActualizados[key] = usuarioActualizado[key];
                    }
                }
                res.json({ mensaje: 'Perfil actualizado con éxito', camposActualizados });
            } else {
                res.status(404).json({ error: 'Usuario no encontrado' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    } else {
        res.sendStatus(403); // Forbidden
    }
});


// DELETE - ELIMINA EL USUARIO CREADO E INVÁLIDA EL TOKEN
router.delete('/perfil/:dpi', verifyToken, async (req, res) => {
    const dpiBuscar = req.params.dpi;
    if (dpiBuscar == req.dpi) {
        try {
            const usuarioEliminado = await UsuarioSchema.findOneAndDelete(
                { dpi: dpiBuscar }
            );

            if (usuarioEliminado) {
                res.json({ mensaje: 'Usuario eliminado con éxito' });
            } else {
                res.status(404).json({ error: 'Usuario no encontrado' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    } else {
        res.sendStatus(403); // Forbidden
    }
});

module.exports = router;