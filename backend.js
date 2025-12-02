const express = require('express')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const mysql = require('mysql2')
const multer = require('multer')
const path = require('path')

const app = express()
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))) // servir archivos

// Configuración de Multer para subir archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname)
  }
})
const upload = multer({ storage })

// Conexión a MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',            // tu usuario de MySQL
  password: '',            // tu contraseña de MySQL
  database: 'trifix_db'    // el nombre de tu base creada en Workbench
})

db.connect(err => {
  if (err) {
    console.error('❌ Error de conexión a MySQL:', err)
  } else {
    console.log('✅ Conectado a MySQL 🚀')
  }
})

// ------------------- RUTAS USUARIOS -------------------

// Registro de usuario
app.post('/register', async (req, res) => {
  const { nombre, apellido, correo, telefono, ubicacion, contraseña } = req.body
  try {
    const hashedPassword = await bcrypt.hash(contraseña, 10)
    const query = `INSERT INTO usuarios (nombre, apellido, correo, telefono, ubicacion, contraseña) VALUES (?, ?, ?, ?, ?, ?)`
    db.query(query, [nombre, apellido, correo, telefono, ubicacion, hashedPassword], (err, result) => {
      if (err) return res.status(500).json({ error: 'Error al registrar usuario' })
      res.json({ mensaje: 'Usuario registrado correctamente' })
    })
  } catch (error) {
    res.status(500).json({ error: 'Error interno en registro' })
  }
})

// Login de usuario
app.post('/login', (req, res) => {
  const { correo, contraseña } = req.body
  const query = `SELECT * FROM usuarios WHERE correo = ?`

  db.query(query, [correo], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Error en login' })
    if (results.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' })

    const usuario = results[0]
    const match = await bcrypt.compare(contraseña, usuario.contraseña)

    if (!match) return res.status(401).json({ error: 'Contraseña incorrecta' })

    // Generar token JWT
    const token = jwt.sign({ id: usuario.id }, 'clave_secreta', { expiresIn: '1h' })
    res.json({ mensaje: 'Login exitoso', token })
  })
})

// Obtener perfil
app.get('/perfil/:id', (req, res) => {
  const { id } = req.params
  const query = `SELECT id, nombre, apellido, correo, telefono, ubicacion FROM usuarios WHERE id = ?`

  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener perfil' })
    if (results.length === 0) return res.status(404).json({ error: 'Perfil no encontrado' })
    res.json(results[0])
  })
})

// Actualizar perfil
app.put('/perfil/:id', async (req, res) => {
  const { id } = req.params
  const { nombre, apellido, correo, telefono, ubicacion, nuevaContraseña } = req.body

  try {
    let query = `UPDATE usuarios SET nombre=?, apellido=?, correo=?, telefono=?, ubicacion=?`
    let params = [nombre, apellido, correo, telefono, ubicacion]

    if (nuevaContraseña) {
      const hashedPassword = await bcrypt.hash(nuevaContraseña, 10)
      query += `, contraseña=?`
      params.push(hashedPassword)
    }

    query += ` WHERE id=?`
    params.push(id)

    db.query(query, params, (err, result) => {
      if (err) return res.status(500).json({ error: 'Error al actualizar perfil' })
      res.json({ mensaje: 'Perfil actualizado correctamente' })
    })
  } catch (error) {
    res.status(500).json({ error: 'Error interno en actualización' })
  }
})

// Eliminar perfil
app.delete('/perfil/:id', (req, res) => {
  const { id } = req.params
  const query = `DELETE FROM usuarios WHERE id=?`

  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al eliminar perfil' })
    res.json({ mensaje: 'Perfil eliminado correctamente' })
  })
})

// ------------------- PUBLICACIONES -------------------

// Crear publicación con evidencias
app.post('/publicaciones', upload.array('evidencias'), (req, res) => {
  const { usuario_id, titulo, descripcion, prioridad, estado_id, municipio_id, colonia_id } = req.body
  const archivos = req.files

  const query = `INSERT INTO publicaciones (usuario_id, titulo, descripcion, prioridad, estado_id, municipio_id, colonia_id) VALUES (?, ?, ?, ?, ?, ?, ?)`

  db.query(query, [usuario_id, titulo, descripcion, prioridad, estado_id, municipio_id, colonia_id], (err, result) => {
    if (err) {
      console.error('❌ Error al guardar publicación:', err)
      return res.status(500).json({ error: 'Error al guardar publicación' })
    }

    const publicacionId = result.insertId

    if (archivos && archivos.length > 0) {
      archivos.forEach(file => {
        const evidenciaQuery = `INSERT INTO evidencias (publicacion_id, archivo_url) VALUES (?, ?)`
        db.query(evidenciaQuery, [publicacionId, file.path])
      })
    }

    res.json({ mensaje: 'Publicación creada correctamente' })
  })
})

// Obtener publicaciones
app.get('/publicaciones', (req, res) => {
  const query = `
    SELECT p.id, p.titulo, p.descripcion, p.prioridad, p.fecha_publicacion,
           u.nombre AS usuario, e.nombre AS estado, m.nombre AS municipio, c.nombre AS colonia
    FROM publicaciones p
    JOIN usuarios u ON p.usuario_id = u.id
    LEFT JOIN estados e ON p.estado_id = e.id
    LEFT JOIN municipios m ON p.municipio_id = m.id
    LEFT JOIN colonias c ON p.colonia_id = c.id
    ORDER BY p.fecha_publicacion DESC
  `
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener publicaciones' })
    res.json(results)
  })
})

// ------------------- PUERTO -------------------
const PORT = 3006
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`)
})
