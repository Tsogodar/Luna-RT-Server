const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const os = require('os');
const exec = require('child_process').exec;

const database = require('./database');

const port = 3000;
const app = express();

let logger = (data) => {
    fs.appendFileSync(path.join(__dirname, 'log.txt'), data + '\n\n')
}

const socketConnection = socketIo(app.listen(port, () => {
    console.log('Server up');
}))

socketConnection.on('connection', (socket) => {
    const responseTime = new Date();
    let message = `Nowe połączenie od klienta ${socket.id} - ${responseTime}`
    console.log(message);
    logger(message);
    socketConnection.to(socket.id).emit('connectOk');
    socket.on('login', (creds) => {
        database.login(creds, (res) => {
            if (res) {
                const responseTime = new Date();
                let message = `Klient ${socket.id} zalogowany jako admin o ${responseTime}`;
                logger(message)
                console.log(`Zalogowano w grupie ${res.group}`)
                socketConnection.to(socket.id).emit('loginStatus', {
                    user: true,
                    message: 'Zalogowano w grupie ' + res.group
                });
            } else {
                const responseTime = new Date();
                let message = `Klient ${socket.id} podał błędne dane uwierzytelnające admonistartora ${responseTime}`;
                logger(message)
                console.log(`Błędne dane logowania`)
                socketConnection.to(socket.id).emit('loginStatus', {user: false, message: 'Błędne dane logowania'});
            }
        })
    });

    socket.on('logout', () => {
        const responseTime = new Date();
        let message = `Klient ${socket.id} odłączony od serwera o ${responseTime}`
        console.log(message);
        logger(message);
        socketConnection.to(socket.id).emit('logoutOk', {message: 'Pomyślnie wylogowano'});
        socket.disconnect(true)
        delete socket.id;
    })

    socket.on('log', () => {
        let readLog = fs.readFileSync(path.join(__dirname, 'log.txt'), 'utf8').split('\n');
        const responseTime = new Date();
        let message = `Klient ${socket.id} wyświetlił log serwera o ${responseTime}`
        console.log(message);
        logger(message);
        socketConnection.to(socket.id).emit('logStatus', {message: `Log serwera zawiera ${readLog.length} linii`});
    })

    socket.on('serverInfo', () => {
        // console.log('SI');
        let serverInfo = {
            platform: os.platform(),
            architecture: os.arch(),
            cpu: os.cpus(),
            cpuLogicalCores: os.cpus().length,
            uptime: Math.floor(os.uptime()),
            totalMem: os.totalmem(),
            freeMem: os.freemem()
        }
        socketConnection.to(socket.id).emit('serverInfoStatus', {info: serverInfo});
    })

    socket.on('serverRestart', () => {
        socketConnection.emit('serverRestartStatus');
        socketConnection.to(socket.id).emit('serverRestartStatus', {message: 'Restart serwera'});
        Object.keys(socketConnection.sockets.sockets).forEach((socket) => {
            socketConnection.sockets.sockets[socket].disconnect(true);
            delete socket;
        });
        exec('node app.js', (err, stdout, stder) => {
            console.log(`Zrestartowano serwer`);
        });
    })

    socket.on('serverShutdown', () => {
        socketConnection.emit('serverShutdownStatus');
        socketConnection.to(socket.id).emit('serverShutdownStatus', {message: 'Wyłączenie serwera'});
        Object.keys(socketConnection.sockets.sockets).forEach((socket) => {
            socketConnection.sockets.sockets[socket].disconnect(true);
            delete socket;
        });
        exec('node app.js', (err, stdout, stder) => {
            console.log(`Wyłączono serwer`);
            process.exit(0);
        });
    })

    socket.on('usersInfo', () => {
        let details = [];
        Object.keys(socketConnection.sockets.sockets).forEach((socket) => {
            return details.push({
                id: socketConnection.sockets.sockets[socket].id,
                address: socketConnection.sockets.sockets[socket].handshake.address
            })
        });
        let usersInfo = {
            allConnections: socketConnection.engine.clientsCount,
            usersCount: (socketConnection.engine.clientsCount - 1),
            usersDetails: details
        }
        socketConnection.to(socket.id).emit('usersInfoStatus', {info: usersInfo});
    })

    socket.on('userForceDisconnect', (userId) => {
        console.log(userId);
        socketConnection.to(userId).emit('userDisconnectForceStatus', {
            info: 'Administrator zakończył' +
            ' połączenie'
        });
        socketConnection.sockets.sockets[userId].disconnect(true);
        delete socketConnection.sockets.sockets[userId];
    })

    socket.on('userDisconnect', () => {
        socketConnection.to(socket.id).emit('userDisconnectStatus', {info: 'Zakończono połączenie z serwerem'});
        socketConnection.sockets.sockets[socket.id].disconnect(true);
        delete socketConnection.sockets.sockets[socket.id];
    })

    socket.on('userConnect', () => {
        console.log(socket.id);
        socketConnection.to(socket.id).emit('userConnectStatus', {
            info: 'Połączono z serwerem',
            connected: true,
            socketId: socket.id
        });
    })

    socket.on('messageDelivered', () => {
        console.log('response');
        socketConnection.to(socket.id).emit('messageDeliveredStatus', {info: 'Wiadomość dostarczona'});
    })

    socket.on('message', (id, message) => {
        console.log(message);
        socketConnection.to(id).emit('userNewMessage', {info: message});
    })


});