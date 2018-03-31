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
        index: 0,
    },
    'busy': {
        label: 'Busy',
        icon: 'img/circle-red-6.png',
        color: '255,0,0',
        index: 1,
    },
    'standby': {
        label: 'Disconnected',
        icon: 'img/circle-cyan-6.png',
        color: '0,255,255:1',
        index: 0,
    },
    'away': {
        label: 'Away',
        icon: 'img/circle-orange-6.png',
        color: '255,50,0',
        index: 2,
    },
    'personal': {
        label: 'Personal',
        icon: 'img/circle-blue-6.png',
        color: '0,255,255:1',
        index: 3,
    }
}
const pref = new Preferences('com.bytedriven.beacon', {})
const devices = {}

let trayMenuTemplate
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
        submenu: [
            {
                type: 'radio',
                checked: true,
                label: 'Disconnected',
                click: closeConnection
            },
            {role:'separator'},
        ]
    }

    SerialPort.list()
    .then((data) => {
        let i = 0
        data.forEach((row) => {
            devices[i] = row
            i++
            objectSettings.submenu.push({type: 'radio', label: row.comName, checked: false, click: () => {setDevice(row.comName)}})
        })
        //console.log(`[*] Built port menu: ${objectSettings}`);
    })
    .then(() => {
        tray = new Tray(path.join('', 'img/circle-cyan-6.png'))
        trayMenuTemplate = [
            { type: 'radio', label: 'Available', enabled: boolConnected, click: () => {setStatus('available')} },
            { type: 'radio', label: 'Busy', enabled: boolConnected, click: () => {setStatus('busy')} },
            { type: 'radio', label: 'Away', enabled: boolConnected, click: () => {setStatus('away')} },
            { type: 'radio', label: 'Personal', enabled: boolConnected, click: () => {setStatus('personal')} },
            {role:'separator'},
            objectSettings, 
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
    if (boolConnected) {
        setStatus('standby')
        boolConnected = false
        port.close()
        refreshMenu()
    }
}

function setDevice(name) {
    pref.device = name
    //console.log(name)
    if (pref.device) {
        port = new SerialPort(pref.device, {
            baudRate: 9600
        }) 
        openConnection()
    }
   
}

function setStatus(status) {
    //console.log(`conn: ${boolConnected}, port: ${port}`)
    if (boolConnected && port) {
        currentStatus = status
        const objectStatus = statuses[status]
        //console.log(objectStatus)
        tray.setImage(objectStatus.icon)
        port.write(objectStatus.color, (err) => {
            if (err) {
                console.log(err)
            }
            //port.on('data', data => console.log(data))
        })
        if (objectStatus.index != null) {
            trayMenu.items[objectStatus.index].checked = true
            refreshMenu()
        }
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
            refreshMenu()

        })
    }
}

function refreshMenu() {
    trayMenu.items[0].enabled = boolConnected
    trayMenu.items[1].enabled = boolConnected
    trayMenu.items[2].enabled = boolConnected
    trayMenu.items[3].enabled = boolConnected
    tray.setContextMenu(trayMenu)
}

app.on('ready', createTray);
