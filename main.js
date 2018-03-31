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
        color: [0, 255, 0],
        mode: 0,
        index: 0,
    },
    'busy': {
        label: 'Busy',
        icon: 'img/circle-red-6.png',
        color: [255, 0, 0],
        mode: 0,
        index: 1,
    },
    'standby': {
        label: 'Disconnected',
        icon: 'img/circle-cyan-6.png',
        color: [0, 255, 255],
        mode: 1,
        index: 0,
    },
    'away': {
        label: 'Away',
        icon: 'img/circle-orange-6.png',
        color: [255, 50, 0],
        mode: 0,
        index: 2,
    },
    'personal': {
        label: 'Personal',
        icon: 'img/circle-blue-6.png',
        color: [0, 0, 255],
        mode: 0,
        index: 3,
    }
}
const pref = new Preferences('com.bytedriven.beacon', {})
const devices = {}

let brightness = pref.brightness || 100
let trayMenuTemplate
let boolConnected = false
let win // window
let currentStatus = 'available'
let tray //tray object
let trayMenu
let port //serial port object
let device //string of device name
console.log(pref)
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
                click: () => {closeConnection(true)}
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
            objectSettings.submenu.push({type: 'radio', label: row.comName, checked: (pref.device != null && row.comName == pref.device), click: () => {setDevice(row.comName)}})
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
            { label: 'Brightness', submenu: [
                { type: 'radio', label: '10%', checked: (brightness == 10), click: () => {setBrightness(10)} },
                { type: 'radio', label: '20%', checked: (brightness == 20), click: () => {setBrightness(20)} },
                { type: 'radio', label: '30%', checked: (brightness == 30), click: () => {setBrightness(30)} },
                { type: 'radio', label: '40%', checked: (brightness == 40), click: () => {setBrightness(40)} },
                { type: 'radio', label: '50%', checked: (brightness == 50), click: () => {setBrightness(50)} },
                { type: 'radio', label: '60%', checked: (brightness == 60), click: () => {setBrightness(60)} },
                { type: 'radio', label: '70%', checked: (brightness == 70), click: () => {setBrightness(70)} },
                { type: 'radio', label: '80%', checked: (brightness == 80), click: () => {setBrightness(80)} },
                { type: 'radio', label: '90%', checked: (brightness == 90), click: () => {setBrightness(90)} },
                { type: 'radio', label: '100%', checked: (brightness == 100), click: () => {setBrightness(100)} },
            ] },
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
    .then(() => {
        if (pref.device != null) {
            setTimeout(setDevice(pref.device), 1000)
        }
    })
    .catch(err => console.log(err));
}

function exitApplication() {
    closeConnection()
    app.quit()
}

function closeConnection(forget = false) {
    if (boolConnected) {
        setStatus('standby')
        boolConnected = false
        if (forget) { 
            pref.device = null
        }
        port.close()
        refreshMenu()
    }
}

function setBrightness(value) {
    brightness = value
    pref.brightness = brightness
    setStatus(currentStatus)
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
    console.log(`conn: ${boolConnected}, port: ${port}`)
    if (boolConnected && port) {
        currentStatus = status
        const objectStatus = statuses[status]
        //console.log(objectStatus)
        tray.setImage(objectStatus.icon)
        const arrayBrightAdjusted = objectStatus.color.map(x => (x / 100) * brightness)
        const stringColor = arrayBrightAdjusted.join(',')
        const serialCommand = [stringColor, objectStatus.mode].join(':')
        port.write(serialCommand, (err) => {
            if (err) {
                console.log(err)
            }
            port.on('data', data => console.log(data))
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
