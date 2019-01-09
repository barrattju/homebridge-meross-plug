"use strict";

const request = require('request');

let Service, Characteristic;

// Wrap request with a promise to make it awaitable
function doRequest(options) {
  return new Promise(function (resolve, reject) {
    request(options, function (error, res, body) {
      if (!error && res.statusCode == 200) {
        resolve(body);
      } else {
        reject(error);
      }
    });
  });
}

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-meross-plug", "Meross", MerossPlug);
};

class MerossPlug {
  constructor (log, config) {
    /*
     * The constructor function is called when the plugin is registered.
     * log is a function that can be used to log output to the homebridge console
     * config is an object that contains the config for this plugin that was defined the homebridge config.json
     */

    /* assign both log and config to properties on 'this' class so we can use them in other methods */
    this.log = log
    this.config = config

    /*
     * A HomeKit accessory can have many "services". This will create our base service,
     * Service types are defined in this code: https://github.com/KhaosT/HAP-NodeJS/blob/master/lib/gen/HomeKitTypes.js
     * Search for "* Service" to tab through each available service type.
     * Take note of the available "Required" and "Optional" Characteristics for the service you are creating
     */
    this.service = new Service.Switch(this.config.name)
  }

  getServices () {
    /*
     * The getServices function is called by Homebridge and should return an array of Services this accessory is exposing.
     * It is also where we bootstrap the plugin to tell Homebridge which function to use for which action.
     */

    /* Create a new information service. This just tells HomeKit about our accessory. */
    const informationService = new Service.AccessoryInformation()
          .setCharacteristic(Characteristic.Manufacturer, 'meross')
          .setCharacteristic(Characteristic.Model, 'MSS110')
          .setCharacteristic(Characteristic.SerialNumber, 'lol')

    /*
     * For each of the service characteristics we need to register setters and getter functions
     * 'get' is called when HomeKit wants to retrieve the current state of the characteristic
     * 'set' is called when HomeKit wants to update the value of the characteristic
     */
    this.service.getCharacteristic(Characteristic.On)
      .on('get', this.getOnCharacteristicHandler.bind(this))
      .on('set', this.setOnCharacteristicHandler.bind(this))

    /* Return both the main service (this.service) and the informationService */
    return [informationService, this.service]
  }

  async setOnCharacteristicHandler (value, callback) {
    /* this is called when HomeKit wants to update the value of the characteristic as defined in our getServices() function */

    this.log(this.config, `${this.config.deviceUrl}/config`)
    let response;

    try {
      response = await doRequest({
        method: 'POST',
        url: `${this.config.deviceUrl}/config`,
        headers: {
          "Content-Type": "application/json",
          "AppVersion": "1.4.0",
          "Authorization": `${this.config.authToken}`,
          "vendor":"meross"
        },
        json: true,
        strictSSL: false,
        body: {
          "payload": {
            "togglex": {
              "onoff": value ? 1 : 0,
              "channel": this.config.channel
            }
          },
          "header": {
            "messageId": "c3222c7d2b9163fe2968f06c45338a9f",
            "method": "SET",
            "from": `http:\/\/${this.config.deviceUrl}\/config`,
            "namespace": "Appliance.Control.ToggleX",
            "timestamp": 1543987687,
            // TODO probably can recycle the 'sign' from the response of this request
            // in case this gets stale and no longer works. No idea what it does.
            "sign": "9cb8004faf1ea39e94256227c9fb0b19",
            "payloadVersion": 1
          }
        }
      });
    } catch (e) {
      this.log('Failed to POST to the Meross Plug:', e);
    }

    if (response) {
      this.isOn = value
    } else {
      this.isOn = false
    }

    /* Log to the console the value whenever this function is called */
    this.log(`calling setOnCharacteristicHandler`, value)

    /*
     * The callback function should be called to return the value
     * The first argument in the function should be null unless and error occured
     */
    callback(null)
  }

  getOnCharacteristicHandler (callback) {
    /*
     * this is called when HomeKit wants to retrieve the current state of the characteristic as defined in our getServices() function
     * it's called each time you open the Home app or when you open control center
     */

    // TODO: actually fetch the status instead of mutating a variable...
    /* Log to the console the value whenever this function is called */
    this.log(`calling getOnCharacteristicHandler`, this.isOn)

    /*
     * The callback function should be called to return the value
     * The first argument in the function should be null unless and error occured
     * The second argument in the function should be the current value of the characteristic
     * This is just an example so we will return the value from `this.isOn` which is where we stored the value in the set handler
     */
    callback(null, this.isOn)
  }

}
