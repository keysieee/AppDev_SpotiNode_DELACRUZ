const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2'); 

const app = express();


app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs'); 
app.use(express.static('public')); 


const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'keysiee' 
});


db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL Database.');
});


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads'); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});
const upload = multer({ storage: storage });


app.get('/', (req, res) => {
    getUploadedSongs((songs) => {
        res.render('index', { songs }); 
    });
});




app.post('/upload', upload.fields([{ name: 'mp3file', maxCount: 1 }, { name: 'albumCover', maxCount: 1 }]), (req, res) => {
    const uploaderName = req.body.uploaderName; 
    const mp3File = req.files['mp3file'][0];
    const albumCover = req.files['albumCover'] ? req.files['albumCover'][0] : null;

    const filename = mp3File.filename;
    const filepath = `/uploads/${filename}`;
    const albumCoverPath = albumCover ? `/uploads/${albumCover.filename}` : null;

    
    const query = 'INSERT INTO songs (filename, filepath, album_cover, uploader_name) VALUES (?, ?, ?, ?)'; 
    db.query(query, [filename, filepath, albumCoverPath, uploaderName], (err, result) => {
        if (err) {
            console.error(`Failed to insert into database: ${err}`);
            return res.status(500).send('Database error');
        }
        console.log('File information saved to database');
        res.redirect('/');
    });
});


app.post('/delete', (req, res) => {
    const songId = req.body.song_id;

    
    const query = 'SELECT filepath, album_cover FROM songs WHERE id = ?'; 
    db.query(query, [songId], (err, results) => {
        if (err || results.length === 0) {
            console.error(`Song not found: ${err}`);
            return res.status(404).send('Song not found');
        }

        const filepath = path.join(__dirname, 'public', results[0].filepath);
        const albumCoverPath = results[0].album_cover ? path.join(__dirname, 'public', results[0].album_cover) : null;

        
        fs.unlink(filepath, (err) => {
            if (err) {
                console.error(`Failed to delete file: ${err}`);
                return res.status(500).send('File deletion error');
            }

            if (albumCoverPath) {
                fs.unlink(albumCoverPath, (err) => {
                    if (err) {
                        console.error(`Failed to delete album cover: ${err}`);
                    }
                });
            }

            
            const deleteQuery = 'DELETE FROM songs WHERE id = ?'; 
            db.query(deleteQuery, [songId], (err) => {
                if (err) {
                    console.error(`Failed to delete from database: ${err}`);
                    return res.status(500).send('Database deletion error');
                }
                console.log('File and database entry deleted successfully.');
                res.redirect('/');
            });
        });
    });
});


function getUploadedSongs(callback) {
    const query = 'SELECT * FROM songs ORDER BY uploaded_at DESC'; 
    db.query(query, (err, results) => {
        if (err) throw err;
        callback(results);
    });
}


app.listen(3006, () => {
    console.log(`Server is running on http://localhost:3006`);
});
