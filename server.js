const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// conexion base de datos
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB conectado"))
.catch(err => console.log("❌ Error MongoDB:", err));

// Guardado
const ImageSchema = new mongoose.Schema({
    url: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Image = mongoose.model("Image", ImageSchema);

// Permitir conexiones
app.use(cors());

// Permite ver imagenes en navegador
app.use("/images", express.static("uploads"));

// Configuración para recibir archivos
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Ruta de prueba
app.get("/", (req, res) => {
    res.send("Servidor funcionando 🚀");
});

// Endpoint para recibir imagen
app.post("/upload", upload.single("image"), async (req, res) => {
    if (!req.file) {
        console.log("❌ No se recibió imagen");
        return res.status(400).send("No image");
    }

    console.log("📸 Imagen recibida!");

    try {
        // Convertir upload_stream en promesa
        const uploadToCloudinary = () => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { resource_type: "image" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );

                stream.end(req.file.buffer);
            });
        };

        // Subir imagen
        const result = await uploadToCloudinary();

        console.log("☁️ Imagen subida a Cloudinary");
        console.log("URL:", result.secure_url);

        // Guardar en MongoDB
        const newImage = new Image({
            url: result.secure_url
        });

        await newImage.save();

        console.log("💾 Guardado en MongoDB");

        res.json({
            message: "Imagen subida correctamente",
            url: result.secure_url
        });

    } catch (error) {
        console.log("❌ Error:", error);
        res.status(500).send("Error general");
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});