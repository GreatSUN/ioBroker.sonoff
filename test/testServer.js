/* jshint -W097 */
/* jshint strict: true */
/* jslint node: true */
/* jslint esversion: 6 */
'use strict';
const expect = require('chai').expect;
const setup  = require('./lib/setup');

let objects = null;
let states  = null;
let mqttClientEmitter = null;
let mqttClientDetector = null;
let connected = false;
let lastReceivedTopic1;
let lastReceivedMessage1;
let lastReceivedTopic2;
let lastReceivedMessage2;

let clientConnected1 = false;
let clientConnected2 = false;
let brokerStarted    = false;

const rules = {
    'tele/sonoff_4ch/STATE':           {send: '{"Time":"2017-10-02T19:26:06", "Uptime":0, "Vcc":3.226, "POWER1":"OFF", "POWER2":"OFF", "POWER3":"OFF", "POWER4":"OFF", "Wifi":{"AP":1, "SSId":"AAA", "RSSI": 15}}',  expect: {Vcc: 3.226, Wifi_RSSI: 15, Time: '2017-10-02T19:26:06'}},
    'tele/sonoff/SENSOR':              {send: '{"Time":"2017-10-05T17:43:19", "DS18x20":{"DS1":{"Type":"DS18B20", "Address":"28FF9A9876815022A", "Temperature":12.2}}, "TempUnit":"C"}',  expect: {DS18x20_DS1_Temperature: 12.2}},
    'tele/sonoff5/SENSOR':             {send: '{"Time":"2017-10-03T14:02:25", "AM2301-14":{"Temperature":21.6, "Humidity":54.7}, "TempUnit":"C"}',  expect: {'AM2301-14_Temperature': 21.6, 'AM2301-14_Humidity': 54.7}},
    'tele/SonoffPOW/INFO1':            {send: '{"Module":"Sonoff Pow", "Version":"5.8.0", "FallbackTopic":"SonoffPOW", "GroupTopic":"sonoffs"}',  expect: {'INFO.Module': 'Sonoff Pow', 'INFO.Version': '5.8.0'}},
    'tele/SonoffPOW/INFO2':            {send: '{"WebServerMode":"Admin", "Hostname":"Sonoffpow", "IPAddress":"192.168.2.182"}',  expect: {'INFO.Hostname': 'Sonoffpow', 'INFO.IPAddress': '192.168.2.182'}},
    'tele/SonoffPOW/INFO3':            {send: '{"RestartReason":"Software/System restart"}',  expect: {'INFO.RestartReason': 'Software/System restart'}},
    'tele/sonoff_4ch/ENERGY':          {send: '{"Time":"2017-10-02T19:24:32", "Total":1.753, "Yesterday":0.308, "Today":0.205, "Period":0, "Power":3, "Factor":0.12, "Voltage":221, "Current":0.097}',  expect: {'ENERGY.Total': 1.753, 'ENERGY.Current': 0.097}},
    'tele/sonoff_4ch/ENERGY1':         {send: '"Time":"2017-10-02T19:24:32", "Total":1.753, "Yesterday":0.308, "Today":0.205, "Period":0, "Power":3, "Factor":0.12, "Voltage":221, "Current":0.097}',  expect: {}},
    'tele/sonoff_1ch/STATE':           {send: '{"Time":"2017-10-02T19:24:32", "Color": "112233"}',  expect: {}},
    'tele/sonoff/STATE':               {send: '{"Time":"2018-06-19T06:39:33","Uptime":"0T23:47:32","Vcc":3.482,"POWER":"OFF","Dimmer":100,"Color":"000000FF","HSBColor":"0,0,0","Channel":[0,0,0,100],"Scheme":0,"Fade":"OFF","Speed":4,"LedTable":"OFF","Wifi":{"AP":1,"SSId":"WLAN-7490","RSSI":50,"APMac":"34:31:C4:C6:EB:0F"}}',
        expect:{}},
    'tele/sonoff1/SENSOR':             {send: '{"Time":"2018-06-15T10:03:24","DS18B20":{"Temperature":0.0},"TempUnit":"C"}', expect: {'DS18B20_Temperature': 0}},
    'tele/nan/SENSOR':                 {send: '{"Time":"2018-10-31T11:57:31","SI7021-00":{"Temperature":17.1,"Humidity":70.0},"SI7021-02":{"Temperature":nan,"Humidity":nan},"SI7021-04":{"Temperature":10.0,"Humidity":59.7},"SI7021-05":{"Temperature":8.8,"Humidity":79.3},"TempUnit":"C"}', expect: {'SI7021-04_Temperature': 10}},
    'tele/true/SENSOR':                {send: '{"Time":"2017-10-02T19:26:06", "Uptime":0, "Vcc":3.226, "POWER1":"true"}', expect: {POWER1: true}},
    '/ESP_BOX/BM280/Pressure':         {send: '1010.09',    expect: {'Pressure': 1010.09}},
    '/ESP_BOX/BM280/Humidity':         {send: '42.39',      expect: {'Humidity': 42.39}},
    '/ESP_BOX/BM280/Temperature':      {send: '25.86',      expect: {'Temperature': 25.86}},
    '/ESP_BOX/BM280/Approx. Altitude': {send: '24',         expect: {'Approx_Altitude': 24}},
    'stat/sonoff/POWER':               {send: 'ON',         expect: {'POWER': true}},
    'cmnd/sonoff/POWER':               {send: '',           expect: {}},
    'stat/sonoff/RESULT':              {send: '{"POWER": "ON"}', expect: {'RESULT': null}},
    'stat/sonoff/LWT':                 {send: 'someTopic',  expect: {'LWT': null}},
    'stat/sonoff/ABC':                 {send: 'text',       expect: {'ABC': null}},
    'tele/tasmota_0912A7/STATE':       {send: '{"Time":"2021-05-02T18:08:19","Uptime":"0T03:15:43","UptimeSec":11743,"Heap":26,"SleepMode":"Dynamic","Sleep":50,"LoadAvg":19,"MqttCount":11,"POWER":"ON","Wifi":{"AP":1,"SSId":"Skynet","BSSId":"3C:A6:2F:23:6A:94","Channel":6,"RSSI":52,"Signal":-74,"LinkCount":1,"Downtime":"0T00:00:07"}}', expect: {'Wifi_Downtime': '0T00:00:07'}},
    'tele/Hof/Lager/Tasmota/Relais/RFresv/Beleuchtung/UV/Beleuchtungsstaerke/Außenlampe/SENSOR':
        {
            send: '{"Time":"2021-05-28T14:30:44","BH1750":{"Illuminance":27550},"VEML6075":{"UvaIntensity":1710,"UvbIntensity":890,"UvIndex":2.4}}',
            expect: {'VEML6075_UvIndex': 2.4}
        },
};

function decrypt(key, value) {
    let result = '';
    for (let i = 0; i < value.length; ++i) {
        result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
    }
    return result;
}

function startClients(_done) {
    // start mqtt client
    const MqttClient = require('./lib/mqttClient.js');

    // Start client to emit topics
    mqttClientEmitter = new MqttClient(connected => {
        // on connected
        if (connected) {
            console.log('Test MQTT Emitter is connected to MQTT broker');
            clientConnected1 = true;
            if (_done && brokerStarted && clientConnected1 && clientConnected2) {
                _done();
                _done = null;
            }
        }
    }, (topic, message) => {
        console.log(Date.now() + ' emitter received ' + topic + ': ' + message.toString());
        // on receive
        lastReceivedTopic1   = topic;
        lastReceivedMessage1 = message ? message.toString() : null;
    }, {name: 'Emitter*1', user: 'user', pass: 'pass1'});

    // Start client to receive topics
    mqttClientDetector = new MqttClient(connected => {
        // on connected
        if (connected) {
            console.log('Test MQTT Detector is connected to MQTT broker');
            clientConnected2 = true;
            if (_done && brokerStarted && clientConnected1 && clientConnected2) {
                _done();
                _done = null;
            }
        }
    }, (topic, message) => {
        console.log(Date.now() + ' detector received ' + topic + ': ' + message.toString());
        // on receive
        lastReceivedTopic2   = topic;
        lastReceivedMessage2 = message ? message.toString() : null;
        console.log(JSON.stringify(lastReceivedMessage2));
    }, {name: 'Detector-1', user: 'user', pass: 'pass1'});
}

function checkMqtt2Adapter(id, task, _it, _done) {
    _it.timeout(1000);

    lastReceivedMessage1 = null;
    lastReceivedTopic1   = null;
    lastReceivedTopic2   = null;
    lastReceivedMessage2 = null;

    console.log(`[${new Date().toISOString()}] Publish ${id}: ${task.send}`);
    mqttClientEmitter.publish(id, task.send, err => {
        expect(err).to.be.undefined;

        setTimeout(() => {
            let count = 0;
            for (let e in task.expect) {
                if (! task.expect.hasOwnProperty(e)) {
                    continue;
                }
                count++;
                (function (_id, _val) {
                    objects.getObject('sonoff.0.Emitter_1.' + _id, (err, obj) => {
                        if (_val !== null) {
                            !obj && console.error(`Object sonoff.0.Emitter_1.${_id} not found`);
                            expect(obj).to.be.not.null.and.not.undefined;
                            expect(obj._id).to.be.equal('sonoff.0.Emitter_1.' + _id);
                            expect(obj.type).to.be.equal('state');

                            states.getState(obj._id, function (err, state) {
                                expect(state).to.be.not.null.and.not.undefined;
                                expect(state.val).to.be.equal(_val);
                                expect(state.ack).to.be.true;
                                if (!--count) _done();
                            });
                        } else {
                            expect(obj).to.be.null;

                            states.getState('sonoff.0.Emitter_1.' + _id, (err, state) => {
                                expect(state).to.be.null;
                                if (!--count) _done();
                            });
                        }
                    });
                })(e, task.expect[e]);
            }
            if (!count) _done();
        }, 200);
    });
}

function checkAdapter2Mqtt(id, mqttid, value, _done) {
    console.log(`${new Date().toISOString()} Send ${id} with value ${value}`);

    lastReceivedTopic1   = null;
    lastReceivedMessage1 = null;
    lastReceivedTopic2   = null;
    lastReceivedMessage2 = null;

    states.setState(id, {
        val: value,
        ack: false
    }, (err, id) => {
        setTimeout(() => {
            if (!lastReceivedTopic1) {
                setTimeout(() => {
                    expect(lastReceivedTopic1).to.be.equal(mqttid);
                    expect(lastReceivedMessage1).to.be.equal(value ? 'ON' : 'OFF');
                    _done();
                }, 200);
            } else {
                expect(lastReceivedTopic1).to.be.equal(mqttid);
                expect(lastReceivedMessage1).to.be.equal(value ? 'ON' : 'OFF');
                _done();
            }
        }, 1000);
    });
}

function checkConnection(value, done, counter) {
    counter = counter || 0;
    if (counter > 20) {
        done && done('Cannot check ' + value);
        return;
    }

    states.getState('sonoff.0.info.connection', (err, state) => {
        if (err) console.error(err);
        if (state && typeof state.val === 'string' && ((value && state.val.indexOf(',') !== -1) || (!value && state.val.indexOf(',') === -1))) {
            connected = value;
            done();
        } else {
            setTimeout(() => {
                checkConnection(value, done, counter + 1);
            }, 1000);
        }
    });
}

describe('Sonoff server: Test mqtt server', () => {
    before('Sonoff server: Start js-controller', function (_done) { //
        this.timeout(600000); // because of first install from npm
        setup.adapterStarted = false;

        setup.setupController(async systemConfig => {
            let config = await setup.getAdapterConfig();
            // enable adapter
            config.common.enabled  = true;
            config.common.loglevel = 'debug';
            config.native.user     = 'user';
            config.native.pass     = decrypt(systemConfig.native.secret, 'pass1');

            await setup.setAdapterConfig(config.common, config.native);

            setup.startController((_objects, _states) => {
                objects = _objects;
                states  = _states;
                brokerStarted = true;
                if (_done && brokerStarted && clientConnected1 && clientConnected2) {
                    _done();
                    _done = null;
                }
            });
        });

        startClients(_done);
    });

    it('Sonoff Server: Check if connected to MQTT broker', done => {
        if (!connected) {
            checkConnection(true, done);
        } else {
            done();
        }
    }).timeout(2000);

    for (let r in rules) {
        (function(id, task) {
            it('Sonoff Server: Check receive ' + id, function (done) { // let FUNCTION here
                checkMqtt2Adapter(id, task, this, done);
            });
        })(r, rules[r]);
    }

    // give time to client to receive all messages
    it('wait', done => {
        setTimeout(() => done(), 1000);
    }).timeout(3000);

    it.skip('Sonoff server: detector must receive cmnd/sonoff/POWER', done => {
        checkAdapter2Mqtt('sonoff.0.Emitter_1.POWER', 'cmnd/sonoff/POWER', false, done);
    }).timeout(2000);

    it('Sonoff Server: check reconnection', done => {
        mqttClientEmitter.stop();
        mqttClientDetector.stop();
        checkConnection(false, error => {
            expect(error).to.be.not.ok;
            startClients();
            checkConnection(true, error => {
                expect(error).to.be.not.ok;
                done();
            });
        });
    }).timeout(10000);

    after('Sonoff Server: Stop js-controller', function (_done) { // let FUNCTION and not => here
        this.timeout(5000);
        mqttClientEmitter.stop();
        mqttClientDetector.stop();
        setup.stopController(() => _done());
    });
});
