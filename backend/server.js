const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost', 'http://127.0.0.1', 'file://'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Shërbej faqet statike nga dosja frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Lidhja me MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nightclub', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ U lidh me MongoDB me sukses');
  } catch (error) {
    console.error('❌ Gabim në lidhje me MongoDB:', error.message);
    process.exit(1);
  }
};

connectDB();

// Modeli i Rezervimit
const Rezervimi = require('./models/Rezervimi');

// Middleware për loggjim requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rruga kryesore - hap automatikisht home.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/home.html'));
});

// Rruga për faqet e tjera
app.get('/:page', (req, res) => {
  const page = req.params.page;
  const allowedPages = ['home', 'club', 'evente', 'rezervime'];
  
  if (allowedPages.includes(page)) {
    res.sendFile(path.join(__dirname, `../frontend/${page}.html`));
  } else {
    res.status(404).send('Faqja nuk u gjet');
  }
});

// Rruga për rezervimet - POST
app.post('/api/rezervime', async (req, res) => {
  try {
    console.log('📥 Request për rezervim:', req.body);

    const { Emer, mbiemer, Email, Mosha, Numri, Eventet, Biletat } = req.body;

    // Validimi i të dhënave
    if (!Emer || !mbiemer || !Email || !Mosha || !Numri || !Eventet || !Biletat) {
      return res.status(400).json({ 
        error: 'Të gjitha fushat janë të detyrueshme' 
      });
    }

    if (Mosha < 18) {
      return res.status(400).json({ 
        error: 'Duhet të jeni të paktën 18 vjeç për të rezervuar' 
      });
    }

    // Kontrollo nëse data e eventit është në të shkuarën
    const dataEventit = new Date(Eventet);
    const dataSot = new Date();
    dataSot.setHours(0, 0, 0, 0);
    
    if (dataEventit < dataSot) {
      return res.status(400).json({ 
        error: 'Data e eventit nuk mund të jetë në të shkuarën' 
      });
    }

    // Krijo rezervimin e ri
    const rezervimiIRi = new Rezervimi({
      Emer: Emer.trim(),
      mbiemer: mbiemer.trim(),
      Email: Email.trim().toLowerCase(),
      Mosha: parseInt(Mosha),
      Numri: Numri.trim(),
      Eventet: dataEventit,
      Biletat: Biletat.trim()
    });

    // Ruaj në database
    const rezervimiRuajtur = await rezervimiIRi.save();
    
    console.log('✅ Rezervimi u ruajt:', rezervimiRuajtur._id);

    res.status(201).json({
      success: true,
      message: 'Rezervimi u ruajt me sukses!',
      data: {
        id: rezervimiRuajtur._id,
        emer: rezervimiRuajtur.Emer,
        mbiemer: rezervimiRuajtur.mbiemer,
        email: rezervimiRuajtur.Email,
        eventi: rezervimiRuajtur.Eventet.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('❌ Gabim në ruajtjen e rezervimit:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Të dhëna jo valide: ' + errors.join(', ') 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Keni një rezervim tashmë për këtë event' 
      });
    }

    res.status(500).json({ 
      error: 'Gabim i serverit gjatë ruajtjes së rezervimit' 
    });
  }
});

// Rruga për të marrë të gjitha rezervimet - GET
app.get('/api/rezervime', async (req, res) => {
  try {
    const rezervimet = await Rezervimi.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: rezervimet.length,
      data: rezervimet
    });
  } catch (error) {
    console.error('❌ Gabim në marrjen e rezervimeve:', error);
    res.status(500).json({ 
      error: 'Gabim i serverit gjatë marrjes së rezervimeve' 
    });
  }
});

// Rruga për të marrë një rezervim sipas ID - GET
app.get('/api/rezervime/:id', async (req, res) => {
  try {
    const rezervimi = await Rezervimi.findById(req.params.id);
    
    if (!rezervimi) {
      return res.status(404).json({ 
        error: 'Rezervimi nuk u gjet' 
      });
    }
    
    res.json({
      success: true,
      data: rezervimi
    });
  } catch (error) {
    console.error('❌ Gabim në marrjen e rezervimit:', error);
    res.status(500).json({ 
      error: 'Gabim i serverit' 
    });
  }
});

// Rruga për të fshirë një rezervim - DELETE
app.delete('/api/rezervime/:id', async (req, res) => {
  try {
    const rezervimi = await Rezervimi.findByIdAndDelete(req.params.id);
    
    if (!rezervimi) {
      return res.status(404).json({ 
        error: 'Rezervimi nuk u gjet' 
      });
    }
    
    res.json({ 
      success: true,
      message: 'Rezervimi u fshi me sukses' 
    });
  } catch (error) {
    console.error('❌ Gabim në fshirjen e rezervimit:', error);
    res.status(500).json({ 
      error: 'Gabim i serverit gjatë fshirjes së rezervimit' 
    });
  }
});

// Rruga për kontroll shëndeti
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../frontend/404.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('💥 Error:', error);
  res.status(500).json({ 
    error: 'Diçka shkoi keq në server' 
  });
});

// Nis serverin
app.listen(PORT, () => {
  console.log(`🚀 Serveri është duke punuar në http://localhost:${PORT}`);
  console.log(`🏠 Faqja kryesore do të hapet automatikisht`);
  console.log(`📊 Database: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/nightclub'}`);
  
  // Hap automatikisht browser-in (opsionale)
  const { exec } = require('child_process');
  const url = `http://localhost:${PORT}`;
  
  // Për Windows
  exec(`start ${url}`, (error) => {
    if (error) {
      // Për macOS
      exec(`open ${url}`, (error2) => {
        if (error2) {
          // Për Linux
          exec(`xdg-open ${url}`, (error3) => {
            if (error3) {
              console.log(`🎯 Hap manualisht browser-in: ${url}`);
            }
          });
        }
      });
    }
  });
});