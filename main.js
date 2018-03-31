'use strict';

const {Tray, Menu, app, BrowserWindow} = require('electron')
const url = require('url')
const path = require('path')
const SerialPort = require('serialport')
const Preferences = require('preferences')

const statuses = {
    'available': {
        label: 'Available',
        icon: 'img/circle-green-6.png',
        color: '0,255,0',
    },
    'busy': {
        label: 'Busy',
        icon: 'img/circle-red-6.png',
        color: '255,0,0'
    },
    'standby': {
        label: 'Disconnected',
        icon: 'img/circle-cyan-6.png',
        color: '0,255,255:1'
    },
    'away': {
        label: 'Away',
        icon: 'img/circle-orange-6.png',
        color: '255,50,0'
    },
    'personal': {
        label: 'Personal',
        icon: 'img/circle-blue-6.png',
        color: '0,255,255:1'
    }
}
const pref = new Preferences('com.bytedriven.beacon', {})
const devices = {}

let boolConnected = false
let win // window
let currentStatus = 'available'
let tray //tray object
let trayMenu
let port //serial port object
let device //string of device name

/*
if (!pref.device) {
    port = new SerialPort('/dev/ttyACM0', {baudRate: 9600})
    console.log('port ', port)
}
*/

function createTray() {
    const objectSettings = {
        label: 'Devices',
        submenu: []
    }

    SerialPort.list()
    .then((data) => {
        let i = 0
        data.forEach((row) => {
            devices[i] = row
            i++
            objectSettings.submenu.push({label: row.comName, checked: () => {row.comName === pref.device} ,click: () => {setDevice(row.comName)}})
        })
        console.log(`[*] Built port menu: ${objectSettings}`);
    })
    .then(() => {
        tray = new Tray(path.join('', 'img/circle-cyan-6.png'))
        const trayMenuTemplate = [
            { label: 'Available', enabled: boolConnected, click: setStatus('available') },
            { label: 'Busy', enabled: boolConnected, click: setStatus('busy') },
            { label: 'Away', enabled: boolConnected, click: setStatus('away') },
            { label: 'Personal', enabled: boolConnected, click: setStatus('personal') },
            objectSettings, 
            {
                label: 'Disconnect',
                click: closeConnection
            },
            {
                label: 'Exit',
                click: exitApplication
            }
        ]

        trayMenu = Menu.buildFromTemplate(trayMenuTemplate)
        tray.setContextMenu(trayMenu)
        tray.on('click', () => {
            currentStatus === 'busy' ? setStatus('available') : setStatus('busy')
        }) 
    })
    .catch(err => console.log(err));
}

function exitApplication() {
    closeConnection()
    app.quit()
}

function closeConnection() {
    setStatus('standby')
    boolConnected = false
    port.close()
}

function setDevice(name) {
    pref.device = name
    //if (port) {
    //    port.close()
    //}
    console.log(name)
    if (pref.device) {
        port = new SerialPort(pref.device, {
            baudRate: 9600
        }) 
        openConnection()
    }
   
}

function setStatus(status) {
    console.log(`conn: ${boolConnected}, port: ${port}`)
    if (boolConnected && port) {
        currentStatus = status
        tray.setImage(statuses[status].icon)
        port.write(statuses[status].color, (err) => {
            if (err) {
                console.log(err)
            }
            //port.on('data', data => console.log(data))
        })
    }
}

function openConnection() {
    if (port) {
        port.open(() => {
            port.on('error', (err) => {
                console.log(err)
                pref.device = null;
                process.exit()
            })
            boolConnected = true
            setTimeout(() => {setStatus('available')}, 3000)
        })
    }
}

app.on('ready', createTray);
