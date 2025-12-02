import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mysql from 'mysql2';

const app = express();
app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', 
  database: 'trifix_db'
});

db.connect((err) => {
  if (err) {
    console.error('Error al conectar a MySQL:', err.message);
  } else {
    console.log('Conexión exitosa a la base de datos trifix_db');
  }
});

app.post('/api/register', (req, res) => {
  const { nombre, correo, contraseña } = req.body;

  if (!nombre || !correo || !contraseña) {
    return res.status(400).send('Faltan datos para registrar');
  }

  const query = 'INSERT INTO usuarios (nombre, correo, contraseña) VALUES (?, ?, ?)';
  db.query(query, [nombre, correo, contraseña], (err, result) => {
    if (err) {
      if (err.code === 'ER_NO_SUCH_TABLE') {
        return res.status(500).send('La tabla usuarios no existe');
      }
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).send('El correo ya está registrado');
      }
      console.error('Error al registrar usuario:', err.message);
      return res.status(500).send('Error interno al registrar usuario');
    }

    res.status(200).send('Usuario registrado correctamente');
  });
});

app.get('/api/user', (req, res) => {
  const { correo } = req.query;
  if (!correo) return res.status(400).send('Falta el correo');

  const query = 'SELECT id, nombre, correo, fecha_registro FROM usuarios WHERE correo = ? LIMIT 1';
  db.query(query, [correo], (err, results) => {
    if (err) {
      console.error('Error al obtener usuario:', err.message);
      return res.status(500).send('Error interno al obtener usuario');
    }
    if (results.length === 0) return res.status(404).send('Usuario no encontrado');
    res.status(200).json(results[0]);
  });
});

app.put('/api/user', (req, res) => {
  const { correoOriginal, nombreNuevo, correoNuevo } = req.body;
  if (!correoOriginal || !nombreNuevo || !correoNuevo) {
    return res.status(400).send('Faltan datos para actualizar');
  }

  const query = 'UPDATE usuarios SET nombre = ?, correo = ? WHERE correo = ?';
  db.query(query, [nombreNuevo, correoNuevo, correoOriginal], (err, result) => {
    if (err) {
      console.error('Error al actualizar usuario:', err.message);
      return res.status(500).send('Error al actualizar usuario');
    }
    if (result.affectedRows === 0) {
      return res.status(404).send('Usuario no encontrado');
    }
    res.status(200).send('Usuario actualizado correctamente');
  });
});

app.post('/api/delete-user', (req, res) => {
  const { correo } = req.body;
  if (!correo) return res.status(400).send('Falta el correo para eliminar');

  const query = 'DELETE FROM usuarios WHERE correo = ?';
  db.query(query, [correo], (err, result) => {
    if (err) {
      console.error('Error al eliminar usuario:', err.message);
      return res.status(500).send('Error al eliminar usuario');
    }
    if (result.affectedRows === 0) {
      return res.status(404).send('Usuario no encontrado');
    }
    res.status(200).send('Usuario eliminado correctamente');
  });
});

app.get('/', (req, res) => {
  res.send('Servidor API TriFix funcionando correctamente');
});

app.listen(4000, () => {
  console.log('Servidor corriendo en http://localhost:4000');
});
